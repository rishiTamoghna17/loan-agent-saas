"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { uploadAgentLogoWithClient } from "@/lib/logo-upload";
import { deleteLeadSchema, followUpSchema, followUpStatusSchema, leadNoteSchema, leadSchema, leadStatusSchema, notificationPreferencesSchema, profileSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";
import { zonedDateTimeToUtc } from "@/lib/follow-ups";

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

export async function importLeads(input: unknown): Promise<LeadMutationResult> {
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
  const { error } = await supabase.from("leads").insert(valid);
  if (error) return { ok: false, message: error.message, rejected };
  revalidatePath("/dashboard");
  return { ok: true, message: `${valid.length} lead${valid.length === 1 ? "" : "s"} imported successfully.`, imported: valid.length, rejected };
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
  await supabase.from("leads").delete().eq("id", parsed.data.lead_id).eq("agent_id", agent.id);
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
