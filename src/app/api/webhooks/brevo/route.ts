import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  appendCampaignEvent,
  extractCampaignIdFromBrevoTags,
  extractTemplateIdFromBrevoTags,
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
  if (!secret) return false;

  const url = new URL(req.url);
  const supplied =
    req.headers.get("x-brevo-webhook-secret") ||
    req.headers.get("x-webhook-secret") ||
    url.searchParams.get("secret");

  if (!supplied) return false;

  const expected = Buffer.from(secret);
  const actual = Buffer.from(supplied);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
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

function sanitizeWebhookPayload(event: BrevoWebhookEvent) {
  const safe: Record<string, unknown> = {};
  for (const key of ["event", "type", "message-id", "messageId", "message_id", "email", "link", "ts", "date", "timestamp", "tag", "tags"]) {
    const value = event[key];
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
      safe[key] = typeof value === "string" ? value.slice(0, 2000) : value;
    }
  }
  return safe;
}

async function recordWebhookEvent(
  supabase: ReturnType<typeof createAdminClient>,
  event: BrevoWebhookEvent,
  details: {
    eventType?: string;
    messageId?: string;
    campaignId?: string;
    prospectId?: string;
    processingStatus: "processed" | "duplicate" | "unmatched" | "unsupported" | "failed";
    unmatchedReason?: string;
  }
) {
  const { error } = await supabase.from("email_webhook_events").insert({
    provider: "brevo",
    event_type: details.eventType || null,
    message_id: details.messageId || null,
    recipient_email: typeof event.email === "string" ? event.email.slice(0, 320) : null,
    campaign_id: details.campaignId || null,
    prospect_id: details.prospectId || null,
    processing_status: details.processingStatus,
    unmatched_reason: details.unmatchedReason || null,
    sanitized_payload: sanitizeWebhookPayload(event)
  });

  if (error) {
    console.error("Failed to record Brevo webhook audit event", error);
  }
}

export async function POST(req: Request) {
  const supabase = createAdminClient();

  if (!webhookAuthorized(req)) {
    await recordWebhookEvent(supabase, {}, {
      processingStatus: "failed",
      unmatchedReason: "Unauthorized webhook request"
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await req.json();
    const events: BrevoWebhookEvent[] = Array.isArray(payload) ? payload : [payload];
    let processed = 0;
    let unmatched = 0;

    for (const event of events) {
      const messageId = extractMessageId(event);
      const eventType = getBrevoEventType(event.event || event.type);
      const config = EVENT_CONFIG[eventType];

      if (!messageId || !config) {
        unmatched++;
        console.warn("Ignoring unsupported Brevo webhook event", { eventType, messageId });
        await recordWebhookEvent(supabase, event, {
          eventType,
          messageId,
          processingStatus: "unsupported",
          unmatchedReason: !messageId ? "Missing message ID" : "Unsupported event type"
        });
        continue;
      }

      const occurredAt = getEventTimestamp(event);
      const tagValue = event.tag || event.tags;
      const taggedCampaignId = extractCampaignIdFromBrevoTags(tagValue);
      const templateId = extractTemplateIdFromBrevoTags(tagValue);
      const idCandidates = Array.from(new Set([messageId, `<${messageId}>`]));
      let matchStrategy = "message_id";
      let campaignError: { message: string } | null = null;
      let campaign: { id: string; prospect_id: string; event_history: unknown } | null = null;

      const exactResult = await supabase
        .from("email_campaigns")
        .select("id, prospect_id, event_history")
        .in("message_id", idCandidates)
        .maybeSingle();
      campaign = exactResult.data;
      campaignError = exactResult.error;

      if (!campaign && taggedCampaignId) {
        const taggedResult = await supabase
          .from("email_campaigns")
          .select("id, prospect_id, event_history")
          .eq("id", taggedCampaignId)
          .maybeSingle();
        campaign = taggedResult.data;
        campaignError = taggedResult.error;
        matchStrategy = "campaign_tag";
      }

      if (!campaign && typeof event.email === "string" && event.email.includes("@")) {
        const eventTime = new Date(occurredAt).getTime();
        const from = new Date(eventTime - 48 * 60 * 60 * 1000).toISOString();
        let fallbackQuery = supabase
          .from("email_campaigns")
          .select("id, prospect_id, event_history, email_sent_at, template_id, prospects!inner(email)")
          .ilike("prospects.email", event.email.trim())
          .not("email_sent_at", "is", null)
          .gte("email_sent_at", from)
          .lte("email_sent_at", occurredAt)
          .order("email_sent_at", { ascending: false })
          .limit(2);
        if (templateId) fallbackQuery = fallbackQuery.eq("template_id", templateId);
        const fallbackResult = await fallbackQuery;
        if (!fallbackResult.error && fallbackResult.data?.length === 1) {
          campaign = fallbackResult.data[0];
          campaignError = null;
          matchStrategy = "unique_recipient_window";
        }
      }

      if (campaignError || !campaign) {
        unmatched++;
        console.warn(`No campaign found for Brevo message_id: ${messageId}`);
        await recordWebhookEvent(supabase, event, {
          eventType,
          messageId,
          processingStatus: "unmatched",
          unmatchedReason: campaignError?.message || "No campaign matched the Brevo message ID"
        });
        continue;
      }

      const alreadyScored = hasCampaignEvent(campaign.event_history, eventType);
      const eventHistory = appendCampaignEvent(campaign.event_history, {
        event_type: eventType,
        status: config.status,
        message_id: messageId,
        occurred_at: occurredAt,
        link: typeof event.link === "string" ? event.link : null,
        email: typeof event.email === "string" ? event.email : null,
        matched_by: matchStrategy
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
        await recordWebhookEvent(supabase, event, {
          eventType,
          messageId,
          campaignId: campaign.id,
          prospectId: campaign.prospect_id,
          processingStatus: "failed",
          unmatchedReason: updateError.message
        });
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

      await recordWebhookEvent(supabase, event, {
        eventType,
        messageId,
        campaignId: campaign.id,
        prospectId: campaign.prospect_id,
        processingStatus: alreadyScored ? "duplicate" : "processed"
      });
      processed++;
    }

    return NextResponse.json({ success: true, processed, unmatched });
  } catch (error) {
    console.error("Brevo webhook error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
