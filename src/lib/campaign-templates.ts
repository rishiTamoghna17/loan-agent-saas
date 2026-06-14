export type CampaignTemplate = {
  id: string;
  name: string;
  subject: string;
  content: string;
  description?: string;
  brochure_attached?: boolean;
  pdf_url?: string;
  pdf_urls?: string[];
  show_header?: boolean;
  header_content?: string | null;
  header_bg_color?: string | null;
  header_text_color?: string | null;
  footer_content?: string | null;
  footer_bg_color?: string | null;
  footer_text_color?: string | null;
  channel?: 'email' | 'whatsapp' | null;
};

export type CampaignRenderContext = {
  id: string;
  name?: string | null;
  company_name?: string | null;
  city?: string | null;
  loan_category?: string | null;
  demo_url: string;
  signup_url: string;
  sender_name: string;
  sender_phone: string;
  sender_email: string;
};

export const CAMPAIGN_VARIABLES = [
  "{{name}}",
  "{{company_name}}",
  "{{demo_url}}",
  "{{signup_url}}",
  "{{city}}",
  "{{loan_category}}",
  "{{sender_name}}",
  "{{sender_phone}}",
  "{{sender_email}}"
] as const;

export function createCampaignRenderContext(input: {
  prospect: {
    id: string;
    name?: string | null;
    company_name?: string | null;
    city?: string | null;
    loan_category?: string | null;
  };
  demoUrl: string;
  signupUrl: string;
  senderName?: string;
  senderPhone?: string;
  senderEmail?: string;
}): CampaignRenderContext {
  return {
    id: input.prospect.id,
    name: input.prospect.name || "Sir",
    company_name: input.prospect.company_name || "your loan business",
    city: input.prospect.city || "your city",
    loan_category: input.prospect.loan_category || "loan",
    demo_url: input.demoUrl,
    signup_url: input.signupUrl,
    sender_name: input.senderName || "Tamoghna Mondal",
    sender_phone: input.senderPhone || "7001586476",
    sender_email: input.senderEmail || "tamoghna171099@gmail.com"
  };
}

export function createPreviewCampaignContext(): CampaignRenderContext {
  return {
    id: "preview-prospect-id",
    name: "Rahul Sharma",
    company_name: "Rahul Loans",
    city: "Mumbai",
    loan_category: "Home Loan",
    demo_url: "https://example.com/demo?prospect_id=preview-prospect-id",
    signup_url: "https://example.com/signup",
    sender_name: "Tamoghna Mondal",
    sender_phone: "7001586476",
    sender_email: "tamoghna171099@gmail.com"
  };
}

export function renderCampaignString(input: string | undefined | null, context: CampaignRenderContext) {
  const safeInput = input || "";
  const values: Record<string, string> = {
    id: context.id,
    name: context.name || "Sir",
    company_name: context.company_name || "your loan business",
    city: context.city || "your city",
    loan_category: context.loan_category || "loan",
    demo_url: context.demo_url,
    signup_url: context.signup_url,
    sender_name: context.sender_name,
    sender_phone: context.sender_phone,
    sender_email: context.sender_email
  };

  return safeInput.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key: string) => values[key] || "");
}

export function renderCampaignTemplate(
  template: Pick<
    CampaignTemplate, 
    "subject" | "content" | "show_header" | 
    "header_content" | "header_bg_color" | "header_text_color" | 
    "footer_content" | "footer_bg_color" | "footer_text_color"
  >, 
  context: CampaignRenderContext
) {
  const renderedSubject = renderCampaignString(template.subject, context);
  const renderedBody = renderCampaignString(template.content, context);
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(renderedBody);
  const headerContent = renderCampaignString(template.header_content || "LeadHub", context);
  const footerContent = renderCampaignString(template.footer_content || "", context);

  return {
    subject: renderedSubject,
    htmlContent: wrapLeadHubEmail(
      hasHtml ? renderedBody : textToHtml(renderedBody),
      template.show_header ?? true,
      headerContent,
      template.header_bg_color || "#0f63ff",
      template.header_text_color || "#ffffff",
      footerContent,
      template.footer_bg_color || "#f8fafc",
      template.footer_text_color || "#64748b"
    ),
    previewText: stripHtml(renderedBody)
  };
}

export function renderWhatsAppCampaignTemplate(
  template: Pick<CampaignTemplate, "content">,
  context: CampaignRenderContext
) {
  const renderedBody = renderCampaignString(template.content, context);
  return {
    content: stripHtml(renderedBody)
  };
}

export function hasUnresolvedCampaignVariables(value: string | undefined | null) {
  const safeValue = value || "";
  return /\{\{[a-zA-Z0-9_]+\}\}/.test(safeValue);
}

function textToHtml(value: string | undefined | null) {
  const safeValue = value || "";
  return safeValue
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph.trim()).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function stripHtml(value: string | undefined | null) {
  const safeValue = value || "";
  return safeValue
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeHtml(value: string | undefined | null) {
  const safeValue = value || "";
  return safeValue
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function wrapLeadHubEmail(
  content: string,
  showHeader: boolean = true,
  headerContent: string = "LeadHub",
  headerBg: string = "#0f63ff",
  headerText: string = "#ffffff",
  footerContent?: string,
  footerBg: string = "#f8fafc",
  footerText: string = "#64748b"
) {
  return `
    <div style="margin:0;padding:0;background:#f4f8fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;padding:28px 18px;">
        <div style="background:#ffffff;border:1px solid #dbe6f0;border-radius:16px;overflow:hidden;">
          ${showHeader ? `
            <div style="padding:24px 26px;background:${headerBg};color:${headerText};">
              <div style="font-size:22px;font-weight:800;letter-spacing:-0.02em;">${headerContent}</div>
              ${headerContent === "LeadHub" ? `<div style="margin-top:4px;font-size:13px;opacity:0.9;">Loan Website • Lead CRM • Follow-up Tracking</div>` : ""}
            </div>
          ` : ''}
          <div style="padding:26px;font-size:15px;line-height:1.7;color:#334155;">
            ${content}
            ${!footerContent ? `
            <div style="margin-top:24px;padding:16px;border-radius:12px;background:#ecfdf5;border:1px solid #bbf7d0;color:#14532d;">
              <strong>LeadHub helps loan agents look professional online and manage every enquiry from one dashboard.</strong>
            </div>
            ` : ""}
          </div>
          ${footerContent ? `
            <div style="padding:16px 26px;background:${footerBg};border-top:1px solid #e2e8f0;color:${footerText};font-size:12px;text-align:center;">
              ${footerContent}
            </div>
          ` : ""}
        </div>
        ${!footerContent ? `
        <p style="margin:14px 0 0;text-align:center;font-size:12px;color:#64748b;">
          Sent by LeadHub. You received this because your business contact is publicly available or you previously connected with us.
        </p>
        ` : ""}
      </div>
    </div>
  `;
}
