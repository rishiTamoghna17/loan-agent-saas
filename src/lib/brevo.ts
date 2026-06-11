import "server-only";

import { maskProviderError } from "@/lib/campaign-tracking";

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
