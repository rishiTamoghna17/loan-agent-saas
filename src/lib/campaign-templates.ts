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

export const BUILT_IN_CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: "intro",
    name: "Introduction",
    subject: "Grow your loan business with LeadHub",
    description: "First outreach for DSAs and loan agents who need a website plus CRM.",
    brochure_attached: false,
    show_header: true,
    content: `
      <p>Hi {{name}},</p>
      <p>I work with loan agents and DSAs who want to manage enquiries more professionally.</p>
      <p>Many agents still manage leads through WhatsApp chats, notebooks, and spreadsheets. LeadHub gives you a simple system to capture enquiries, track follow-ups, and contact customers faster.</p>
      <ul>
        <li>Your own loan website</li>
        <li>Lead capture form</li>
        <li>WhatsApp-ready CRM</li>
        <li>Follow-up tracking</li>
        <li>14-day free trial</li>
      </ul>
      <p>You can see the demo here: <a href="{{demo_url}}">Open LeadHub demo</a></p>
      <p>Start your free trial here: <a href="{{signup_url}}">Create your LeadHub account</a></p>
      <p>Regards,<br />{{sender_name}}<br />{{sender_phone}}<br />{{sender_email}}</p>
    `
  },
  {
    id: "demo",
    name: "Demo Invitation",
    subject: "Quick LeadHub demo for your loan enquiries",
    description: "Invite a prospect to open the live demo and see the workflow.",
    brochure_attached: false,
    show_header: true,
    content: `
      <p>Hi {{name}},</p>
      <p>I wanted to share a quick demo of LeadHub for {{company_name}}.</p>
      <p>It shows how a customer can visit your loan website, submit an enquiry, and how you can follow up from one dashboard instead of searching through chats.</p>
      <p><a href="{{demo_url}}">View the LeadHub demo</a></p>
      <p>If this looks useful, you can start the 14-day free trial here: <a href="{{signup_url}}">Start free trial</a></p>
      <p>Regards,<br />{{sender_name}}<br />{{sender_phone}}</p>
    `
  },
  {
    id: "trial",
    name: "Trial Reminder",
    subject: "Start your 14-day LeadHub trial",
    description: "Encourage a warm prospect to start the working free trial.",
    brochure_attached: false,
    show_header: true,
    content: `
      <p>Hi {{name}},</p>
      <p>If you are still managing loan enquiries manually, LeadHub can help you keep every lead, note, source, and follow-up in one place.</p>
      <p>Your trial includes a public loan website, lead form, WhatsApp contact buttons, CRM dashboard, source tracking, and CSV export.</p>
      <p>Start your free 14-day trial here: <a href="{{signup_url}}">Create your LeadHub account</a></p>
      <p>You can also check the demo first: <a href="{{demo_url}}">Open demo</a></p>
      <p>Regards,<br />{{sender_name}}<br />{{sender_phone}}<br />{{sender_email}}</p>
    `
  },
  {
    id: "followup",
    name: "Follow-up",
    subject: "Following up on LeadHub for your loan business",
    description: "Gentle follow-up after a prior message or demo share.",
    brochure_attached: false,
    show_header: true,
    content: `
      <p>Hi {{name}},</p>
      <p>Just following up on LeadHub.</p>
      <p>It is built for loan agents and small DSA teams who want a professional website, structured enquiries, and a simple follow-up dashboard.</p>
      <p>If you want, you can review the demo here: <a href="{{demo_url}}">LeadHub demo</a></p>
      <p>Free trial signup: <a href="{{signup_url}}">Start your 14-day trial</a></p>
      <p>Regards,<br />{{sender_name}}<br />{{sender_phone}}</p>
    `
  }
];

export function getBuiltInCampaignTemplate(id: string) {
  return BUILT_IN_CAMPAIGN_TEMPLATES.find((template) => template.id === id);
}

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

export function renderCampaignString(input: string, context: CampaignRenderContext) {
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

  return input.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key: string) => values[key] || "");
}

export function renderCampaignTemplate(template: Pick<CampaignTemplate, "subject" | "content" | "show_header">, context: CampaignRenderContext) {
  const renderedSubject = renderCampaignString(template.subject, context);
  const renderedBody = renderCampaignString(template.content, context);
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(renderedBody);

  return {
    subject: renderedSubject,
    htmlContent: wrapLeadHubEmail(hasHtml ? renderedBody : textToHtml(renderedBody), template.show_header ?? true),
    previewText: stripHtml(renderedBody)
  };
}

export function hasUnresolvedCampaignVariables(value: string) {
  return /\{\{[a-zA-Z0-9_]+\}\}/.test(value);
}

function textToHtml(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph.trim()).replace(/\n/g, "<br />")}</p>`)
    .join("");
}

function stripHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function wrapLeadHubEmail(content: string, showHeader: boolean = true) {
  return `
    <div style="margin:0;padding:0;background:#f4f8fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;padding:28px 18px;">
        <div style="background:#ffffff;border:1px solid #dbe6f0;border-radius:16px;overflow:hidden;">
          ${showHeader ? `
            <div style="padding:24px 26px;background:#0f63ff;color:#ffffff;">
              <div style="font-size:22px;font-weight:800;letter-spacing:-0.02em;">LeadHub</div>
              <div style="margin-top:4px;font-size:13px;opacity:0.9;">Loan Website • Lead CRM • Follow-up Tracking</div>
            </div>
          ` : ''}
          <div style="padding:26px;font-size:15px;line-height:1.7;color:#334155;">
            ${content}
            <div style="margin-top:24px;padding:16px;border-radius:12px;background:#ecfdf5;border:1px solid #bbf7d0;color:#14532d;">
              <strong>LeadHub helps loan agents look professional online and manage every enquiry from one dashboard.</strong>
            </div>
          </div>
        </div>
        <p style="margin:14px 0 0;text-align:center;font-size:12px;color:#64748b;">
          Sent by LeadHub. You received this because your business contact is publicly available or you previously connected with us.
        </p>
      </div>
    </div>
  `;
}
