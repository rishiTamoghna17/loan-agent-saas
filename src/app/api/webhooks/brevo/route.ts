import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  appendCampaignEvent,
  getBrevoEventType,
  hasCampaignEvent,
  normalizeBrevoMessageId
} from "@/lib/campaign-tracking";
import { updateLeadScore, SCORE_RULES } from "@/lib/lead-scoring";

export const runtime = "nodejs";

type BrevoWebhookEvent = Record<string, unknown>;

const EVENT_CONFIG: Record<string, { status: string; timestampField?: string; score?: number; prospectStatus?: string }> = {
  delivered: { status: "delivered", timestampField: "delivered_at" },
  opened: { status: "opened", timestampField: "opened_at", score: SCORE_RULES.EMAIL_OPENED, prospectStatus: "opened" },
  unique_opened: { status: "opened", timestampField: "opened_at", score: SCORE_RULES.EMAIL_OPENED, prospectStatus: "opened" },
  click: { status: "clicked", timestampField: "clicked_at", score: SCORE_RULES.LINK_CLICKED, prospectStatus: "clicked" },
  clicked: { status: "clicked", timestampField: "clicked_at", score: SCORE_RULES.LINK_CLICKED, prospectStatus: "clicked" },
  hard_bounce: { status: "bounced", timestampField: "bounced_at" },
  soft_bounce: { status: "bounced", timestampField: "bounced_at" },
  bounced: { status: "bounced", timestampField: "bounced_at" },
  blocked: { status: "blocked", timestampField: "bounced_at" },
  spam: { status: "spam", timestampField: "bounced_at" },
  replied: { status: "replied", timestampField: "replied_at", prospectStatus: "replied" }
};

function webhookAuthorized(req: Request) {
  const secret = process.env.BREVO_WEBHOOK_SECRET;
  if (!secret) return true;

  const url = new URL(req.url);
  const supplied =
    req.headers.get("x-brevo-webhook-secret") ||
    req.headers.get("x-webhook-secret") ||
    url.searchParams.get("secret");

  return supplied === secret;
}

function extractMessageId(event: BrevoWebhookEvent) {
  return normalizeBrevoMessageId(event["message-id"] || event.messageId || event.message_id || event.MessageID);
}

function getEventTimestamp(event: BrevoWebhookEvent) {
  const raw = event.ts || event.date || event.timestamp;
  if (typeof raw === "number") return new Date(raw * 1000).toISOString();
  if (typeof raw === "string" && raw) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return new Date(parsed * 1000).toISOString();
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return new Date().toISOString();
}

export async function POST(req: Request) {
  if (!webhookAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await req.json();
    const events: BrevoWebhookEvent[] = Array.isArray(payload) ? payload : [payload];
    const supabase = createAdminClient();
    let processed = 0;
    let unmatched = 0;

    for (const event of events) {
      const messageId = extractMessageId(event);
      const eventType = getBrevoEventType(event.event || event.type);
      const config = EVENT_CONFIG[eventType];

      if (!messageId || !config) {
        unmatched++;
        console.warn("Ignoring unsupported Brevo webhook event", { eventType, messageId });
        continue;
      }

      const idCandidates = Array.from(new Set([messageId, `<${messageId}>`]));
      const { data: campaign, error: campaignError } = await supabase
        .from("email_campaigns")
        .select("id, prospect_id, event_history")
        .in("message_id", idCandidates)
        .maybeSingle();

      if (campaignError || !campaign) {
        unmatched++;
        console.warn(`No campaign found for Brevo message_id: ${messageId}`);
        continue;
      }

      const occurredAt = getEventTimestamp(event);
      const alreadyScored = hasCampaignEvent(campaign.event_history, eventType);
      const eventHistory = appendCampaignEvent(campaign.event_history, {
        event_type: eventType,
        status: config.status,
        message_id: messageId,
        occurred_at: occurredAt,
        link: typeof event.link === "string" ? event.link : null,
        email: typeof event.email === "string" ? event.email : null
      });

      const updates: Record<string, unknown> = {
        status: config.status,
        last_event_at: occurredAt,
        event_history: eventHistory
      };

      if (config.timestampField) {
        updates[config.timestampField] = occurredAt;
      }

      const { error: updateError } = await supabase
        .from("email_campaigns")
        .update(updates)
        .eq("id", campaign.id);

      if (updateError) {
        console.error("Failed to update campaign webhook event", updateError);
        continue;
      }

      if (config.score && !alreadyScored) {
        await updateLeadScore(campaign.prospect_id, config.score);
      }

      if (config.prospectStatus) {
        await supabase
          .from("prospects")
          .update({ status: config.prospectStatus })
          .eq("id", campaign.prospect_id);
      }

      processed++;
    }

    return NextResponse.json({ success: true, processed, unmatched });
  } catch (error) {
    console.error("Brevo webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

