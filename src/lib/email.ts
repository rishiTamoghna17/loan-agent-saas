import nodemailer from "nodemailer";
import { formatCurrency } from "./format";

type LeadNotification = {
  agentEmail: string;
  agentName: string;
  businessName: string;
  leadName: string;
  phone: string;
  loanType: string;
  amount: number;
  source: string;
  city: string;
  dashboardUrl: string;
};

type OverdueDigestInput = {
  agentEmail: string;
  agentName: string;
  businessName: string;
  dashboardUrl: string;
  timezone: string;
  followUps: Array<{ leadName: string; phone: string; loanType: string; dueAt: string; note?: string | null }>;
};

function getTransporter() {
  const host = process.env.BREVO_SMTP_HOST;
  const port = Number(process.env.BREVO_SMTP_PORT || 587);
  const user = process.env.BREVO_SMTP_USERNAME;
  const pass = process.env.BREVO_SMTP_PASSWORD;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}

async function sendBrevoEmail(message: {
  to: { email: string; name?: string };
  subject: string;
  text: string;
  html: string;
}) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SMTP_SENDER_EMAIL;
  const senderName = process.env.BREVO_SMTP_SENDER_NAME || "LeadHub";

  if (apiKey && senderEmail) {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [message.to],
        subject: message.subject,
        textContent: message.text,
        htmlContent: message.html,
        tags: ["leadhub-agent-notification"]
      }),
      cache: "no-store"
    });
    const result = await response.json().catch(() => ({ message: response.statusText }));
    if (!response.ok) {
      const providerMessage = result && typeof result === "object" && "message" in result
        ? String(result.message)
        : response.statusText;
      throw new Error(`Brevo API request failed (${response.status}): ${providerMessage}`);
    }
    return { messageId: typeof result.messageId === "string" ? result.messageId : null };
  }

  const transporter = getTransporter();
  if (!transporter || !senderEmail) throw new Error("Brevo API and SMTP are not configured.");
  const result = await transporter.sendMail({
    from: `"${senderName}" <${senderEmail}>`,
    to: message.to.email,
    subject: message.subject,
    text: message.text,
    html: message.html
  });
  return { messageId: result.messageId || null };
}

export async function sendNewLeadEmail(input: LeadNotification) {
  const subject = `New Lead Received - ${input.leadName}`;
  const text = [
    "New Lead Received",
    "",
    `Name: ${input.leadName}`,
    `Phone: ${input.phone}`,
    `Loan Type: ${input.loanType}`,
    `Amount: ${formatCurrency(input.amount)}`,
    `Source: ${input.source}`,
    `City: ${input.city}`,
    "",
    `Open dashboard: ${input.dashboardUrl}`
  ].join("\n");

  await sendBrevoEmail({
    to: { email: input.agentEmail, name: input.agentName },
    subject,
    text,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2 style="margin:0 0 12px">New Lead Received</h2>
        <p style="margin:0 0 16px;color:#475569">A new enquiry was submitted for ${escapeHtml(input.businessName)}.</p>
        <table style="border-collapse:collapse;width:100%;max-width:520px">
          ${row("Name", input.leadName)}
          ${row("Phone", input.phone)}
          ${row("Loan Type", input.loanType)}
          ${row("Amount", formatCurrency(input.amount))}
          ${row("Source", input.source)}
          ${row("City", input.city)}
        </table>
        <p style="margin-top:20px">
          <a href="${input.dashboardUrl}" style="background:#1769ff;color:#fff;padding:11px 16px;border-radius:8px;text-decoration:none;font-weight:700">Open LeadHub dashboard</a>
        </p>
      </div>
    `
  });
}

export async function sendOverdueFollowUpDigest(input: OverdueDigestInput) {
  const items = input.followUps.map((item) => `
    <tr>
      <td style="border:1px solid #dbe6f3;padding:10px">${escapeHtml(item.leadName)}</td>
      <td style="border:1px solid #dbe6f3;padding:10px">${escapeHtml(item.phone)}</td>
      <td style="border:1px solid #dbe6f3;padding:10px">${escapeHtml(item.loanType)}</td>
      <td style="border:1px solid #dbe6f3;padding:10px">${escapeHtml(new Intl.DateTimeFormat("en-IN", { timeZone: input.timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date(item.dueAt)))}</td>
    </tr>
  `).join("");

  return sendBrevoEmail({
    to: { email: input.agentEmail, name: input.agentName },
    subject: `${input.followUps.length} overdue follow-up${input.followUps.length === 1 ? "" : "s"} - LeadHub`,
    text: `Hi ${input.agentName},\n\nYou have ${input.followUps.length} overdue follow-ups. Open your dashboard: ${input.dashboardUrl}`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2 style="margin:0 0 8px">Overdue follow-ups</h2>
        <p style="color:#475569">Hi ${escapeHtml(input.agentName)}, ${escapeHtml(input.businessName)} has ${input.followUps.length} follow-up${input.followUps.length === 1 ? "" : "s"} requiring attention.</p>
        <table style="border-collapse:collapse;width:100%;max-width:720px">
          <tr style="background:#f8fafc"><th style="padding:10px;text-align:left">Lead</th><th style="padding:10px;text-align:left">Phone</th><th style="padding:10px;text-align:left">Loan</th><th style="padding:10px;text-align:left">Due</th></tr>
          ${items}
        </table>
        <p style="margin-top:20px"><a href="${input.dashboardUrl}" style="background:#1769ff;color:#fff;padding:11px 16px;border-radius:8px;text-decoration:none;font-weight:700">Open LeadHub dashboard</a></p>
      </div>
    `
  });
}

function row(label: string, value: string) {
  return `
    <tr>
      <td style="border:1px solid #dbe6f3;padding:10px;background:#f8fafc;font-weight:700">${escapeHtml(label)}</td>
      <td style="border:1px solid #dbe6f3;padding:10px">${escapeHtml(value)}</td>
    </tr>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
