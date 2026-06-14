import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyCampaignAccess } from "@/lib/campaigns-middleware";
import { sendBrevoWhatsApp, sendBrevoEmail } from "@/lib/brevo";
import { 
  createCampaignRenderContext, 
  renderWhatsAppCampaignTemplate, 
  renderCampaignTemplate 
} from "@/lib/campaign-templates";
import { normalizePhoneForWhatsApp } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";

// Input validation schema using Zod
const sendCampaignSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1, "At least one lead ID is required."),
  templateId: z.string().min(1, "WhatsApp template ID is required."),
  cascading: z.boolean().optional().default(false),
  emailTemplateId: z.string().optional()
});

export async function POST(request: Request) {
  try {
    // 1. Verify user's plan state using middleware
    const accessResult = await verifyCampaignAccess(request);
    if (!accessResult.allowed) {
      return accessResult.response;
    }

    const { agent, supabase } = accessResult;

    // 2. Parse and validate payload
    const body = await request.json().catch(() => ({}));
    const parsed = sendCampaignSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid payload parameters." },
        { status: 400 }
      );
    }

    const { leadIds, templateId, cascading, emailTemplateId } = parsed.data;

    if (cascading && !emailTemplateId) {
      return NextResponse.json(
        { error: "Email template ID is required when cascading automation is enabled." },
        { status: 400 }
      );
    }

    // 3. Fetch selected leads
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("*")
      .in("id", leadIds)
      .eq("agent_id", agent.id);

    if (leadsError || !leads || leads.length === 0) {
      return NextResponse.json(
        { error: "Selected leads could not be found." },
        { status: 404 }
      );
    }

    // 4. Fetch templates
    const { data: customTemplate, error: templateError } = await supabase
      .from("campaign_templates")
      .select("*")
      .eq("id", templateId)
      .or(`agent_id.eq.${agent.id},agent_id.is.null`)
      .maybeSingle();

    if (templateError || !customTemplate) {
      return NextResponse.json(
        { error: "WhatsApp campaign template not found." },
        { status: 404 }
      );
    }

    let emailTemplate: any = null;
    if (cascading && emailTemplateId) {
      const { data: eTemp, error: eTempError } = await supabase
        .from("campaign_templates")
        .select("*")
        .eq("id", emailTemplateId)
        .or(`agent_id.eq.${agent.id},agent_id.is.null`)
        .maybeSingle();

      if (eTempError || !eTemp) {
        return NextResponse.json(
          { error: "Cascading Email campaign template not found." },
          { status: 404 }
        );
      }
      emailTemplate = eTemp;
    }

    const senderNumberEnv = process.env.CAMPAIGN_SENDER_PHONE || "7001586476";
    const senderNumber = normalizePhoneForWhatsApp(agent.whatsapp_number || senderNumberEnv);
    const senderEmail = process.env.BREVO_SMTP_SENDER_EMAIL || agent.email || "";
    const senderName = process.env.BREVO_SMTP_SENDER_NAME || agent.business_name || agent.name || "LeadHub Agent";

    const baseHost = (process.env.CAMPAIGN_BASE_URL || process.env.NEXT_PUBLIC_APP_HOST || "https://leadhub-loan-crm.vercel.app").replace(/\/$/, "");
    
    let processedCount = 0;
    const adminSupabase = createAdminClient();

    for (const lead of leads) {
      const recipientPhone = lead.phone ? normalizePhoneForWhatsApp(lead.phone) : "";
      const recipientEmail = lead.email?.trim() || "";

      if (cascading) {
        // Model B: Send email first, then schedule failover WhatsApp 24 hours later if unopened
        if (!recipientEmail) continue;

        const emailCampaignId = crypto.randomUUID();
        const demoUrl = `${baseHost}/demo?prospect_id=${encodeURIComponent(lead.id)}`;
        const signupUrl = `${baseHost}/signup`;

        const renderContext = createCampaignRenderContext({
          prospect: {
            id: lead.id,
            name: lead.name,
            company_name: lead.loan_type ? `${lead.loan_type} Inquiry` : "your loan inquiry",
            city: lead.city,
            loan_category: lead.loan_type
          },
          demoUrl,
          signupUrl,
          senderName: agent.business_name || agent.agent_name || "LeadHub Agent",
          senderPhone: agent.phone || "",
          senderEmail: agent.email || ""
        });

        const renderedEmail = renderCampaignTemplate(emailTemplate, renderContext);

        // Send Email via Brevo
        try {
          const emailResponse = await sendBrevoEmail({
            sender: { name: senderName, email: senderEmail },
            to: [{ email: recipientEmail, name: lead.name }],
            subject: renderedEmail.subject,
            htmlContent: renderedEmail.htmlContent,
            tags: ["leadhub", `campaign_${emailCampaignId}`, `template_${emailTemplate.id}`],
            headers: { "X-LeadHub-Campaign-ID": emailCampaignId }
          });

          // Insert email campaign record
          await supabase
            .from("email_campaigns")
            .insert({
              id: emailCampaignId,
              agent_id: agent.id,
              lead_id: lead.id,
              campaign_name: emailTemplate.name,
              status: "sent",
              email_sent_at: new Date().toISOString(),
              message_id: emailResponse.messageId || "",
              provider: "brevo",
              provider_response: {
                to: recipientEmail,
                subject: renderedEmail.subject,
                template_id: emailTemplate.id,
                template_name: emailTemplate.name
              }
            });

          // Render WhatsApp payload for the background job
          const renderedWhatsApp = renderWhatsAppCampaignTemplate({
            content: customTemplate.content
          }, renderContext);

          // Save background cascading job scheduled for 24 hours in future
          const scheduledFor = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
          
          await adminSupabase
            .from("cascading_jobs")
            .insert({
              agent_id: agent.id,
              lead_id: lead.id,
              email_campaign_id: emailCampaignId,
              whatsapp_payload: {
                senderNumber,
                recipientNumber: recipientPhone,
                text: renderedWhatsApp.content,
                campaign_name: customTemplate.name,
                template_id: customTemplate.id,
                template_name: customTemplate.name,
                lead_id: lead.id
              },
              scheduled_for: scheduledFor,
              status: "pending"
            });

          processedCount++;
        } catch (err) {
          console.error(`Cascading email send failed for lead ${lead.id}:`, err);
        }
      } else {
        // Direct Flow: Send WhatsApp instantly
        if (!recipientPhone) continue;

        const campaignId = crypto.randomUUID();
        const demoUrl = `${baseHost}/agent/${agent.slug || ""}?wacid=${campaignId}`;

        const renderContext = createCampaignRenderContext({
          prospect: {
            id: lead.id,
            name: lead.name,
            company_name: lead.loan_type ? `${lead.loan_type} Inquiry` : "your loan inquiry",
            city: lead.city,
            loan_category: lead.loan_type
          },
          demoUrl,
          signupUrl: demoUrl,
          senderName: agent.business_name || agent.agent_name || "LeadHub Agent",
          senderPhone: agent.phone || "",
          senderEmail: agent.email || ""
        });

        const renderedWhatsApp = renderWhatsAppCampaignTemplate({
          content: customTemplate.content
        }, renderContext);

        // Pre-insert campaign row in 'sending' status
        await supabase
          .from("whatsapp_campaigns")
          .insert({
            id: campaignId,
            agent_id: agent.id,
            lead_id: lead.id,
            campaign_name: customTemplate.name,
            template_id: customTemplate.id,
            template_name: customTemplate.name,
            message_content: renderedWhatsApp.content,
            status: "sending"
          });

        try {
          const waResponse = await sendBrevoWhatsApp({
            senderNumber,
            contactNumbers: [recipientPhone],
            text: renderedWhatsApp.content
          });

          const messageId = waResponse.messageId || (waResponse.messageIds && waResponse.messageIds[0]) || "";

          // Update to sent with message_id
          await supabase
            .from("whatsapp_campaigns")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              message_id: messageId,
              event_history: [{ event_type: "sent", status: "sent", occurred_at: new Date().toISOString() }]
            })
            .eq("id", campaignId);

          processedCount++;
        } catch (err: any) {
          console.error(`WhatsApp send failed for lead ${lead.id}:`, err);
          
          await supabase
            .from("whatsapp_campaigns")
            .update({
              status: "failed",
              provider_error: { message: err.message || "Brevo WhatsApp Delivery Failed" }
            })
            .eq("id", campaignId);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${processedCount} campaign dispatch(es).`,
      processedCount
    });

  } catch (error: any) {
    console.error("Error dispatching campaign:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred during dispatch." },
      { status: 500 }
    );
  }
}
