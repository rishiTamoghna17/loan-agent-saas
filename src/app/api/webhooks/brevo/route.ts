import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateLeadScore, SCORE_RULES } from "@/lib/lead-scoring";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    console.log("Brevo Webhook Payload:", payload);

    // Brevo sends an array of events or a single event depending on configuration
    const events = Array.isArray(payload) ? payload : [payload];

    for (const event of events) {
      const messageId = event["message-id"];
      const eventType = event.event;

      if (!messageId) continue;

      const supabase = createAdminClient();

      // Find the campaign record
      const { data: campaign, error: campaignError } = await supabase
        .from("email_campaigns")
        .select("id, prospect_id")
        .eq("message_id", messageId)
        .maybeSingle();

      if (campaignError || !campaign) {
        console.warn(`No campaign found for message_id: ${messageId}`);
        continue;
      }

      const updates: any = {};
      let scorePoints = 0;
      let newStatus = "";

      switch (eventType) {
        case "delivered":
          updates.delivered_at = new Date().toISOString();
          updates.status = "delivered";
          break;
        case "opened":
          updates.opened_at = new Date().toISOString();
          updates.status = "opened";
          scorePoints = SCORE_RULES.EMAIL_OPENED;
          newStatus = "opened";
          break;
        case "clicked":
          updates.clicked_at = new Date().toISOString();
          updates.status = "clicked";
          scorePoints = SCORE_RULES.LINK_CLICKED;
          newStatus = "clicked";
          break;
        case "deferred":
        case "soft_bounce":
        case "hard_bounce":
          updates.status = "bounced";
          break;
        case "replied": // If Brevo supports this or via custom tracking
          updates.replied_at = new Date().toISOString();
          updates.status = "replied";
          newStatus = "replied";
          break;
      }

      if (Object.keys(updates).length > 0) {
        await supabase
          .from("email_campaigns")
          .update(updates)
          .eq("id", campaign.id);
      }

      if (scorePoints > 0) {
        await updateLeadScore(campaign.prospect_id, scorePoints);
      }

      if (newStatus) {
        // Only update prospect status if it's "higher" in the funnel
        // We'll handle this simply for now
        await supabase
          .from("prospects")
          .update({ status: newStatus })
          .eq("id", campaign.prospect_id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
