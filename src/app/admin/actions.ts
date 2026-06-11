"use server";

import { getAdminSupabase, requireAdminUser } from "@/lib/admin-auth";
import { getCampaignBrochureAttachment } from "@/lib/campaign-attachments";
import { buildCampaignLinks, maskProviderError } from "@/lib/campaign-tracking";
import { classifyBrevoError, getBrevoApiHealth } from "@/lib/brevo";
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
  engagement?: 'sent' | 'delivered' | 'opened' | 'clicked' | 'replied' | 'failed' | 'any';
  includeEmailHistory?: boolean;
  sortBy?: 'created_at' | 'name' | 'lead_score' | 'status' | 'city';
  sortDirection?: 'asc' | 'desc';
  view?: "active" | "archived" | "deleted";
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
    engagement,
    sortBy = "lead_score",
    sortDirection = "desc",
    view = "active"
  } = options;

  const allowedPageSizes = [10, 20, 25, 50, 100];
  const effectivePageSize = allowedPageSizes.includes(pageSize) ? pageSize : 20;
  const effectivePage = Math.max(1, page);

  let dbQuery = supabase
    .from("prospects")
    .select("*", { count: "exact" });

  if (view === "archived") dbQuery = dbQuery.not("archived_at", "is", null).is("deleted_at", null);
  else if (view === "deleted") dbQuery = dbQuery.not("deleted_at", "is", null);
  else dbQuery = dbQuery.is("archived_at", null).is("deleted_at", null);

  if (status) dbQuery = dbQuery.eq("status", status);
  if (city) dbQuery = dbQuery.eq("city", city);
  if (query) dbQuery = dbQuery.or(`name.ilike.%${query}%,email.ilike.%${query}%,company_name.ilike.%${query}%`);
  
  // Apply engagement filter
  let engagedProspectIds: string[] | null = null;
  if (engagement) {
    let emailCampaignQuery = supabase
      .from("email_campaigns")
      .select("prospect_id");
    
    if (engagement === 'sent') {
      emailCampaignQuery = emailCampaignQuery.not("email_sent_at", "is", null);
    } else if (engagement === 'delivered') {
      emailCampaignQuery = emailCampaignQuery.not("delivered_at", "is", null);
    } else if (engagement === 'opened') {
      emailCampaignQuery = emailCampaignQuery.not("opened_at", "is", null);
    } else if (engagement === 'clicked') {
      emailCampaignQuery = emailCampaignQuery.not("clicked_at", "is", null);
    } else if (engagement === 'replied') {
      emailCampaignQuery = emailCampaignQuery.not("replied_at", "is", null);
    } else if (engagement === 'failed') {
      emailCampaignQuery = emailCampaignQuery.in("status", ["failed", "bounced", "blocked", "spam"]);
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
        currentPage: effectivePage,
        pageSize: effectivePageSize
      };
    }

    engagedProspectIds = [...new Set(campaignData?.map(x => x.prospect_id) || [])];
    
    if (engagedProspectIds.length === 0) {
      // No engaged prospects, return empty array
      return {
        prospects: [],
        count: 0,
        totalPages: 0,
        currentPage: effectivePage,
        pageSize: effectivePageSize
      };
    }

    dbQuery = dbQuery.in("id", engagedProspectIds);
  }

  dbQuery = dbQuery.order(sortBy, { ascending: sortDirection === "asc" });

  let data, count, error;
  
  if (disablePagination) {
    ({ data, count, error } = await dbQuery);
  } else {
    const from = (effectivePage - 1) * effectivePageSize;
    const to = from + effectivePageSize - 1;
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
    totalPages: count ? Math.ceil(count / effectivePageSize) : 0,
    currentPage: effectivePage,
    pageSize: effectivePageSize
  };
}

export async function updateProspectStatus(id: string, status: string) {
  const user = await requireAdminUser();
  const supabase = await getAdminSupabase();
  const { data: oldData } = await supabase.from("prospects").select("*").eq("id", id).single();
  const { error } = await supabase
    .from("prospects")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "update_status",
    table_name: "prospects",
    record_id: id,
    old_data: oldData,
    new_data: { status }
  });
  revalidatePath("/admin/prospects");
}

const prospectStatuses = new Set([
  "new", "contacted", "opened", "clicked", "replied", "demo_requested",
  "trial_started", "converted", "lost"
]);

export async function updateProspect(id: string, values: Record<string, FormDataEntryValue | null>) {
  const user = await requireAdminUser();
  const supabase = await getAdminSupabase();
  const allowed = ["name", "company_name", "email", "phone", "city", "state", "loan_category", "linkedin_url", "website_url", "notes"];
  const update: Record<string, string | null | number> = {};
  for (const key of allowed) {
    const value = values[key];
    update[key] = typeof value === "string" && value.trim() ? value.trim() : null;
  }
  const status = String(values.status ?? "");
  if (prospectStatuses.has(status)) update.status = status;
  const score = Number(values.lead_score);
  if (Number.isFinite(score) && score >= 0) update.lead_score = Math.floor(score);

  const { data: oldData, error: oldError } = await supabase.from("prospects").select("*").eq("id", id).single();
  if (oldError) throw oldError;
  const { data, error } = await supabase.from("prospects").update(update).eq("id", id).select("*").single();
  if (error) return { success: false, error: error.message };
  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action: "edit",
    table_name: "prospects",
    record_id: id,
    old_data: oldData,
    new_data: update
  });
  revalidatePath("/admin/prospects");
  revalidatePath(`/admin/prospects/${id}`);
  return { success: true, data };
}

export async function bulkProspectAction(input: {
  ids: string[];
  action: "status" | "archive" | "delete" | "restore_archive" | "restore_delete";
  status?: string;
}) {
  const user = await requireAdminUser();
  const supabase = await getAdminSupabase();
  const ids = [...new Set(input.ids)].filter((id) => uuidRegex.test(id)).slice(0, 500);
  if (!ids.length) return { success: false, error: "Select at least one prospect." };

  const update: Record<string, string | null> = {};
  if (input.action === "status") {
    if (!input.status || !prospectStatuses.has(input.status)) return { success: false, error: "Choose a valid status." };
    update.status = input.status;
  } else if (input.action === "archive") {
    update.archived_at = new Date().toISOString();
    update.archived_by = user.id;
  } else if (input.action === "delete") {
    update.deleted_at = new Date().toISOString();
    update.deleted_by = user.id;
  } else if (input.action === "restore_archive") {
    update.archived_at = null;
    update.archived_by = null;
  } else {
    update.deleted_at = null;
    update.deleted_by = null;
  }

  const { data: oldRows, error: oldError } = await supabase.from("prospects").select("*").in("id", ids);
  if (oldError) return { success: false, error: oldError.message };
  const { data, error } = await supabase.from("prospects").update(update).in("id", ids).select("id");
  if (error) return { success: false, error: error.message };
  await supabase.from("audit_logs").insert((oldRows ?? []).map((row) => ({
    user_id: user.id,
    action: `bulk_${input.action}`,
    table_name: "prospects",
    record_id: row.id,
    old_data: row,
    new_data: update
  })));
  revalidatePath("/admin/prospects");
  revalidatePath("/admin");
  return { success: true, count: data?.length ?? 0 };
}

export async function deleteProspect(id: string) {
  const user = await requireAdminUser();
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
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq("id", id);

  if (updateError) throw updateError;
  
  // Log to audit table
  await supabase.from("audit_logs").insert({
    user_id: user.id,
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

  const brevoHealth = await getBrevoApiHealth();
  if (!brevoHealth.ok) {
    return {
      success: false,
      error: brevoHealth.message,
      errorKind: brevoHealth.kind,
      count: 0,
      failedCount: 0
    };
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
        const classifiedError = classifyBrevoError(response.status, errorData);
        console.error(`Brevo API error for ${prospect.email}:`, errorData);
        await adminSupabase
          .from("email_campaigns")
          .update({
            status: "failed",
            provider_error: maskProviderError({
              ...errorData,
              status: response.status,
              error: classifiedError.kind
            })
          })
          .eq("id", campaignRow.id);
        failedCount++;

        if (classifiedError.kind === "unauthorized_ip" || classifiedError.kind === "invalid_key") {
          return {
            success: false,
            error: classifiedError.message,
            errorKind: classifiedError.kind,
            count: successCount,
            failedCount
          };
        }
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

export async function getProspectEmailHistory(prospectId: string, filters: {
  status?: string;
  template?: string;
  from?: string;
  to?: string;
} = {}) {
  await ensureAdmin();
  const supabase = await getAdminSupabase();
  
  let query = supabase
    .from("email_campaigns")
    .select("*")
    .eq("prospect_id", prospectId);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.template) query = query.eq("template_name", filters.template);
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00`);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59`);
  const { data, error } = await query.order("created_at", { ascending: false });
    
  if (error) throw error;
  return data || [];
}
