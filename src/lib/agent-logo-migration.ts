import { uploadLogoDataUrlWithClient } from "@/lib/logo-upload";
import type { Database } from "@/lib/database.types";
import type { SupabaseClient, User } from "@supabase/supabase-js";

type AgentRow = Database["public"]["Tables"]["agents"]["Row"];

export async function migratePendingAgentLogo(supabase: SupabaseClient<Database>, user: User, agent: AgentRow) {
  if (!agent.logo_url?.startsWith("data:image/")) return agent;

  const publicUrl = await uploadLogoDataUrlWithClient(supabase, user.id, agent.logo_url);
  const { data, error } = await supabase
    .from("agents")
    .update({ logo_url: publicUrl })
    .eq("id", agent.id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
