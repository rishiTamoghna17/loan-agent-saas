import { loadLocalEnv } from "./env.mjs";

loadLocalEnv();

const supabaseAccessToken = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = process.env.SUPABASE_PROJECT_REF || getProjectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const smtpHost = process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com";
const smtpPort = process.env.BREVO_SMTP_PORT || "587";
const smtpUser = process.env.BREVO_SMTP_USERNAME;
const smtpPass = process.env.BREVO_SMTP_PASSWORD;
const senderEmail = process.env.BREVO_SMTP_SENDER_EMAIL;
const senderName = process.env.BREVO_SMTP_SENDER_NAME || "LeadHub";
const appHost = normalizeAppHost(process.env.NEXT_PUBLIC_APP_HOST);

const missing = [];
if (!supabaseAccessToken) missing.push("SUPABASE_ACCESS_TOKEN");
if (!projectRef) missing.push("SUPABASE_PROJECT_REF or NEXT_PUBLIC_SUPABASE_URL");
if (!smtpUser) missing.push("BREVO_SMTP_USERNAME");
if (!smtpPass) missing.push("BREVO_SMTP_PASSWORD");
if (!senderEmail) missing.push("BREVO_SMTP_SENDER_EMAIL");
if (!appHost) missing.push("NEXT_PUBLIC_APP_HOST");

if (missing.length) {
  console.error(`Missing required env values: ${missing.join(", ")}`);
  console.error("Add them to .env.local, then run: npm run configure:smtp");
  process.exit(1);
}

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  method: "PATCH",
  headers: {
    authorization: `Bearer ${supabaseAccessToken}`,
    "content-type": "application/json"
  },
  body: JSON.stringify({
    external_email_enabled: true,
    mailer_autoconfirm: false,
    smtp_host: smtpHost,
    smtp_port: smtpPort,
    smtp_user: smtpUser.trim(),
    smtp_pass: smtpPass,
    smtp_admin_email: senderEmail.trim(),
    smtp_sender_name: senderName.trim(),
    site_url: appHost,
    uri_allow_list: [
      `${appHost}/auth/confirm`,
      `${appHost}/auth/confirm?next=/dashboard`,
      `${appHost}/auth/callback`,
      `${appHost}/auth/callback?next=/reset-password`,
      "http://localhost:3000/auth/confirm",
      "http://localhost:3000/auth/callback",
      "http://localhost:3001/auth/confirm",
      "http://localhost:3001/auth/callback"
    ].join(",")
  })
});

if (!response.ok) {
  const body = await response.text();
  console.error(`Supabase SMTP configuration failed with HTTP ${response.status}.`);
  console.error(body);
  process.exit(1);
}

console.log("Supabase Auth SMTP configuration updated.");
console.log(`Project ref: ${projectRef}`);
console.log(`SMTP host: ${smtpHost}`);
console.log(`SMTP port: ${smtpPort}`);
console.log(`SMTP user: ${smtpUser.trim()}`);
console.log(`Sender email: ${senderEmail.trim()}`);
console.log(`Sender name: ${senderName.trim()}`);
console.log(`Auth site URL: ${appHost}`);
console.log(`Confirmation redirect: ${appHost}/auth/confirm?next=/dashboard`);
console.log("SMTP password was sent but not printed.");

function getProjectRefFromUrl(value) {
  if (!value) return "";

  try {
    return new URL(value).hostname.split(".")[0] || "";
  } catch {
    return "";
  }
}

function normalizeAppHost(value) {
  if (!value) return "";
  const normalized = value.trim().replace(/\/$/, "");
  return normalized.startsWith("http://") || normalized.startsWith("https://")
    ? normalized
    : `https://${normalized}`;
}
