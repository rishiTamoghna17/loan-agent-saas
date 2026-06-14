import "server-only";

import { maskProviderError } from "@/lib/campaign-tracking";

const BREVO_API_URL = "https://api.brevo.com/v3";
const BREVO_ACCOUNT_URL = "https://api.brevo.com/v3/account";

export type BrevoErrorKind =
  | "missing_key"
  | "unauthorized_ip"
  | "invalid_key"
  | "rate_limited"
  | "provider_error"
  | "network_error";

export type BrevoHealth =
  | {
      ok: true;
      checkedAt: string;
      accountEmail: string | null;
      planType: string | null;
    }
  | {
      ok: false;
      checkedAt: string;
      kind: BrevoErrorKind;
      message: string;
      providerError: ReturnType<typeof maskProviderError>;
    };

function getProviderMessage(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const source = value as Record<string, unknown>;
  const message = source.message || source.error;
  return typeof message === "string" ? message : "";
}

export function classifyBrevoError(status: number, value: unknown): { kind: BrevoErrorKind; message: string } {
  const providerMessage = getProviderMessage(value);
  const normalized = providerMessage.toLowerCase();

  if (status === 401 && (normalized.includes("unrecognised ip") || normalized.includes("unauthorized ip"))) {
    return {
      kind: "unauthorized_ip",
      message: "Brevo rejected this Vercel IP. Disable Brevo API-key IP blocking or use a static outbound IP."
    };
  }

  if (status === 401 || status === 403) {
    return {
      kind: "invalid_key",
      message: "Brevo rejected the API credentials. Rotate the API key and update the server-only Vercel environment variable."
    };
  }

  if (status === 429) {
    return {
      kind: "rate_limited",
      message: "Brevo is temporarily rate limiting campaign sends. Wait before retrying."
    };
  }

  return {
    kind: "provider_error",
    message: providerMessage || `Brevo request failed with HTTP ${status}.`
  };
}

export async function getBrevoApiHealth(): Promise<BrevoHealth> {
  const checkedAt = new Date().toISOString();
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    return {
      ok: false,
      checkedAt,
      kind: "missing_key",
      message: "BREVO_API_KEY is not configured.",
      providerError: { message: "Missing BREVO_API_KEY" }
    };
  }

  try {
    const response = await fetch(BREVO_ACCOUNT_URL, {
      headers: {
        accept: "application/json",
        "api-key": apiKey
      },
      cache: "no-store"
    });
    const result = await response.json().catch(() => ({ message: response.statusText }));

    if (!response.ok) {
      const classified = classifyBrevoError(response.status, result);
      return {
        ok: false,
        checkedAt,
        ...classified,
        providerError: maskProviderError({ ...result, status: response.status })
      };
    }

    const source = result && typeof result === "object" ? (result as Record<string, unknown>) : {};
    const plan = Array.isArray(source.plan) ? source.plan[0] : null;
    const planType = plan && typeof plan === "object" && typeof (plan as Record<string, unknown>).type === "string"
      ? String((plan as Record<string, unknown>).type)
      : null;

    return {
      ok: true,
      checkedAt,
      accountEmail: typeof source.email === "string" ? source.email : null,
      planType
    };
  } catch (error) {
    return {
      ok: false,
      checkedAt,
      kind: "network_error",
      message: "LeadHub could not reach Brevo. Check network connectivity and retry.",
      providerError: maskProviderError(error instanceof Error ? { message: error.message } : error)
    };
  }
}

function getApiKey() {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("Missing BREVO_API_KEY in environment variables.");
  }
  return apiKey;
}

export type BrevoEmailPayload = {
  sender: { name: string; email: string };
  to: Array<{ email: string; name?: string }>;
  subject: string;
  htmlContent: string;
  attachment?: Array<{ url: string; name: string } | { content: string; name: string }>;
  tags?: string[];
  headers?: Record<string, string>;
};

export type BrevoWhatsAppPayload = {
  senderNumber: string;
  contactNumbers: string[];
  text: string;
};

export type BrevoWhatsAppCampaignPayload = {
  campaignName: string;
  sender: string;
  content: string;
  recipients: { listIds?: number[]; contactNumbers?: string[] };
  scheduledAt: string;
};

/**
 * Sends a transactional SMTP email using Brevo.
 */
export async function sendBrevoEmail(payload: BrevoEmailPayload) {
  const apiKey = getApiKey();
  
  const response = await fetch(`${BREVO_API_URL}/smtp/email`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("Brevo Email API Error:", data);
    throw new Error(
      `Brevo SMTP Email failed with status ${response.status}: ${
        data?.message || JSON.stringify(data)
      }`
    );
  }

  return data; // Returns { messageId: string }
}

/**
 * Sends a transactional WhatsApp message using Brevo.
 */
export async function sendBrevoWhatsApp(payload: BrevoWhatsAppPayload) {
  const apiKey = getApiKey();

  const response = await fetch(`${BREVO_API_URL}/whatsapp/sendMessage`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("Brevo WhatsApp API Error:", data);
    throw new Error(
      `Brevo WhatsApp Message failed with status ${response.status}: ${
        data?.message || JSON.stringify(data)
      }`
    );
  }

  return data; // Returns { messageId: string } (or { messageIds: string[] })
}

/**
 * Creates and schedules a WhatsApp marketing campaign in Brevo.
 */
export async function createBrevoWhatsAppCampaign(payload: BrevoWhatsAppCampaignPayload) {
  const apiKey = getApiKey();

  const response = await fetch(`${BREVO_API_URL}/whatsapp/campaigns`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("Brevo WhatsApp Campaign API Error:", data);
    throw new Error(
      `Brevo WhatsApp Campaign failed with status ${response.status}: ${
        data?.message || JSON.stringify(data)
      }`
    );
  }

  return data; // Returns { id: number } (campaign ID)
}
