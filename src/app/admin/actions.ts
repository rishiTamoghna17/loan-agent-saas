"use server";

import { getAdminSupabase, requireAdminUser } from "@/lib/admin-auth";
import { getCampaignBrochureAttachment } from "@/lib/campaign-attachments";
import { buildCampaignLinks, maskProviderError } from "@/lib/campaign-tracking";
import {
  createCampaignRenderContext,
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
    // Add default values for missing columns if migration not applied yet
    return (data || []).map(t => ({
      ...t,
      brochure_attached: t.brochure_attached ?? false,
      pdf_url: t.pdf_url ?? null,
      pdf_urls: t.pdf_urls ?? (t.pdf_url ? [t.pdf_url] : []),
      show_header: t.show_header ?? true
    }));
  } catch (error) {
    console.error("Unexpected error in getCampaignTemplates:", error);
    return [];
  }
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function saveCampaignTemplate(template: { 
  name: string; 
  subject: string; 
  content: string; 
  id?: string; 
  brochure_attached?: boolean; 
  pdf_url?: string | null;
  pdf_urls?: string[] | null;
  show_header?: boolean;
}) {
  await ensureAdmin();
  const supabase = await getAdminSupabase();

  console.log("saveCampaignTemplate called with:", template);

  const isEditing = template.id && uuidRegex.test(template.id);
  
  try {
    const templateData: any = {
      name: template.name,
      subject: template.subject,
      content: template.content,
      brochure_attached: template.brochure_attached ?? false,
      pdf_url: template.pdf_url ?? (template.pdf_urls && template.pdf_urls.length > 0 ? template.pdf_urls[0] : null),
      pdf_urls: template.pdf_urls ?? (template.pdf_url ? [template.pdf_url] : []),
      show_header: template.show_header ?? true
    };

    let data, error;

    if (isEditing) {
      // UPDATE existing custom template
      const { data: existing, error: checkErr } = await supabase
        .from("campaign_templates")
        .select("id")
        .eq("id", template.id)
        .maybeSingle();

      if (checkErr) throw checkErr;
      if (!existing) {
        throw new Error("Template not found");
      }

      const updateResult = await supabase
        .from("campaign_templates")
        .update(templateData)
        .eq("id", template.id)
        .select()
        .single();

      data = updateResult.data;
      error = updateResult.error;
    } else {
      // INSERT new custom template - GENERATE UUID MANUALLY
      const insertData = { 
        ...templateData, 
        id: crypto.randomUUID() 
      };
      const insertResult = await supabase
        .from("campaign_templates")
        .insert([insertData])
        .select()
        .single();

      data = insertResult.data;
      error = insertResult.error;
    }

    if (error) {
      // Try again with just core fields if new columns not applied yet
      if (error.message.includes("brochure_attached") || error.message.includes("pdf_url") || 
          error.message.includes("pdf_urls") || error.message.includes("show_header")) {
        
        const coreTemplate: any = {
          name: template.name,
          subject: template.subject,
          content: template.content
        };

        if (isEditing) {
          const fallbackResult = await supabase
            .from("campaign_templates")
            .update(coreTemplate)
            .eq("id", template.id)
            .select()
            .single();

          if (fallbackResult.error) throw fallbackResult.error;
          return { success: true, data: fallbackResult.data };
        } else {
          coreTemplate.id = crypto.randomUUID();
          const fallbackResult = await supabase
            .from("campaign_templates")
            .insert([coreTemplate])
            .select()
            .single();

          if (fallbackResult.error) throw fallbackResult.error;
          return { success: true, data: fallbackResult.data };
        }
      }

      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error saving template:", error);
    throw error;
  }
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
  disablePagination?: boolean;
  engagement?: 'opened' | 'clicked' | 'replied' | 'any';
  includeEmailHistory?: boolean;
}) {
  await ensureAdmin();
  const supabase = await getAdminSupabase();
  
  const { 
    page = 1, 
    pageSize = 20, 
    status, 
    city, 
    query,
    disablePagination = false,
    engagement
  } = options;

  // First check if deleted_at column exists (gracefully handle missing migration)
  let dbQuery = supabase
    .from("prospects")
    .select("*", { count: "exact" })
    .order("lead_score", { ascending: false });

  try {
    const { error } = await supabase
      .from("prospects")
      .select("deleted_at")
      .limit(1);
    
    if (!error) {
      dbQuery = dbQuery.is("deleted_at", null);
    }
  } catch (err) {
    // Ignore error - column doesn't exist yet
  }

  if (status) dbQuery = dbQuery.eq("status", status);
  if (city) dbQuery = dbQuery.eq("city", city);
  if (query) dbQuery = dbQuery.or(`name.ilike.%${query}%,email.ilike.%${query}%,company_name.ilike.%${query}%`);
  
  // Apply engagement filter
  let engagedProspectIds: string[] | null = null;
  if (engagement) {
    let emailCampaignQuery = supabase
      .from("email_campaigns")
      .select("prospect_id");
    
    if (engagement === 'opened') {
      emailCampaignQuery = emailCampaignQuery.not("opened_at", "is", null);
    } else if (engagement === 'clicked') {
      emailCampaignQuery = emailCampaignQuery.not("clicked_at", "is", null);
    } else if (engagement === 'replied') {
      emailCampaignQuery = emailCampaignQuery.not("replied_at", "is", null);
    } else if (engagement === 'any') {
      emailCampaignQuery = emailCampaignQuery.or("opened_at.not.is.null,clicked_at.not.is.null,replied_at.not.is.null");
    }

    const { data: campaignData, error: campaignError } = await emailCampaignQuery;
    if (campaignError) {
      console.error("Error fetching engaged prospect ids:", campaignError);
      return {
        prospects: [],
        count: 0,
        totalPages: 0,
        currentPage: page,
        pageSize
      };
    }

    engagedProspectIds = [...new Set(campaignData?.map(x => x.prospect_id) || [])];
    
    if (engagedProspectIds.length === 0) {
      // No engaged prospects, return empty array
      return {
        prospects: [],
        count: 0,
        totalPages: 0,
        currentPage: page,
        pageSize
      };
    }

    dbQuery = dbQuery.in("id", engagedProspectIds);
  }

  let data, count, error;
  
  if (disablePagination) {
    ({ data, count, error } = await dbQuery);
  } else {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    ({ data, count, error } = await dbQuery.range(from, to));
  }

  if (error) {
    console.error("Error fetching prospects:", error);
    throw new Error(error.message);
  }

  let prospectsWithHistory = data || [];
  const includeHistory = options.includeEmailHistory ?? true;
  
  if (data && data.length > 0 && includeHistory) {
    const prospectIds = data.map((p: any) => p.id);
    
    // Get all email history for all prospects in single query!
    const { data: allEmailHistory } = await supabase
      .from("email_campaigns")
      .select("prospect_id, template_name, status, created_at")
      .in("prospect_id", prospectIds)
      .order("created_at", { ascending: false });

    // Group email history by prospect_id
    const historyByProspectId: Record<string, any[]> = {};
    if (allEmailHistory) {
      for (const history of allEmailHistory) {
        if (!historyByProspectId[history.prospect_id]) {
          historyByProspectId[history.prospect_id] = [];
        }
        if (historyByProspectId[history.prospect_id].length < 5) {
          historyByProspectId[history.prospect_id].push(history);
        }
      }
    }

    prospectsWithHistory = data.map((p: any) => ({
      ...p,
      emailHistory: historyByProspectId[p.id] || []
    }));
  }

  return {
    prospects: prospectsWithHistory,
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

export async function deleteProspect(id: string) {
  await ensureAdmin();
  const supabase = await getAdminSupabase();
  
  // Soft delete by setting deleted_at timestamp
  const { data: prospect, error: fetchError } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", id)
    .single();
    
  if (fetchError) throw fetchError;
  
  const { error: updateError } = await supabase
    .from("prospects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) throw updateError;
  
  // Log to audit table
  await supabase.from("audit_logs").insert({
    action: "delete",
    table_name: "prospects",
    record_id: id,
    old_data: prospect
  });

  revalidatePath("/admin/prospects");
  return { success: true };
}

export async function sendCampaignEmail(prospectIds: string[], campaignTemplate: string, showHeader?: boolean) {
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

  // Fetch template from database
  const { data: customTemplate } = await adminSupabase
    .from("campaign_templates")
    .select("id, name, subject, content, brochure_attached, pdf_url, pdf_urls, show_header")
    .eq("id", campaignTemplate)
    .maybeSingle();
  
  if (!customTemplate) {
    return { success: false, error: "Template not found" };
  }

  const template = {
    id: customTemplate.id,
    name: customTemplate.name,
    subject: customTemplate.subject,
    content: customTemplate.content,
    brochure_attached: customTemplate.brochure_attached,
    pdf_url: customTemplate.pdf_url,
    pdf_urls: customTemplate.pdf_urls,
    show_header: customTemplate.show_header ?? true
  };
  const templateName = customTemplate.name;
  const brochureAttached = customTemplate.brochure_attached || false;
  const templatePdfUrls = customTemplate.pdf_urls || (customTemplate.pdf_url ? [customTemplate.pdf_url] : []);

  let brochure = { attachments: [] as any[], metadata: { enabled: false, attached: false } };
  if (brochureAttached) {
    brochure = await getCampaignBrochureAttachment(templatePdfUrls);
  }

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
    const rendered = renderCampaignTemplate({
      ...template,
      show_header: showHeader !== undefined ? showHeader : template.show_header ?? true
    }, renderContext);

    const { data: campaignRow, error: createCampaignError } = await adminSupabase
      .from("email_campaigns")
      .insert({
        prospect_id: prospect.id,
        campaign_name: campaignTemplate,
        template_id: campaignTemplate,
        template_name: templateName,
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

export async function getProspect(id: string) {
  await ensureAdmin();
  const supabase = await getAdminSupabase();
  
  const { data, error } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", id)
    .single();
    
  if (error) throw error;
  return data;
}

export async function getProspectEmailHistory(prospectId: string) {
  await ensureAdmin();
  const supabase = await getAdminSupabase();
  
  const { data, error } = await supabase
    .from("email_campaigns")
    .select("*")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false });
    
  if (error) throw error;
  return data || [];
}
