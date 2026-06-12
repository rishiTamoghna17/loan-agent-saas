import type { Json } from "@/lib/database.types";

export const DEFAULT_CAMPAIGN_BASE_URL = "https://leadhub-loan-crm.vercel.app";

export function getCampaignBaseUrl() {
  return (process.env.CAMPAIGN_BASE_URL || process.env.NEXT_PUBLIC_APP_HOST || DEFAULT_CAMPAIGN_BASE_URL).replace(/\/$/, "");
}

export function buildCampaignLinks(prospectId: string) {
  const baseUrl = getCampaignBaseUrl();
  return {
    demoUrl: `${baseUrl}/demo?prospect_id=${encodeURIComponent(prospectId)}`,
    signupUrl: `${baseUrl}/signup`,
    webhookUrl: `${baseUrl}/api/webhooks/brevo`
  };
}

export function normalizeBrevoMessageId(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^<|>$/g, "");
}

export function buildBrevoCampaignTags(campaignId: string, templateId: string) {
  return ["leadhub", `campaign_${campaignId}`, `template_${templateId}`];
}

export function extractBrevoTags(value: unknown) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    // Brevo may send a single tag string rather than JSON.
  }
  return [value];
}

export function extractCampaignIdFromBrevoTags(value: unknown) {
  for (const tag of extractBrevoTags(value)) {
    const match = tag.match(/^campaign_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
    if (match) return match[1];
  }
  return "";
}

export function extractTemplateIdFromBrevoTags(value: unknown) {
  for (const tag of extractBrevoTags(value)) {
    const match = tag.match(/^template_(.+)$/);
    if (match) return match[1];
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tag)) return tag;
  }
  return "";
}

export function getBrevoEventType(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function maskProviderError(value: unknown): Json {
  if (!value || typeof value !== "object") return { message: String(value || "Unknown provider error") };

  const source = value as Record<string, unknown>;
  const safe: Record<string, Json> = {};
  for (const key of ["code", "message", "error", "status", "statusCode"]) {
    const item = source[key];
    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean" || item === null) {
      safe[key] = item;
    }
  }

  return Object.keys(safe).length ? safe : { message: "Provider request failed" };
}

export function appendCampaignEvent(history: unknown, event: Record<string, Json>) {
  const current = Array.isArray(history) ? history : [];
  return [...current, event].slice(-50);
}

export function hasCampaignEvent(history: unknown, eventType: string) {
  if (!Array.isArray(history)) return false;
  return history.some((event) => {
    if (!event || typeof event !== "object") return false;
    return (event as Record<string, unknown>).event_type === eventType;
  });
}
