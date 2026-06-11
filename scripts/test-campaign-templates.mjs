import { createRequire } from "module";
import { readFileSync } from "fs";
import path from "path";
import ts from "typescript";
import { loadLocalEnv } from "./env.mjs";

loadLocalEnv();

const require = createRequire(import.meta.url);

function loadTsModule(relativePath) {
  const absolutePath = path.join(process.cwd(), relativePath);
  const source = readFileSync(absolutePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true
    }
  }).outputText;
  const mod = { exports: {} };
  const fn = new Function("require", "module", "exports", "__dirname", "__filename", output);
  fn(require, mod, mod.exports, path.dirname(absolutePath), absolutePath);
  return mod.exports;
}

const templates = loadTsModule("src/lib/campaign-templates.ts");
const tracking = loadTsModule("src/lib/campaign-tracking.ts");
const attachments = loadTsModule("src/lib/campaign-attachments.ts");

const baseUrl = tracking.getCampaignBaseUrl();
const links = tracking.buildCampaignLinks("template-test-prospect");
const context = templates.createCampaignRenderContext({
  prospect: {
    id: "template-test-prospect",
    name: "Rahul Sharma",
    company_name: "Rahul Loans",
    city: "Mumbai",
    loan_category: "Home Loan"
  },
  demoUrl: links.demoUrl,
  signupUrl: links.signupUrl,
  senderName: "Tamoghna Mondal",
  senderPhone: "7001586476",
  senderEmail: "tamoghna171099@gmail.com"
});

const templateSamples = [
  {
    id: "introduction",
    subject: "A professional website for {{company_name}}",
    content: "Hi {{name}},\n\nSee your demo: {{demo_url}}\n\nStart your trial: {{signup_url}}"
  },
  {
    id: "demo_invitation",
    subject: "Your LeadHub demo for {{city}}",
    content: "Hi {{name}},\n\nOpen the demo: {{demo_url}}\n\nCreate an account: {{signup_url}}"
  },
  {
    id: "trial_reminder",
    subject: "Start your LeadHub trial",
    content: "Hi {{name}},\n\nReview LeadHub: {{demo_url}}\n\nStart here: {{signup_url}}"
  },
  {
    id: "follow_up",
    subject: "Following up with {{company_name}}",
    content: "Hi {{name}},\n\nDemo: {{demo_url}}\n\nSignup: {{signup_url}}"
  }
];

for (const template of templateSamples) {
  const rendered = templates.renderCampaignTemplate(template, context);
  const combined = `${rendered.subject}\n${rendered.htmlContent}`;

  if (templates.hasUnresolvedCampaignVariables(combined)) {
    throw new Error(`Template ${template.id} still contains unresolved variables.`);
  }

  if (!rendered.htmlContent.includes(links.demoUrl) || !rendered.htmlContent.includes(links.signupUrl)) {
    throw new Error(`Template ${template.id} does not include rendered campaign links.`);
  }

  if (!links.demoUrl.startsWith(`${baseUrl}/demo?prospect_id=`) || links.signupUrl !== `${baseUrl}/signup`) {
    throw new Error(`Campaign links are not using CAMPAIGN_BASE_URL: ${JSON.stringify(links)}`);
  }
}

const brochure = await attachments.getCampaignBrochureAttachment();
if (attachments.isCampaignBrochureEnabled() && !brochure.metadata.attached) {
  throw new Error(brochure.metadata.warning || "Campaign brochure attachment is enabled but missing.");
}

console.log("CAMPAIGN_TEMPLATE_TEST=ok");
console.log(`TEMPLATE_COUNT=${templateSamples.length}`);
console.log(`CAMPAIGN_BASE_URL=${baseUrl}`);
console.log(`BROCHURE_ATTACHED=${brochure.metadata.attached}`);
if (brochure.metadata.filename) {
  console.log(`BROCHURE_FILENAME=${brochure.metadata.filename}`);
}
