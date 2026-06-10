"use server";

import { getAdminSupabase, requireAdminUser } from "@/lib/admin-auth";
import { getCampaignBrochureAttachment } from "@/lib/campaign-attachments";
import { buildCampaignLinks, maskProviderError } from "@/lib/campaign-tracking";
import {
  createCampaignRenderContext,
  getBuiltInCampaignTemplate,
  renderCampaignTemplate
} from "@/lib/campaign-templates";
import { revalidatePath } from "next/cache";

async function ensureAdmin() {
  await requireAdminUser();
}

export async function importProspects(prospects: any[]) {
  await ensureAdmin();
  const supabase = await getAdminSupabase();

  // Filter out invalid prospects (e.g. missing email)
  const validProspects = prospects.filter(p => p.email && p.email.includes("@"));

  if (validProspects.length === 0) {
    return { success: false, error: "No valid prospects found in CSV" };
  }

  const { data, error } = await supabase
    .from("prospects")
    .upsert(validProspects, { onConflict: "email" })
    .select();

  if (error) {
    console.error("Import error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/prospects");
  revalidatePath("/admin");
  
  return { success: true, count: data?.length || 0 };
}

export async function addProspect(prospect: any) {
  await ensureAdmin();
  const supabase = await getAdminSupabase();

  const { data, error } = await supabase
    .from("prospects")
    .insert([{
      ...prospect,
      status: prospect.status || "new",
      lead_score: prospect.lead_score || 0
    }])
    .select()
    .single();

  if (error) {
    console.error("Add prospect error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/admin/prospects");
  return { success: true, data };
}

export async function getCampaignTemplates() {
  try {
    await ensureAdmin();
    const supabase = await getAdminSupabase();
    const { data, error } = await supabase
      .from("campaign_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      // Log but don't throw to prevent 500 on page load if schema cache is stale
      console.error("Error fetching campaign templates:", error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error("Unexpected error in getCampaignTemplates:", error);
    return [];
  }
}

export async function saveCampaignTemplate(template: { name: string; subject: string; content: string; id?: string }) {
  await ensureAdmin();
  const supabase = await getAdminSupabase();

  const { data, error } = await supabase
    .from("campaign_templates")
    .upsert([template])
    .select()
    .single();

  if (error) throw error;
  return { success: true, data };
}

export async function deleteCampaignTemplate(id: string) {
  await ensureAdmin();
  const supabase = await getAdminSupabase();
  const { error } = await supabase
    .from("campaign_templates")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return { success: true };
}

export async function getProspects(options: {
  page?: number;
  pageSize?: number;
  status?: string;
  city?: string;
  query?: string;
}) {
  await ensureAdmin();
  const supabase = await getAdminSupabase();
  
  const { 
    page = 1, 
    pageSize = 20, 
    status, 
    city, 
    query 
  } = options;

  let dbQuery = supabase
    .from("prospects")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (status) dbQuery = dbQuery.eq("status", status);
  if (city) dbQuery = dbQuery.eq("city", city);
  if (query) dbQuery = dbQuery.or(`name.ilike.%${query}%,email.ilike.%${query}%,company_name.ilike.%${query}%`);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count, error } = await dbQuery.range(from, to);

  if (error) {
    console.error("Error fetching prospects:", error);
    throw new Error(error.message);
  }

  return {
    prospects: data || [],
    count: count || 0,
    totalPages: count ? Math.ceil(count / pageSize) : 0,
    currentPage: page,
    pageSize
  };
}

export async function updateProspectStatus(id: string, status: string) {
  await ensureAdmin();
  const supabase = await getAdminSupabase();
  const { error } = await supabase
    .from("prospects")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/admin/prospects");
}

export async function sendCampaignEmail(prospectIds: string[], campaignTemplate: string) {
  await ensureAdmin();
  const adminSupabase = await getAdminSupabase();
  
  // Brevo API Key
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SMTP_SENDER_EMAIL || "hello@leadhub.in";
  const senderName = process.env.BREVO_SMTP_SENDER_NAME || "LeadHub";
  const senderPhone = process.env.CAMPAIGN_SENDER_PHONE || "7001586476";
  const senderContactEmail = process.env.CAMPAIGN_SENDER_CONTACT_EMAIL || "tamoghna171099@gmail.com";

  if (!apiKey) {
    console.error("Missing BREVO_API_KEY");
    return { success: false, error: "Brevo API Key not configured" };
  }

  const { data: prospects, error: fetchError } = await adminSupabase
    .from("prospects")
    .select("id, email, name, company_name, city, loan_category")
    .in("id", prospectIds);

  if (fetchError) {
    console.error("Error fetching prospects for campaign:", fetchError);
    return { success: false, error: fetchError.message };
  }

  if (!prospects || prospects.length === 0) {
    console.warn("No prospects found for IDs:", prospectIds);
    return { success: false, error: "No prospects found" };
  }

  let template = getBuiltInCampaignTemplate(campaignTemplate);
  let templateName = template?.name || campaignTemplate;

  // If not a hardcoded template, try fetching from database
  if (!template) {
    const { data: customTemplate } = await adminSupabase
      .from("campaign_templates")
      .select("id, name, subject, content")
      .eq("id", campaignTemplate)
      .maybeSingle();
    
    if (customTemplate) {
      template = {
        id: customTemplate.id,
        name: customTemplate.name,
        subject: customTemplate.subject,
        content: customTemplate.content,
        description: "Custom admin template"
      };
      templateName = customTemplate.name;
    }
  }

  if (!template) {
    template = getBuiltInCampaignTemplate("intro")!;
    templateName = template.name;
  }

  const brochure = await getCampaignBrochureAttachment();

  let successCount = 0;
  let failedCount = 0;

  for (const prospect of prospects) {
    const { demoUrl, signupUrl } = buildCampaignLinks(prospect.id);
    const renderContext = createCampaignRenderContext({
      prospect,
      demoUrl,
      signupUrl,
      senderName,
      senderPhone,
      senderEmail: senderContactEmail
    });
    const rendered = renderCampaignTemplate(template, renderContext);

    const { data: campaignRow, error: createCampaignError } = await adminSupabase
      .from("email_campaigns")
      .insert({
        prospect_id: prospect.id,
        campaign_name: campaignTemplate,
        status: "sending",
        provider: "brevo",
        provider_response: {
          to: prospect.email,
          template_id: campaignTemplate,
          template_name: templateName,
          subject: rendered.subject,
          attachment: brochure.metadata
        }
      })
      .select("id")
      .single();

    if (createCampaignError || !campaignRow) {
      console.error(`Error creating campaign attempt for ${prospect.email}:`, createCampaignError);
      failedCount++;
      continue;
    }

    try {
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": apiKey,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: prospect.email, name: prospect.name }],
          subject: rendered.subject,
          htmlContent: rendered.htmlContent,
          ...(brochure.attachments.length ? { attachment: brochure.attachments } : {}),
          tags: ["campaign", campaignTemplate],
          headers: {
            "X-Mailin-Tag": campaignTemplate
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const messageId = result.messageId;

        const { error: campaignError } = await adminSupabase.from("email_campaigns").update({
          email_sent_at: new Date().toISOString(),
          message_id: messageId,
          provider_response: {
            ...result,
            template_id: campaignTemplate,
            template_name: templateName,
            subject: rendered.subject,
            attachment: brochure.metadata
          },
          status: "sent"
        }).eq("id", campaignRow.id);

        if (campaignError) {
          console.error(`Error logging campaign for ${prospect.email}:`, campaignError);
          failedCount++;
          continue;
        }

        // Update prospect status (using admin client to bypass RLS if needed)
        const { error: prospectError } = await adminSupabase
          .from("prospects")
          .update({ status: "contacted" })
          .eq("id", prospect.id);
        
        if (prospectError) {
          console.error(`Error updating prospect status for ${prospect.email}:`, prospectError);
        }

        successCount++;
      } else {
        const errorData = await response.json().catch(() => ({ status: response.status, message: response.statusText }));
        console.error(`Brevo API error for ${prospect.email}:`, errorData);
        await adminSupabase
          .from("email_campaigns")
          .update({
            status: "failed",
            provider_error: maskProviderError({ ...errorData, status: response.status })
          })
          .eq("id", campaignRow.id);
        failedCount++;
      }
    } catch (error) {
      console.error(`Failed to send email to ${prospect.email}:`, error);
      await adminSupabase
        .from("email_campaigns")
        .update({
          status: "failed",
          provider_error: maskProviderError(error instanceof Error ? { message: error.message } : error)
        })
        .eq("id", campaignRow.id);
      failedCount++;
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/campaigns");
  revalidatePath("/admin/analytics");
  
  if (successCount === 0 && prospects.length > 0) {
    return { 
      success: false, 
      error: "Failed to send any emails. Check server logs for Brevo API errors.",
      count: 0,
      failedCount
    };
  }

  return { success: true, count: successCount, failedCount };
}
