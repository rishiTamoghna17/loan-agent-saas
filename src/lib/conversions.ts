import { createAdminClient } from "@/lib/supabase/admin";
import { updateLeadScore, SCORE_RULES } from "@/lib/lead-scoring";

export async function handleProspectConversion(email: string, agentId: string) {
  const supabase = createAdminClient();

  // Find prospect by email
  const { data: prospect, error: prospectError } = await supabase
    .from("prospects")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (prospectError || !prospect) {
    console.log(`No prospect found for email ${email} during signup conversion`);
    return;
  }

  // Create conversion row
  await supabase.from("conversions").insert({
    prospect_id: prospect.id,
    agent_id: agentId,
    conversion_type: "trial_started"
  });

  // Update prospect status and score
  await supabase
    .from("prospects")
    .update({ status: "trial_started" })
    .eq("id", prospect.id);

  await updateLeadScore(prospect.id, SCORE_RULES.TRIAL_STARTED);
}

export async function handlePaidConversion(email: string) {
  const supabase = createAdminClient();

  const { data: prospect } = await supabase
    .from("prospects")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!prospect) return;

  await supabase
    .from("prospects")
    .update({ status: "converted" })
    .eq("id", prospect.id);

  await updateLeadScore(prospect.id, SCORE_RULES.CONVERTED);
  
  await supabase.from("conversions").insert({
    prospect_id: prospect.id,
    conversion_type: "paid_active"
  });
}
