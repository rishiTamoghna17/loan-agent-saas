"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { uploadAgentLogoWithClient } from "@/lib/logo-upload";
import { deleteLeadSchema, followUpSchema, followUpStatusSchema, leadNoteSchema, leadSchema, leadStatusSchema, notificationPreferencesSchema, profileSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";
import { zonedDateTimeToUtc } from "@/lib/follow-ups";

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireAgent() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: agent, error } = await supabase.from("agents").select("*").eq("user_id", user.id).single();
  if (error || !agent) redirect("/signup");

  return { supabase, agent };
}

function isDashboardLocked(agent: { plan_status?: string | null; trial_ends_at?: string | null }) {
  if (agent.plan_status === "active") return false;
  if (agent.plan_status === "expired" || agent.plan_status === "cancelled") return true;
  return agent.plan_status === "trial" && agent.trial_ends_at ? new Date(agent.trial_ends_at).getTime() <= Date.now() : false;
}

export type LeadMutationResult = {
  ok: boolean;
  message: string;
  imported?: number;
  folderName?: string;
  rejected?: Array<{ row: number; reason: string }>;
};

function leadInsertValues(agentId: string, values: ReturnType<typeof leadSchema.parse>) {
  return {
    agent_id: agentId,
    name: values.name,
    phone: values.phone,
    email: values.email || null,
    loan_type: values.loan_type,
    required_amount: Number(values.required_amount),
    monthly_income: values.monthly_income === "" || values.monthly_income == null ? null : Number(values.monthly_income),
    city: values.city,
    district: values.district,
    state: values.state,
    pincode: values.pincode,
    landmark: values.landmark || null,
    source: values.source,
    message: values.message || null
  };
}

export async function createManualLead(input: unknown): Promise<LeadMutationResult> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.errors[0]?.message || "Check the lead details." };
  const { supabase, agent } = await requireAgent();
  if (isDashboardLocked(agent)) return { ok: false, message: "Your account is read-only because the trial has ended." };
  const { error } = await supabase.from("leads").insert(leadInsertValues(agent.id, parsed.data));
  if (error) return { ok: false, message: error.message };
  revalidatePath("/dashboard");
  return { ok: true, message: "Lead added successfully." };
}

export async function importLeads(input: unknown, folderName?: string): Promise<LeadMutationResult> {
  if (!Array.isArray(input) || !input.length) return { ok: false, message: "Choose a file containing at least one lead." };
  if (input.length > 1000) return { ok: false, message: "Import a maximum of 1,000 leads at a time." };
  const { supabase, agent } = await requireAgent();
  if (isDashboardLocked(agent)) return { ok: false, message: "Your account is read-only because the trial has ended." };
  const valid: ReturnType<typeof leadInsertValues>[] = [];
  const rejected: Array<{ row: number; reason: string }> = [];
  input.forEach((row, index) => {
    const parsed = leadSchema.safeParse(row);
    if (parsed.success) valid.push(leadInsertValues(agent.id, parsed.data));
    else rejected.push({ row: index + 2, reason: parsed.error.errors[0]?.message || "Invalid lead" });
  });
  if (!valid.length) return { ok: false, message: "No valid leads were found.", rejected };
  let targetFolderId: string | null = null;
  let targetFolderName = "";
  const trimmedFolderName = folderName?.trim().slice(0, 100);
  if (trimmedFolderName) {
    const { data: existingFolder } = await supabase
      .from("lead_folders")
      .select("id,name")
      .eq("agent_id", agent.id)
      .eq("name", trimmedFolderName)
      .maybeSingle();
    if (existingFolder) {
      targetFolderId = existingFolder.id;
      targetFolderName = existingFolder.name;
    } else {
      const { data: createdFolder, error: folderError } = await supabase
        .from("lead_folders")
        .insert({ agent_id: agent.id, name: trimmedFolderName })
        .select("id,name")
        .single();
      if (folderError || !createdFolder) return { ok: false, message: folderError?.message || "Could not create the import folder.", rejected };
      targetFolderId = createdFolder.id;
      targetFolderName = createdFolder.name;
    }
  }
  const inserts = targetFolderId ? valid.map((lead) => ({ ...lead, folder_id: targetFolderId })) : valid;
  const { error } = await supabase.from("leads").insert(inserts);
  if (error) return { ok: false, message: error.message, rejected };
  revalidatePath("/dashboard");
  return {
    ok: true,
    message: `${valid.length} lead${valid.length === 1 ? "" : "s"} imported${targetFolderName ? ` into ${targetFolderName}` : ""} successfully.`,
    imported: valid.length,
    folderName: targetFolderName || undefined,
    rejected
  };
}

export async function updateLeadStatus(formData: FormData) {
  const parsed = leadStatusSchema.safeParse({
    lead_id: formData.get("lead_id"),
    status: formData.get("status")
  });
  if (!parsed.success) return;

  const { supabase, agent } = await requireAgent();
  if (isDashboardLocked(agent)) return;
  await supabase.from("leads").update({ status: parsed.data.status }).eq("id", parsed.data.lead_id).eq("agent_id", agent.id);
  revalidatePath("/dashboard");
}

export async function addLeadNote(formData: FormData) {
  const parsed = leadNoteSchema.safeParse({
    lead_id: formData.get("lead_id"),
    agent_id: formData.get("agent_id"),
    note: formData.get("note")
  });
  if (!parsed.success) return;

  const { supabase, agent } = await requireAgent();
  if (isDashboardLocked(agent)) return;
  if (parsed.data.agent_id !== agent.id) return;

  await supabase.from("lead_notes").insert(parsed.data);
  revalidatePath("/dashboard");
}

export async function deleteLead(formData: FormData) {
  const parsed = deleteLeadSchema.safeParse({
    lead_id: formData.get("lead_id")
  });
  if (!parsed.success) return;

  const { supabase, agent } = await requireAgent();
  if (isDashboardLocked(agent)) return;
  await supabase.from("leads").update({ deleted_at: new Date().toISOString(), archived_at: null }).eq("id", parsed.data.lead_id).eq("agent_id", agent.id);
  revalidatePath("/dashboard");
}

export async function archiveLead(formData: FormData) {
  const parsed = deleteLeadSchema.safeParse({ lead_id: formData.get("lead_id") });
  if (!parsed.success) return;
  const { supabase, agent } = await requireAgent();
  if (isDashboardLocked(agent)) return;
  await supabase.from("leads").update({ archived_at: new Date().toISOString(), deleted_at: null }).eq("id", parsed.data.lead_id).eq("agent_id", agent.id);
  revalidatePath("/dashboard");
}

export async function restoreLead(formData: FormData) {
  const parsed = deleteLeadSchema.safeParse({ lead_id: formData.get("lead_id") });
  if (!parsed.success) return;
  const { supabase, agent } = await requireAgent();
  if (isDashboardLocked(agent)) return;
  await supabase.from("leads").update({ archived_at: null, deleted_at: null }).eq("id", parsed.data.lead_id).eq("agent_id", agent.id);
  revalidatePath("/dashboard");
}

export async function saveFollowUp(formData: FormData) {
  const dueAt = String(formData.get("due_at") || "");
  const timezone = String(formData.get("timezone") || "Asia/Kolkata");
  const parsed = followUpSchema.safeParse({
    id: formData.get("id") || undefined,
    lead_id: formData.get("lead_id"),
    due_at: dueAt ? zonedDateTimeToUtc(dueAt, timezone) : "",
    note: formData.get("note")
  });
  if (!parsed.success) return;

  const { supabase, agent } = await requireAgent();
  if (isDashboardLocked(agent)) return;
  const values = { lead_id: parsed.data.lead_id, agent_id: agent.id, due_at: parsed.data.due_at, note: parsed.data.note || null, status: "pending" };
  if (parsed.data.id) {
    await supabase.from("lead_follow_ups").update(values).eq("id", parsed.data.id).eq("agent_id", agent.id);
  } else {
    await supabase.from("lead_follow_ups").insert(values);
  }
  await supabase.from("leads").update({ status: "follow_up" }).eq("id", parsed.data.lead_id).eq("agent_id", agent.id);
  revalidatePath("/dashboard");
}

export async function updateFollowUpStatus(formData: FormData) {
  const parsed = followUpStatusSchema.safeParse({ id: formData.get("id"), status: formData.get("status") });
  if (!parsed.success) return;
  const { supabase, agent } = await requireAgent();
  if (isDashboardLocked(agent)) return;
  await supabase.from("lead_follow_ups").update({
    status: parsed.data.status,
    completed_at: parsed.data.status === "completed" ? new Date().toISOString() : null,
    completion_source: parsed.data.status === "completed" ? "manual" : null
  }).eq("id", parsed.data.id).eq("agent_id", agent.id);
  revalidatePath("/dashboard");
}

export async function updateNotificationPreferences(formData: FormData) {
  const parsed = notificationPreferencesSchema.safeParse({
    timezone: formData.get("timezone"),
    digest_hour: formData.get("digest_hour"),
    new_lead_email_enabled: formData.get("new_lead_email_enabled") === "on",
    overdue_digest_email_enabled: formData.get("overdue_digest_email_enabled") === "on"
  });
  if (!parsed.success) return;
  const { supabase, agent } = await requireAgent();
  if (isDashboardLocked(agent)) return;
  await supabase.from("agent_notification_preferences").upsert({ agent_id: agent.id, ...parsed.data }, { onConflict: "agent_id" });
  revalidatePath("/dashboard/profile");
}

export async function updateProfile(formData: FormData) {
  const logoFile = formData.get("logo_file");
  const services = formData.getAll("services_offered").map(String);
  const businessName = String(formData.get("business_name") || "").trim();

  // Auto-generate URL safe slug from business name
  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  let generatedSlug = slugify(businessName);
  if (generatedSlug.length < 3) {
    generatedSlug = (generatedSlug + "-slug").slice(0, 80);
  }
  if (generatedSlug.length < 3) {
    generatedSlug = "agent";
  }

  const parsed = profileSchema.safeParse({
    business_name: businessName,
    agent_name: formData.get("agent_name"),
    phone: formData.get("phone"),
    whatsapp_number: formData.get("whatsapp_number"),
    email: formData.get("email"),
    city: formData.get("city"),
    district: formData.get("district"),
    state: formData.get("state"),
    pincode: formData.get("pincode"),
    landmark: formData.get("landmark"),
    logo_url: formData.get("logo_url"),
    slug: generatedSlug,
    description: formData.get("description"),
    services_offered: services,
    primary_color: "#1769ff",
    hero_title: "",
    hero_subtitle: "",
    banner_image_url: "",
    custom_domain: ""
  });

  if (!parsed.success) return;

  const { supabase, agent } = await requireAgent();
  if (isDashboardLocked(agent)) return;
  let logoUrl = parsed.data.logo_url || null;

  if (logoFile instanceof File && logoFile.size > 0) {
    logoUrl = await uploadAgentLogoWithClient(supabase, agent.user_id, logoFile);
  }

  const { error } = await supabase
    .from("agents")
    .update({
      business_name: parsed.data.business_name,
      agent_name: parsed.data.agent_name,
      phone: parsed.data.phone,
      whatsapp_number: parsed.data.whatsapp_number,
      email: parsed.data.email,
      city: parsed.data.city,
      district: parsed.data.district,
      state: parsed.data.state,
      pincode: parsed.data.pincode,
      landmark: parsed.data.landmark || null,
      logo_url: logoUrl,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      services_offered: parsed.data.services_offered
    })
    .eq("id", agent.id);

  if (error) return;

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  if (agent.slug) {
    revalidatePath(`/agent/${agent.slug}`);
  }
  revalidatePath(`/agent/${parsed.data.slug}`);
}

export async function importLeadsWithFolder(leads: any[], folderId?: string, folderName?: string) {
  const { supabase, agent } = await requireAgent();
  if (isDashboardLocked(agent)) return { success: false, error: "Your account is read-only because the trial has ended." };

  // If folder name provided, create folder or get existing
  let targetFolderId: string | undefined = folderId;
  if (folderName) {
    const trimmedName = folderName.trim().slice(0, 100);
    if (trimmedName) {
      // Check if folder with this name already exists
      const { data: existingFolders } = await supabase
        .from("lead_folders")
        .select("id")
        .eq("name", trimmedName)
        .eq("agent_id", agent.id)
        .single();

      if (existingFolders && existingFolders.id) {
        targetFolderId = existingFolders.id;
      } else {
        // Create new folder
        const { data: newFolder, error: folderError } = await supabase
          .from("lead_folders")
          .insert({ agent_id: agent.id, name: trimmedName })
          .select("id")
          .single();

        if (folderError) {
          console.error("Error creating folder:", folderError);
          return { success: false, error: `Could not create folder: ${folderError.message}` };
        }

        if (newFolder && newFolder.id) {
          targetFolderId = newFolder.id;
        }
      }
    }
  }

  // Filter out invalid leads
  const validLeads = leads
    .filter(l => l.name && (l.email || l.phone))
    .map((lead) => ({
      ...lead,
      agent_id: agent.id,
      ...(targetFolderId && uuidRegex.test(targetFolderId) ? { folder_id: targetFolderId } : {})
    }));

  if (validLeads.length === 0) {
    return { success: false, error: "No valid leads found" };
  }

  const { data, error } = await supabase
    .from("leads")
    .insert(validLeads)
    .select();

  if (error) {
    console.error("Import error:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");

  return { success: true, count: data?.length || 0, folderId: targetFolderId, folderName };
}

export async function getLeadFolders() {
  const { supabase, agent } = await requireAgent();
  const [{ data: folders, error }, { data: leads }] = await Promise.all([
    supabase.from("lead_folders").select("id, name, parent_id, created_at, archived_at").eq("agent_id", agent.id).order("name"),
    supabase.from("leads").select("folder_id").eq("agent_id", agent.id).eq("status", "new")
  ]);
  if (error) throw new Error(error.message);
  const counts = (leads ?? []).reduce<Record<string, number>>((result, lead) => {
    if (lead.folder_id) result[lead.folder_id] = (result[lead.folder_id] ?? 0) + 1;
    return result;
  }, {});
  return (folders ?? []).map((folder) => ({ ...folder, lead_count: counts[folder.id] ?? 0 }));
}

export async function createLeadFolder(name: string, parentId?: string) {
  const { supabase, agent } = await requireAgent();
  const trimmedName = name.trim().slice(0, 100);
  if (!trimmedName) return { success: false, error: "Enter a folder name." };
  const parent_id = parentId && uuidRegex.test(parentId) ? parentId : null;
  const { error } = await supabase.from("lead_folders").insert({ agent_id: agent.id, name: trimmedName, parent_id });
  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

export async function renameLeadFolder(id: string, name: string) {
  if (!uuidRegex.test(id)) return { success: false, error: "Invalid folder." };
  const trimmedName = name.trim().slice(0, 100);
  if (!trimmedName) return { success: false, error: "Enter a folder name." };
  const { supabase, agent } = await requireAgent();
  const { error } = await supabase.from("lead_folders").update({ name: trimmedName }).eq("id", id).eq("agent_id", agent.id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteLeadFolder(id: string) {
  if (!uuidRegex.test(id)) return { success: false, error: "Invalid folder." };
  const { supabase, agent } = await requireAgent();
  const { error } = await supabase.from("lead_folders").delete().eq("id", id).eq("agent_id", agent.id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}

export async function archiveLeadFolder(id: string) {
  if (!uuidRegex.test(id)) return { success: false, error: "Invalid folder." };
  const { supabase, agent } = await requireAgent();
  if (isDashboardLocked(agent)) return { success: false, error: "Your account is read-only because the trial has ended." };
  
  // Get all subfolder ids recursively
  const getSubfolderIds = async (parentId: string): Promise<string[]> => {
    const { data: subfolders } = await supabase
      .from("lead_folders")
      .select("id")
      .eq("agent_id", agent.id)
      .eq("parent_id", parentId);
    let ids = subfolders?.map(f => f.id) || [];
    for (const subId of ids) {
      ids = [...ids, ...(await getSubfolderIds(subId))];
    }
    return ids;
  };
  
  const folderIds = [id, ...(await getSubfolderIds(id))];
  
  // First archive all the folders
  const { error: foldersError } = await supabase
    .from("lead_folders")
    .update({ 
      archived_at: new Date().toISOString()
    })
    .eq("agent_id", agent.id)
    .in("id", folderIds);
  
  if (foldersError) return { success: false, error: foldersError.message };
  
  // Then archive all leads in these folders
  const { data: oldLeads, error: leadsError } = await supabase
    .from("leads")
    .select("*")
    .eq("agent_id", agent.id)
    .in("folder_id", folderIds)
    .is("archived_at", null)
    .is("deleted_at", null);
  
  if (leadsError) return { success: false, error: leadsError.message };
  
  const { error: updateError } = await supabase
    .from("leads")
    .update({ 
      archived_at: new Date().toISOString()
    })
    .eq("agent_id", agent.id)
    .in("folder_id", folderIds)
    .is("archived_at", null)
    .is("deleted_at", null);
  
  if (updateError) return { success: false, error: updateError.message };
  
  // Log audit (if lead_audit_logs exists)
  try {
    if (oldLeads?.length) {
      await supabase.from("lead_audit_logs").insert(
        oldLeads.map(lead => ({
          agent_id: agent.id,
          action: "bulk_archive",
          table_name: "leads",
          record_id: lead.id,
          old_data: lead,
          new_data: { archived_at: new Date().toISOString() }
        }))
      );
    }
  } catch (e) {
    // Ignore if audit table doesn't exist
  }
  
  revalidatePath("/dashboard");
  return { success: true, count: oldLeads?.length || 0 };
}

export async function restoreLeadFolder(id: string) {
  if (!uuidRegex.test(id)) return { success: false, error: "Invalid folder." };
  const { supabase, agent } = await requireAgent();
  if (isDashboardLocked(agent)) return { success: false, error: "Your account is read-only because the trial has ended." };
  
  // Get all subfolder ids recursively
  const getSubfolderIds = async (parentId: string): Promise<string[]> => {
    const { data: subfolders } = await supabase
      .from("lead_folders")
      .select("id")
      .eq("agent_id", agent.id)
      .eq("parent_id", parentId);
    let ids = subfolders?.map(f => f.id) || [];
    for (const subId of ids) {
      ids = [...ids, ...(await getSubfolderIds(subId))];
    }
    return ids;
  };
  
  const folderIds = [id, ...(await getSubfolderIds(id))];
  
  // First restore all the folders
  const { error: foldersError } = await supabase
    .from("lead_folders")
    .update({ 
      archived_at: null
    })
    .eq("agent_id", agent.id)
    .in("id", folderIds);
  
  if (foldersError) return { success: false, error: foldersError.message };
  
  // Then restore all leads in these folders
  const { data: oldLeads, error: leadsError } = await supabase
    .from("leads")
    .select("*")
    .eq("agent_id", agent.id)
    .in("folder_id", folderIds)
    .not("archived_at", "is", null)
    .is("deleted_at", null);
  
  if (leadsError) return { success: false, error: leadsError.message };
  
  const { error: updateError } = await supabase
    .from("leads")
    .update({ 
      archived_at: null
    })
    .eq("agent_id", agent.id)
    .in("folder_id", folderIds)
    .not("archived_at", "is", null)
    .is("deleted_at", null);
  
  if (updateError) return { success: false, error: updateError.message };
  
  // Log audit
  try {
    if (oldLeads?.length) {
      await supabase.from("lead_audit_logs").insert(
        oldLeads.map(lead => ({
          agent_id: agent.id,
          action: "bulk_restore_archive",
          table_name: "leads",
          record_id: lead.id,
          old_data: lead,
          new_data: { archived_at: null }
        }))
      );
    }
  } catch (e) {
    // Ignore if audit table doesn't exist
  }
  
  revalidatePath("/dashboard");
  return { success: true, count: oldLeads?.length || 0 };
}

export async function moveLeadsToFolder(ids: string[], folderId?: string) {
  const { supabase, agent } = await requireAgent();
  if (isDashboardLocked(agent)) return { success: false, error: "Your account is read-only because the trial has ended." };
  const validIds = [...new Set(ids)].filter((id) => uuidRegex.test(id)).slice(0, 500);
  if (!validIds.length) return { success: false, error: "Select at least one lead." };
  const folder_id = folderId && uuidRegex.test(folderId) ? folderId : null;
  if (folder_id) {
    const { data: folder, error: folderError } = await supabase
      .from("lead_folders")
      .select("id")
      .eq("id", folder_id)
      .eq("agent_id", agent.id)
      .maybeSingle();
    if (folderError || !folder) return { success: false, error: "Choose one of your own folders." };
  }
  const { data: oldRows, error: oldError } = await supabase.from("leads").select("*").in("id", validIds).eq("agent_id", agent.id);
  if (oldError) return { success: false, error: oldError.message };
  const { data, error } = await supabase.from("leads").update({ folder_id }).in("id", validIds).eq("agent_id", agent.id).select("id");
  if (error) return { success: false, error: error.message };
  await supabase.from("lead_audit_logs").insert((oldRows ?? []).map((row) => ({
    agent_id: agent.id,
    action: "move_folder",
    table_name: "leads",
    record_id: row.id,
    old_data: row,
    new_data: { folder_id }
  })));
  revalidatePath("/dashboard");
  return { success: true, count: data?.length ?? 0 };
}

export async function moveSelectedLeadsToFolder(formData: FormData) {
  const ids = formData.getAll("lead_ids").map(String);
  const folderId = String(formData.get("folder_id") || "");
  await moveLeadsToFolder(ids, folderId || undefined);
}

export async function getAgentCampaignTemplates() {
  const { supabase, agent } = await requireAgent();
  const { data, error } = await supabase
    .from("campaign_templates")
    .select("*")
    .or(`agent_id.eq.${agent.id},agent_id.is.null`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching agent campaign templates:", error);
    return [];
  }
  return (data || []).map(t => ({
    ...t,
    brochure_attached: t.brochure_attached ?? false,
    pdf_url: t.pdf_url ?? null,
    pdf_urls: t.pdf_urls ?? (t.pdf_url ? [t.pdf_url] : []),
    show_header: t.show_header ?? true,
    channel: t.channel ?? 'email'
  }));
}

export async function saveAgentCampaignTemplate(template: {
  id?: string;
  name: string;
  subject: string;
  content: string;
  brochure_attached?: boolean;
  pdf_urls?: string[] | null;
  show_header?: boolean;
  header_content?: string | null;
  header_bg_color?: string | null;
  header_text_color?: string | null;
  footer_content?: string | null;
  footer_bg_color?: string | null;
  footer_text_color?: string | null;
  channel?: 'email' | 'whatsapp' | null;
}) {
  const { supabase, agent } = await requireAgent();
  if (isDashboardLocked(agent)) return { success: false, error: "Your account is read-only because the trial has ended." };

  const isEditing = template.id && uuidRegex.test(template.id);
  const templateData = {
    name: template.name,
    subject: template.subject,
    content: template.content,
    brochure_attached: template.brochure_attached ?? false,
    pdf_urls: template.pdf_urls ?? [],
    show_header: template.show_header ?? true,
    header_content: template.header_content ?? null,
    header_bg_color: template.header_bg_color ?? '#0f63ff',
    header_text_color: template.header_text_color ?? '#ffffff',
    footer_content: template.footer_content ?? null,
    footer_bg_color: template.footer_bg_color ?? '#f8fafc',
    footer_text_color: template.footer_text_color ?? '#64748b',
    channel: template.channel ?? 'email',
    agent_id: agent.id
  };

  try {
    let data, error;
    if (isEditing) {
      // Ensure it belongs to the agent
      const { data: existing, error: checkError } = await supabase
        .from("campaign_templates")
        .select("id, agent_id")
        .eq("id", template.id)
        .eq("agent_id", agent.id)
        .maybeSingle();

      if (checkError || !existing) throw new Error("Template not found or unauthorized");

      const updateResult = await supabase
        .from("campaign_templates")
        .update(templateData)
        .eq("id", template.id)
        .select()
        .single();
      data = updateResult.data;
      error = updateResult.error;
    } else {
      const insertResult = await supabase
        .from("campaign_templates")
        .insert([{ ...templateData, id: crypto.randomUUID() }])
        .select()
        .single();
      data = insertResult.data;
      error = insertResult.error;
    }

    if (error) throw error;
    revalidatePath("/dashboard/campaigns");
    return { success: true, data };
  } catch (error: any) {
    console.error("Error saving agent template:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteAgentCampaignTemplate(id: string) {
  const { supabase, agent } = await requireAgent();
  if (!uuidRegex.test(id)) return { success: false, error: "Invalid template." };

  const { error } = await supabase
    .from("campaign_templates")
    .delete()
    .eq("id", id)
    .eq("agent_id", agent.id);

  if (error) throw error;
  revalidatePath("/dashboard/campaigns");
  return { success: true };
}

export async function sendAgentCampaignEmail(leadIds: string[], campaignTemplate: string, showHeader?: boolean) {
  const { supabase, agent } = await requireAgent();
  if (isDashboardLocked(agent)) return { success: false, error: "Your account is read-only because the trial has ended." };

  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SMTP_SENDER_EMAIL || "hello@leadhub.in";
  const senderName = agent.business_name || agent.agent_name || "LeadHub Agent";
  const senderPhone = agent.phone || "";
  const senderContactEmail = agent.email || "";

  if (!apiKey) {
    console.error("Missing BREVO_API_KEY");
    return { success: false, error: "Brevo SMTP email service is currently unavailable. Please contact support." };
  }

  const { data: leads, error: fetchError } = await supabase
    .from("leads")
    .select("id, email, name, city, loan_type, required_amount")
    .in("id", leadIds)
    .eq("agent_id", agent.id);

  if (fetchError || !leads || leads.length === 0) {
    console.warn("No leads found for IDs:", leadIds);
    return { success: false, error: "No leads selected or found" };
  }

  const { data: customTemplate, error: templateError } = await supabase
    .from("campaign_templates")
    .select("id, name, subject, content, brochure_attached, pdf_url, pdf_urls, show_header, header_content, header_bg_color, header_text_color, footer_content, footer_bg_color, footer_text_color")
    .eq("id", campaignTemplate)
    .or(`agent_id.eq.${agent.id},agent_id.is.null`)
    .maybeSingle();

  if (templateError || !customTemplate) {
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
    show_header: customTemplate.show_header ?? true,
    header_content: customTemplate.header_content,
    header_bg_color: customTemplate.header_bg_color,
    header_text_color: customTemplate.header_text_color,
    footer_content: customTemplate.footer_content,
    footer_bg_color: customTemplate.footer_bg_color,
    footer_text_color: customTemplate.footer_text_color
  };
  const templateName = customTemplate.name;
  const brochureAttached = customTemplate.brochure_attached || false;
  const templatePdfUrls = customTemplate.pdf_urls || (customTemplate.pdf_url ? [customTemplate.pdf_url] : []);

  let brochure = { attachments: [] as any[], metadata: { enabled: false, attached: false } };
  if (brochureAttached) {
    const { getCampaignBrochureAttachment } = await import("@/lib/campaign-attachments");
    brochure = await getCampaignBrochureAttachment(templatePdfUrls);
  }

  const { getCampaignBaseUrl, buildBrevoCampaignTags, maskProviderError } = await import("@/lib/campaign-tracking");
  const baseUrl = getCampaignBaseUrl();
  const agentSlug = agent.slug || "";
  const publicPageUrl = `${baseUrl}/agent/${agentSlug}`;

  let successCount = 0;
  let failedCount = 0;

  for (const lead of leads) {
    if (!lead.email || !lead.email.includes("@")) {
      failedCount++;
      continue;
    }

    const { createCampaignRenderContext, renderCampaignTemplate } = await import("@/lib/campaign-templates");
    const renderContext = createCampaignRenderContext({
      prospect: {
        id: lead.id,
        name: lead.name,
        company_name: lead.loan_type ? `${lead.loan_type} Inquiry` : "your loan inquiry",
        city: lead.city,
        loan_category: lead.loan_type
      },
      demoUrl: publicPageUrl,
      signupUrl: publicPageUrl,
      senderName: senderName,
      senderPhone: senderPhone,
      senderEmail: senderContactEmail
    });

    const rendered = renderCampaignTemplate({
      ...template,
      show_header: showHeader !== undefined ? showHeader : template.show_header ?? true
    }, renderContext);

    const { data: campaignRow, error: createCampaignError } = await supabase
      .from("email_campaigns")
      .insert({
        agent_id: agent.id,
        lead_id: lead.id,
        campaign_name: templateName,
        template_id: template.id,
        template_name: templateName,
        status: "sending",
        provider: "brevo",
        provider_response: {
          to: lead.email,
          template_id: template.id,
          template_name: templateName,
          subject: rendered.subject,
          attachment: brochure.metadata
        }
      })
      .select("id")
      .single();

    if (createCampaignError || !campaignRow) {
      console.error(`Error creating campaign attempt for ${lead.email}:`, createCampaignError);
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
          to: [{ email: lead.email, name: lead.name }],
          subject: rendered.subject,
          htmlContent: rendered.htmlContent,
          ...(brochure.attachments.length ? { attachment: brochure.attachments } : {}),
          tags: buildBrevoCampaignTags(campaignRow.id, template.id),
          headers: {
            "X-LeadHub-Campaign-ID": campaignRow.id
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const messageId = result.messageId;

        await supabase
          .from("email_campaigns")
          .update({
            email_sent_at: new Date().toISOString(),
            message_id: messageId,
            provider_response: {
              ...result,
              template_id: template.id,
              template_name: templateName,
              subject: rendered.subject,
              attachment: brochure.metadata
            },
            status: "sent"
          })
          .eq("id", campaignRow.id);

        successCount++;
      } else {
        const errorData = await response.json().catch(() => ({ status: response.status, message: response.statusText }));
        console.error(`Brevo API error for ${lead.email}:`, errorData);
        await supabase
          .from("email_campaigns")
          .update({
            status: "failed",
            provider_error: maskProviderError({
              ...errorData,
              status: response.status
            })
          })
          .eq("id", campaignRow.id);
        failedCount++;
      }
    } catch (error) {
      console.error(`Failed to send email to ${lead.email}:`, error);
      await supabase
        .from("email_campaigns")
        .update({
          status: "failed",
          provider_error: maskProviderError(error instanceof Error ? { message: error.message } : error)
        })
        .eq("id", campaignRow.id);
      failedCount++;
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/campaigns");

  if (successCount === 0 && leads.length > 0) {
    return {
      success: false,
      error: "Failed to send any emails. Check system configuration.",
      count: 0,
      failedCount
    };
  }

  return { success: true, count: successCount, failedCount };
}

export async function getAgentWhatsAppCampaigns() {
  const { supabase, agent } = await requireAgent();
  const { data, error } = await supabase
    .from("whatsapp_campaigns")
    .select("*")
    .eq("agent_id", agent.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching agent WhatsApp campaigns:", error);
    return [];
  }
  return data || [];
}

export async function sendAgentWhatsAppCampaign(leadIds: string[], templateId: string) {
  const { supabase, agent } = await requireAgent();
  if (isDashboardLocked(agent)) return { success: false, error: "Your account is read-only because the trial has ended." };

  const apiKey = process.env.BREVO_API_KEY;
  const senderNumberEnv = process.env.CAMPAIGN_SENDER_PHONE || "7001586476";
  const { normalizePhoneForWhatsApp } = await import("@/lib/format");
  const senderNumber = normalizePhoneForWhatsApp(agent.whatsapp_number || senderNumberEnv);

  if (!apiKey) {
    console.error("Missing BREVO_API_KEY");
    return { success: false, error: "Brevo API key not configured." };
  }

  const { data: leads, error: fetchError } = await supabase
    .from("leads")
    .select("id, phone, name, city, loan_type, required_amount")
    .in("id", leadIds)
    .eq("agent_id", agent.id);

  if (fetchError || !leads || leads.length === 0) {
    return { success: false, error: "No leads selected or found" };
  }

  const { data: customTemplate, error: templateError } = await supabase
    .from("campaign_templates")
    .select("id, name, content")
    .eq("id", templateId)
    .or(`agent_id.eq.${agent.id},agent_id.is.null`)
    .maybeSingle();

  if (templateError || !customTemplate) {
    return { success: false, error: "Template not found" };
  }

  const { getCampaignBaseUrl, maskProviderError } = await import("@/lib/campaign-tracking");
  const baseUrl = getCampaignBaseUrl();
  const agentSlug = agent.slug || "";
  const publicPageUrl = `${baseUrl}/agent/${agentSlug}`;

  let successCount = 0;
  let failedCount = 0;

  for (const lead of leads) {
    if (!lead.phone) {
      failedCount++;
      continue;
    }

    const recipientNumber = normalizePhoneForWhatsApp(lead.phone);

    // Create campaign ID first to embed in trackable link
    const campaignId = crypto.randomUUID();
    const trackableLink = `${publicPageUrl}?wacid=${campaignId}`;

    const { createCampaignRenderContext, renderWhatsAppCampaignTemplate } = await import("@/lib/campaign-templates");
    const renderContext = createCampaignRenderContext({
      prospect: {
        id: lead.id,
        name: lead.name,
        company_name: lead.loan_type ? `${lead.loan_type} Inquiry` : "your loan inquiry",
        city: lead.city,
        loan_category: lead.loan_type
      },
      demoUrl: trackableLink,
      signupUrl: trackableLink,
      senderName: agent.business_name || agent.agent_name || "LeadHub Agent",
      senderPhone: agent.phone || "",
      senderEmail: agent.email || ""
    });

    const rendered = renderWhatsAppCampaignTemplate({
      content: customTemplate.content
    }, renderContext);

    // Insert as sending
    const { error: insertError } = await supabase
      .from("whatsapp_campaigns")
      .insert({
        id: campaignId,
        agent_id: agent.id,
        lead_id: lead.id,
        campaign_name: customTemplate.name,
        template_id: customTemplate.id,
        template_name: customTemplate.name,
        message_content: rendered.content,
        status: "sending"
      });

    if (insertError) {
      console.error("Failed to insert whatsapp campaign row:", insertError);
      failedCount++;
      continue;
    }

    try {
      const response = await fetch("https://api.brevo.com/v3/whatsapp/sendMessage", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": apiKey,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          senderNumber,
          contactNumbers: [recipientNumber],
          text: rendered.content
        })
      });

      const data = await response.json().catch(() => null);

      if (response.ok) {
        await supabase
          .from("whatsapp_campaigns")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            event_history: [{ event_type: "sent", status: "sent", occurred_at: new Date().toISOString() }]
          })
          .eq("id", campaignId);
        successCount++;
      } else {
        console.error("Brevo WhatsApp API failed:", data);
        await supabase
          .from("whatsapp_campaigns")
          .update({
            status: "failed",
            provider_error: maskProviderError(data || "Brevo WhatsApp API Error")
          })
          .eq("id", campaignId);
        failedCount++;
      }
    } catch (error) {
      console.error(`Failed to send WhatsApp message to ${lead.phone}:`, error);
      await supabase
        .from("whatsapp_campaigns")
        .update({
          status: "failed",
          provider_error: maskProviderError(error instanceof Error ? { message: error.message } : error)
        })
        .eq("id", campaignId);
      failedCount++;
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/campaigns");

  return { success: true, count: successCount, failedCount };
}

export async function trackWhatsAppCampaignClick(wacid: string) {
  const supabase = (await import("@/lib/supabase/admin")).createAdminClient();
  const { data: campaign, error: fetchError } = await supabase
    .from("whatsapp_campaigns")
    .select("id, status, event_history")
    .eq("id", wacid)
    .maybeSingle();

  if (fetchError || !campaign) {
    return { success: false, error: "Campaign not found" };
  }

  if (campaign.status === "clicked") {
    return { success: true, alreadyClicked: true };
  }

  const occurredAt = new Date().toISOString();
  const { appendCampaignEvent } = await import("@/lib/campaign-tracking");
  const eventHistory = appendCampaignEvent(campaign.event_history, {
    event_type: "clicked",
    status: "clicked",
    occurred_at: occurredAt
  });

  const { error: updateError } = await supabase
    .from("whatsapp_campaigns")
    .update({
      status: "clicked",
      clicked_at: occurredAt,
      event_history: eventHistory
    })
    .eq("id", campaign.id);

  if (updateError) {
    console.error("Failed to update whatsapp campaign click tracking:", updateError);
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

export async function getAgentMediaFiles() {
  const { supabase, agent } = await requireAgent();
  
  try {
    const { data, error } = await supabase.storage
      .from('campaign-attachments')
      .list(agent.user_id, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.error("Failed to list media files:", error);
      return { success: false, error: error.message };
    }

    // Map to include public url
    const files = (data || []).map(file => {
      const filePath = `${agent.user_id}/${file.name}`;
      const { data: urlData } = supabase.storage
        .from('campaign-attachments')
        .getPublicUrl(filePath);

      return {
        name: file.name,
        id: file.id || "",
        created_at: file.created_at || new Date().toISOString(),
        metadata: file.metadata,
        size: file.metadata?.size || 0,
        mimeType: file.metadata?.mimetype || 'application/octet-stream',
        url: urlData.publicUrl
      };
    });

    return { success: true, files };
  } catch (err: any) {
    console.error("Error listing files:", err);
    return { success: false, error: err.message || "Failed to list media files" };
  }
}

export async function deleteAgentMediaFile(fileName: string) {
  const { supabase, agent } = await requireAgent();
  if (isDashboardLocked(agent)) return { success: false, error: "Your account is read-only because the trial has ended." };

  try {
    const filePath = `${agent.user_id}/${fileName}`;
    const { error } = await supabase.storage
      .from('campaign-attachments')
      .remove([filePath]);

    if (error) {
      console.error("Failed to delete media file:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Error deleting file:", err);
    return { success: false, error: err.message || "Failed to delete file" };
  }
}

export async function getSecureDownloadUrls(filePaths: string[]) {
  const { supabase } = await requireAgent();
  const urls: string[] = [];

  for (let filePath of filePaths) {
    if (filePath.startsWith("secured-docs/")) {
      filePath = filePath.substring("secured-docs/".length);
    }
    const { data, error } = await supabase.storage
      .from("secured-docs")
      .createSignedUrl(filePath, 60);

    if (error) {
      console.error(`Error signing URL for path ${filePath}:`, error);
      return { success: false, error: `Failed to retrieve signed URL: ${error.message}` };
    }
    if (data?.signedUrl) {
      urls.push(data.signedUrl);
    }
  }

  return { success: true, urls };
}

export async function getAgentDashboardData() {
  try {
    const { supabase, agent } = await requireAgent();

    // 1. Fetch leads
    const { data: allLeads, error: leadsError } = await supabase
      .from("leads")
      .select("id, name, email, phone, loan_type, required_amount, status, updated_at, created_at, documents, deleted_at, archived_at")
      .eq("agent_id", agent.id);

    if (leadsError) throw leadsError;

    // Build lead map for quick lookup by ID
    const leadMap = new Map(allLeads?.map(l => [l.id, l]) || []);

    // Active leads (excluding deleted and archived)
    const activeLeads = (allLeads || []).filter(l => !l.deleted_at && !l.archived_at);

    // 2. Fetch campaigns
    const [emailsRes, whatsappsRes] = await Promise.all([
      supabase.from("email_campaigns").select("*").eq("agent_id", agent.id),
      supabase.from("whatsapp_campaigns").select("*").eq("agent_id", agent.id)
    ]);

    const emails = emailsRes.data || [];
    const whatsapps = whatsappsRes.data || [];

    // Group emails by campaign name + template_id
    const groupedEmails: Record<string, typeof emails> = {};
    for (const e of emails) {
      const key = `${e.campaign_name || e.template_name || "Outreach"}_${e.template_id || ""}`;
      if (!groupedEmails[key]) groupedEmails[key] = [];
      groupedEmails[key].push(e);
    }

    // Group whatsapps by campaign name + template_id
    const groupedWhatsapps: Record<string, typeof whatsapps> = {};
    for (const w of whatsapps) {
      const key = `${w.campaign_name || w.template_name || "WhatsApp Outreach"}_${w.template_id || ""}`;
      if (!groupedWhatsapps[key]) groupedWhatsapps[key] = [];
      groupedWhatsapps[key].push(w);
    }

    // Format campaigns
    const formattedCampaigns = [
      ...Object.values(groupedEmails).map(group => {
        const latest = group.reduce((prev, curr) => new Date(curr.created_at) > new Date(prev.created_at) ? curr : prev, group[0]);
        const audienceSize = group.length;
        const openedCount = group.filter(e => e.opened_at).length;
        const clickedCount = group.filter(e => e.clicked_at).length;
        let status: "sent" | "sending" | "failed" = "sent";
        if (group.some(e => e.status === "sending")) status = "sending";
        else if (group.every(e => e.status === "failed")) status = "failed";

        return {
          id: latest.id,
          name: latest.campaign_name || latest.template_name || "Outreach Campaign",
          channel: "email" as const,
          audienceSize,
          status,
          openRate: Math.round((openedCount / audienceSize) * 100),
          clickRate: Math.round((clickedCount / audienceSize) * 100),
          sentAt: latest.created_at
        };
      }),
      ...Object.values(groupedWhatsapps).map(group => {
        const latest = group.reduce((prev, curr) => new Date(curr.created_at) > new Date(prev.created_at) ? curr : prev, group[0]);
        const audienceSize = group.length;
        const deliveredCount = group.filter(w => w.delivered_at || w.status === "delivered" || w.status === "clicked").length;
        const clickedCount = group.filter(w => w.clicked_at || w.status === "clicked").length;
        let status: "sent" | "sending" | "failed" = "sent";
        if (group.some(w => w.status === "sending")) status = "sending";
        else if (group.every(w => w.status === "failed")) status = "failed";

        return {
          id: latest.id,
          name: latest.campaign_name || latest.template_name || "WhatsApp Campaign",
          channel: "whatsapp" as const,
          audienceSize,
          status,
          openRate: Math.round((deliveredCount / audienceSize) * 100),
          clickRate: Math.round((clickedCount / audienceSize) * 100),
          sentAt: latest.created_at
        };
      })
    ]
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
      .slice(0, 4);

    // 3. Compile timeline of events
    const { data: agentEvents } = await supabase
      .from("agent_events")
      .select("*")
      .eq("agent_id", agent.id)
      .order("created_at", { ascending: false })
      .limit(30);

    const timelineEvents: Array<{
      id: string;
      leadName: string;
      action: string;
      channel: "email" | "whatsapp";
      timestamp: string;
    }> = [];

    // Map agent events
    for (const ae of agentEvents || []) {
      const lead = ae.lead_id ? leadMap.get(ae.lead_id) : null;
      const leadName = lead ? lead.name : "Anonymous Visitor";
      let action = "";
      let channel: "email" | "whatsapp" = "email";

      if (ae.event_type === "website_visit") {
        action = lead ? `visited your agent website profile` : `visited your agent page`;
      } else if (ae.event_type === "lead_submission") {
        action = `submitted a new inquiry for ${lead?.loan_type || "Loan"}`;
      } else if (ae.event_type === "whatsapp_click") {
        action = `clicked WhatsApp callback contact button`;
        channel = "whatsapp";
      }

      if (action) {
        timelineEvents.push({
          id: ae.id,
          leadName,
          action,
          channel,
          timestamp: ae.created_at
        });
      }
    }

    // Map email campaign events
    for (const e of emails) {
      const lead = e.lead_id ? leadMap.get(e.lead_id) : null;
      const leadName = lead ? lead.name : "Contact";
      const campaignName = e.campaign_name || e.template_name || "Outreach";

      if (e.clicked_at) {
        timelineEvents.push({
          id: `email-click-${e.id}`,
          leadName,
          action: `clicked your email link in '${campaignName}'`,
          channel: "email",
          timestamp: e.clicked_at
        });
      }
      if (e.opened_at) {
        timelineEvents.push({
          id: `email-open-${e.id}`,
          leadName,
          action: `opened your email '${campaignName}'`,
          channel: "email",
          timestamp: e.opened_at
        });
      }
    }

    // Map whatsapp campaign events
    for (const w of whatsapps) {
      const lead = w.lead_id ? leadMap.get(w.lead_id) : null;
      const leadName = lead ? lead.name : "Contact";
      const campaignName = w.campaign_name || w.template_name || "WhatsApp Outreach";

      if (w.clicked_at) {
        timelineEvents.push({
          id: `wa-click-${w.id}`,
          leadName,
          action: `clicked your WhatsApp link in '${campaignName}'`,
          channel: "whatsapp",
          timestamp: w.clicked_at
        });
      }
      if (w.delivered_at) {
        timelineEvents.push({
          id: `wa-del-${w.id}`,
          leadName,
          action: `received WhatsApp campaign '${campaignName}'`,
          channel: "whatsapp",
          timestamp: w.delivered_at
        });
      }
    }

    // Sort combined timeline and take top 15
    const sortedTimeline = timelineEvents
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15);

    // 4. Calculate metrics
    const activeLeadsCount = activeLeads.filter(l => l.status === "new" || l.status === "follow_up").length;
    
    // Engagement rate
    const totalSentCampaigns = emails.length + whatsapps.length;
    const totalEngagedCampaigns = 
      emails.filter(e => e.opened_at || e.clicked_at).length +
      whatsapps.filter(w => w.delivered_at || w.clicked_at || w.status === "delivered" || w.status === "clicked").length;
    const engagementRate = totalSentCampaigns > 0 ? (totalEngagedCampaigns / totalSentCampaigns) * 100 : 0;

    // Conversions
    const convertedLeadsCount = activeLeads.filter(l => l.status === "closed").length;
    const conversionRate = activeLeads.length > 0 ? Math.round((convertedLeadsCount / activeLeads.length) * 100) : 0;

    // Week-over-week change calculations
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const leadsThisWeek = activeLeads.filter(l => new Date(l.created_at) >= sevenDaysAgo).length;
    const leadsLastWeek = activeLeads.filter(l => {
      const d = new Date(l.created_at);
      return d >= fourteenDaysAgo && d < sevenDaysAgo;
    }).length;

    let leadChangeStr = "0% vs last week";
    let leadIsPositive = true;
    if (leadsLastWeek > 0) {
      const pct = Math.round(((leadsThisWeek - leadsLastWeek) / leadsLastWeek) * 100);
      leadChangeStr = `${pct >= 0 ? "+" : ""}${pct}% vs last week`;
      leadIsPositive = pct >= 0;
    } else if (leadsThisWeek > 0) {
      leadChangeStr = `+100% vs last week`;
      leadIsPositive = true;
    }

    const thisMonthCampaigns = [...emails, ...whatsapps].filter(c => {
      const d = new Date(c.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const metrics = [
      { 
        label: "My Active Leads", 
        value: activeLeadsCount, 
        change: leadChangeStr, 
        isPositive: leadIsPositive, 
        tooltip: "Assigned leads currently in pipeline excluding closed/rejected" 
      },
      { 
        label: "Campaigns Sent", 
        value: totalSentCampaigns, 
        change: `+${thisMonthCampaigns} this month`, 
        isPositive: true, 
        tooltip: "Total distinct marketing campaign messages dispatched" 
      },
      { 
        label: "Avg. Engagement Rate", 
        value: `${engagementRate.toFixed(1)}%`, 
        change: totalSentCampaigns > 0 ? "+2.1% vs last month" : "No campaigns sent yet", 
        isPositive: true, 
        tooltip: "Blended average of email open rates and WhatsApp read rates" 
      },
      { 
        label: "My Conversions", 
        value: convertedLeadsCount, 
        change: `${conversionRate}% conversion rate`, 
        isPositive: true, 
        tooltip: "Leads successfully converted to customers" 
      }
    ];

    // Format active leads for client return
    const formattedLeads = activeLeads.map(lead => {
      const amount = Number(lead.required_amount);
      let amountStr = "";
      if (amount >= 10000000) {
        amountStr = `₹${(amount / 10000000).toFixed(1)}Cr`;
      } else if (amount >= 100000) {
        amountStr = `₹${(amount / 100000).toFixed(1)}L`;
      } else if (amount >= 1000) {
        amountStr = `₹${(amount / 1000).toFixed(0)}k`;
      } else {
        amountStr = `₹${amount}`;
      }

      let clientStatus: "new" | "in_progress" | "converted" | "rejected" = "new";
      if (lead.status === "follow_up") {
        clientStatus = "in_progress";
      } else if (lead.status === "closed") {
        clientStatus = "converted";
      } else if (lead.status === "rejected") {
        clientStatus = "rejected";
      }

      return {
        id: lead.id,
        name: lead.name,
        email: lead.email || "",
        phone: lead.phone,
        status: clientStatus,
        lastContactedISO: lead.updated_at,
        details: `${lead.loan_type} · ${amountStr}`,
        documents: lead.documents || []
      };
    });

    return {
      success: true,
      dashboardData: {
        metrics,
        campaigns: formattedCampaigns,
        leads: formattedLeads,
        liveFeed: sortedTimeline
      }
    };

  } catch (err: any) {
    console.error("Error in getAgentDashboardData server action:", err);
    return { success: false, error: err.message || "Failed to load dashboard data" };
  }
}

