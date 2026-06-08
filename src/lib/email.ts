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

export async function sendNewLeadEmail(input: LeadNotification) {
  const transporter = getTransporter();
  const senderEmail = process.env.BREVO_SMTP_SENDER_EMAIL;
  const senderName = process.env.BREVO_SMTP_SENDER_NAME || "LeadHub";

  if (!transporter || !senderEmail) {
    console.warn("Lead notification email skipped: SMTP env is not configured.");
    return;
  }

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

  await transporter.sendMail({
    from: `"${senderName}" <${senderEmail}>`,
    to: input.agentEmail,
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
