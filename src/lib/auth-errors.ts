const EMAIL_RATE_LIMIT_MESSAGE = "Email sending is temporarily limited. Please try again later or contact support.";

export function getFriendlyAuthError(error: { message?: string; code?: string } | null | undefined) {
  if (!error) return "Something went wrong. Please try again.";

  const message = error.message ?? "";
  const code = error.code ?? "";
  const normalized = `${code} ${message}`.toLowerCase();

  if (
    normalized.includes("email rate limit exceeded") ||
    normalized.includes("over_email_send_rate_limit") ||
    normalized.includes("rate limit")
  ) {
    return EMAIL_RATE_LIMIT_MESSAGE;
  }

  return message || "Something went wrong. Please try again.";
}
