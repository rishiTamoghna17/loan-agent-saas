"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { updateLeadScore, SCORE_RULES } from "@/lib/lead-scoring";

export async function trackWebsiteVisit(prospectId: string, pageUrl: string, userAgent: string, ipAddress: string) {
  const supabase = createAdminClient();

  // Check if this prospect has already visited to avoid duplicate score increase
  const { data: existingVisit } = await supabase
    .from("website_visits")
    .select("id")
    .eq("prospect_id", prospectId)
    .limit(1)
    .maybeSingle();

  // Save the visit
  await supabase.from("website_visits").insert({
    prospect_id: prospectId,
    page_url: pageUrl,
    user_agent: userAgent,
    ip_address: ipAddress
  });

  if (!existingVisit) {
    // Increase lead score by +20 once per prospect
    await updateLeadScore(prospectId, SCORE_RULES.VISITED_DEMO);
    
    // Update prospect status
    await supabase
      .from("prospects")
      .update({ status: "demo_requested" })
      .eq("id", prospectId);
  }
}
