import { createAdminClient } from "@/lib/supabase/admin";

export const SCORE_RULES = {
  EMAIL_OPENED: 10,
  LINK_CLICKED: 20,
  VISITED_DEMO: 20,
  TRIAL_STARTED: 50,
  CONVERTED: 100,
};

export async function updateLeadScore(prospectId: string, points: number) {
  const supabase = createAdminClient();
  
  // Get current score
  const { data: prospect, error: fetchError } = await supabase
    .from("prospects")
    .select("lead_score, status")
    .eq("id", prospectId)
    .single();

  if (fetchError || !prospect) return;

  const newScore = (prospect.lead_score || 0) + points;
  
  // Determine if status needs update based on conversion rules
  // (Optional: can be handled here or in specific actions)

  const { error: updateError } = await supabase
    .from("prospects")
    .update({ lead_score: newScore })
    .eq("id", prospectId);

  if (updateError) {
    console.error("Error updating lead score:", updateError);
  }
}
