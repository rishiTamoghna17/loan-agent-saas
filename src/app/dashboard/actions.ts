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
  const parsed = profileSchema.safeParse({
    business_name: formData.get("business_name"),
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
    slug: formData.get("slug"),
    description: formData.get("description"),
    services_offered: services,
    primary_color: formData.get("primary_color") || "#1769ff",
    hero_title: formData.get("hero_title"),
    hero_subtitle: formData.get("hero_subtitle"),
    banner_image_url: formData.get("banner_image_url"),
    custom_domain: formData.get("custom_domain")
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
      ...parsed.data,
      landmark: parsed.data.landmark || null,
      logo_url: logoUrl,
      description: parsed.data.description || null,
      hero_title: parsed.data.hero_title || null,
      hero_subtitle: parsed.data.hero_subtitle || null,
      banner_image_url: parsed.data.banner_image_url || null,
      custom_domain: parsed.data.custom_domain || null,
      domain_status: parsed.data.custom_domain
        ? parsed.data.custom_domain !== agent.custom_domain
          ? "pending"
          : agent.domain_status
        : "not_connected"
    })
    .eq("id", agent.id);

  if (error) return;

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
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
