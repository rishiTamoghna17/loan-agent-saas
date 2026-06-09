"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { uploadAgentLogoWithClient } from "@/lib/logo-upload";
import { deleteLeadSchema, leadNoteSchema, leadStatusSchema, profileSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

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
