import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyCampaignAccess } from "@/lib/campaigns-middleware";
import { 
  createCampaignRenderContext, 
  renderWhatsAppCampaignTemplate 
} from "@/lib/campaign-templates";
import { normalizePhoneForWhatsApp } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";

// Input validation schema using Zod
const scheduleCampaignSchema = z.object({
  leadIds: z.array(z.string().uuid()).min(1, "At least one lead ID is required."),
  templateId: z.string().min(1, "WhatsApp template ID is required."),
  scheduledAt: z.string().refine((val) => {
    const d = new Date(val);
    return !isNaN(d.getTime()) && d.getTime() > Date.now();
  }, {
    message: "Scheduled time must be a valid future date."
  })
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
    const parsed = scheduleCampaignSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || "Invalid payload parameters." },
        { status: 400 }
      );
    }

    const { leadIds, templateId, scheduledAt } = parsed.data;

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

    // 4. Fetch WhatsApp template
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

    const senderNumberEnv = process.env.CAMPAIGN_SENDER_PHONE || "7001586476";
    const senderNumber = normalizePhoneForWhatsApp(agent.whatsapp_number || senderNumberEnv);
    const baseHost = (process.env.CAMPAIGN_BASE_URL || process.env.NEXT_PUBLIC_APP_HOST || "https://leadhub-loan-crm.vercel.app").replace(/\/$/, "");
    
    let scheduledCount = 0;
    const adminSupabase = createAdminClient();

    for (const lead of leads) {
      const recipientPhone = lead.phone ? normalizePhoneForWhatsApp(lead.phone) : "";
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

      // Pre-insert campaign row in 'scheduled' status
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
          status: "scheduled",
          sent_at: scheduledAt
        });

      // Insert into local persistent queue cascading_jobs
      await adminSupabase
        .from("cascading_jobs")
        .insert({
          agent_id: agent.id,
          lead_id: lead.id,
          whatsapp_payload: {
            campaignId,
            senderNumber,
            recipientNumber: recipientPhone,
            text: renderedWhatsApp.content,
            campaign_name: customTemplate.name,
            template_id: customTemplate.id,
            template_name: customTemplate.name,
            lead_id: lead.id
          },
          scheduled_for: scheduledAt,
          status: "pending"
        });

      scheduledCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully scheduled ${scheduledCount} WhatsApp campaign message(s).`,
      scheduledCount
    });

  } catch (error: any) {
    console.error("Error scheduling WhatsApp campaign:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred during scheduling." },
      { status: 500 }
    );
  }
}
