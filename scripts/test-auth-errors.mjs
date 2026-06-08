const EMAIL_RATE_LIMIT_MESSAGE = "Email sending is temporarily limited. Please try again later or contact support.";

function getFriendlyAuthError(error) {
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

assertEqual(
  getFriendlyAuthError({ message: "email rate limit exceeded" }),
  EMAIL_RATE_LIMIT_MESSAGE,
  "maps plain email rate-limit message"
);

assertEqual(
  getFriendlyAuthError({ code: "over_email_send_rate_limit", message: "too many email requests" }),
  EMAIL_RATE_LIMIT_MESSAGE,
  "maps Supabase email rate-limit code"
);

assertEqual(
  getFriendlyAuthError({ message: "User already registered" }),
  "User already registered",
  "preserves ordinary auth errors"
);

console.log("Auth error mapping tests passed.");

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    console.error(`${label}: expected "${expected}", got "${actual}"`);
    process.exit(1);
  }
}
