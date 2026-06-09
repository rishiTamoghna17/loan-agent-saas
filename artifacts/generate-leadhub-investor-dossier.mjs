import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("/Users/tamoghna/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const screenshotDir = path.join(root, "artifacts", "leadhub-investor-screenshots");
const htmlPath = path.join(root, "artifacts", "LeadHub-Investor-Product-Dossier.html");
const pdfPath = path.join(root, "artifacts", "LeadHub-Investor-Product-Dossier.pdf");
const baseUrl = "https://leadhub-loan-crm.vercel.app";

await fs.mkdir(screenshotDir, { recursive: true });

let browser;
try {
  browser = await launchChrome();
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
  const page = await desktop.newPage();

  await capture(page, "homepage", `${baseUrl}/`, { fullPage: true });
  await capture(page, "signup", `${baseUrl}/signup`, { fullPage: true });
  await capture(page, "login", `${baseUrl}/login`, { fullPage: true });
  await capture(page, "public-agent", `${baseUrl}/agent/test-crm`, { fullPage: true, sanitizePublic: true });

  await capturePreview(page, "dashboard", dashboardPreview());
  await capturePreview(page, "crm-detail", crmDetailPreview());
  await capturePreview(page, "profile-branding", profilePreview());
  await capturePreview(page, "trial-controls", trialPreview());
  await desktop.close();

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true
  });
  const mobilePage = await mobile.newPage();
  await capture(mobilePage, "mobile-agent", `${baseUrl}/agent/test-crm`, { fullPage: true, sanitizePublic: true });
  await mobile.close();

  const html = await buildDossier();
  await fs.writeFile(htmlPath, html);

  const pdfContext = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const pdfPage = await pdfContext.newPage();
  await pdfPage.setContent(html, { waitUntil: "networkidle" });
  await pdfPage.pdf({
    path: pdfPath,
    format: "A4",
    landscape: true,
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
    preferCSSPageSize: true
  });
  await pdfContext.close();

  console.log(JSON.stringify({ htmlPath, pdfPath, screenshotDir }, null, 2));
} finally {
  await browser?.close();
}

async function launchChrome() {
  const executablePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  try {
    await fs.access(executablePath);
    return chromium.launch({ executablePath, headless: true });
  } catch {
    return chromium.launch({ headless: true });
  }
}

async function capture(page, name, url, options = {}) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 90_000 });
  if (options.sanitizePublic) await sanitizePublicPage(page);
  const { sanitizePublic, ...screenshotOptions } = options;
  await page.screenshot({ path: path.join(screenshotDir, `${name}.png`), ...screenshotOptions });
}

async function sanitizePublicPage(page) {
  await page.evaluate(() => {
    const replacements = [
      [/test crm/gi, "Arora Finance Solutions"],
      [/\brishi\b/gi, "Aarav Arora"],
      [/Council House Street/gi, "Central Business District"],
      [/Kolkata/gi, "Pune"],
      [/West Bengal/gi, "Maharashtra"],
      [/700001/g, "411001"],
      [/7001586476/g, "9876543210"],
      [/police station/gi, "Near City Centre"]
    ];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      let value = walker.currentNode.textContent || "";
      for (const [pattern, replacement] of replacements) value = value.replace(pattern, replacement);
      walker.currentNode.textContent = value;
    }
    document.querySelectorAll("img").forEach((image) => {
      image.style.visibility = "hidden";
      image.parentElement?.setAttribute("style", "background:#1769ff;color:white");
    });
  });
}

async function capturePreview(page, name, html) {
  await page.setContent(previewShell(html), { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(screenshotDir, `${name}.png`), fullPage: true });
}

function dashboardPreview() {
  return `
    ${previewHeader()}
    <main class="preview-wrap">
      <div class="trial">12 days remaining in your free trial.</div>
      <section class="identity">
        <div class="avatar">A</div>
        <div class="grow"><span class="eyebrow">Lead dashboard</span><h1>Arora Finance Solutions</h1><p>Aarav Arora · Pune, Maharashtra · /agent/arora-finance</p></div>
        <button class="secondary">Edit profile</button><button class="primary">View public page</button>
      </section>
      <section class="metrics five">
        ${metric("Total leads", "48")}${metric("New leads", "11")}${metric("Follow-up", "19")}${metric("Closed", "14")}${metric("Rejected", "4")}
      </section>
      <section class="metrics four">
        ${metric("Website visits", "386")}${metric("Lead submissions", "48")}${metric("WhatsApp clicks", "91")}${metric("Conversion", "12%")}
      </section>
      <section class="reminder"><strong>Follow-up pending</strong><span>Priya Mehta · Home Loan</span><span>Rohan Das · Business Loan</span><span>Neha Kapoor · Car Loan</span></section>
      ${leadTable(false)}
    </main>`;
}

function crmDetailPreview() {
  return `
    ${previewHeader()}
    <main class="preview-wrap">
      <section class="identity compact">
        <div><span class="eyebrow">Lead operations</span><h1>Every enquiry becomes an actionable workflow</h1><p>Source tracking, status management, notes, WhatsApp follow-up, and portable CSV export.</p></div>
        <button class="secondary">⇩ Export CSV</button>
      </section>
      ${leadTable(true)}
    </main>`;
}

function profilePreview() {
  const services = ["Personal Loan", "Business Loan", "Home Loan", "Loan Against Property", "Gold Loan", "Car Loan", "Education Loan", "MSME Loan", "Credit Card"];
  return `
    ${previewHeader()}
    <main class="preview-wrap">
      <section class="identity compact"><div><span class="eyebrow">Agent profile</span><h1>Brand and publish without technical work</h1><p>Business details update the public website and lead experience.</p></div><button class="primary">Save profile</button></section>
      <section class="profile-grid">
        <div class="panel"><h2>Business identity</h2><div class="form-grid">${field("Business name", "Arora Finance Solutions")}${field("Agent name", "Aarav Arora")}${field("Phone & WhatsApp", "98765 43210")}${field("Public slug", "arora-finance")}${field("Pincode", "411001")}${field("City / District", "Pune, Pune")}</div></div>
        <div class="panel"><h2>Agent branding</h2><div class="brand-preview"><div class="logo">AF</div><div><strong>Need a Home Loan?</strong><p>Get approval assistance today.</p></div></div><div class="form-grid">${field("Primary color", "#1769FF")}${field("Custom domain", "arorafinance.in · pending")}${field("Hero title", "Need a Home Loan?")}${field("Banner image", "Uploaded")}</div></div>
      </section>
      <section class="panel service-panel"><h2>Services offered</h2><div class="chips">${services.map((x) => `<span>✓ ${x}</span>`).join("")}</div></section>
    </main>`;
}

function trialPreview() {
  return `
    ${previewHeader()}
    <main class="preview-wrap">
      <section class="identity compact"><div><span class="eyebrow">Lifecycle controls</span><h1>Trial conversion and account protection</h1><p>Agents experience the complete product before activation while expired accounts become read-only.</p></div></section>
      <section class="state-grid">
        <div class="panel"><div class="state active">Active trial</div><h2>12 days remaining</h2><p>Full dashboard, public page, lead capture, analytics, branding, notes, and follow-up actions.</p><div class="mini-metrics">${metric("Leads", "16")}${metric("Visits", "128")}${metric("Conversion", "13%")}</div></div>
        <div class="panel expired"><div class="state locked">Expired trial</div><h2>CRM remains visible, actions lock</h2><p>Lead history remains available while profile edits, lead mutations, and new lead capture are disabled until support reactivates the account.</p><div class="support"><strong>Contact LeadHub support</strong><span>7001586476</span><span>tamoghna171099@gmail.com</span></div></div>
      </section>
      <section class="email-panel"><div class="mail-icon">✉</div><div><span class="eyebrow">Automated email notification</span><h2>New Lead Received</h2><p>Agent receives name, phone, loan type, amount, source, and a direct dashboard link through Brevo SMTP.</p></div><button class="primary">Contact Lead</button></section>
    </main>`;
}

function previewHeader() {
  return `<header class="preview-header"><div class="preview-brand"><div class="mark">H</div><div><strong>LeadHub</strong><span>Lead Generation · CRM · Follow-up · Conversion</span></div></div><nav><button>Leads</button><button>Profile</button><button>Logout</button></nav></header>`;
}

function metric(label, value) {
  return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`;
}

function field(label, value) {
  return `<div class="field"><span>${label}</span><strong>${value}</strong></div>`;
}

function leadTable(detailed) {
  const rows = [
    ["Priya Mehta", "98765 12001", "Home Loan", "₹25,00,000", "Google", "Follow-up"],
    ["Rohan Das", "98765 12002", "Business Loan", "₹8,00,000", "Referral", "New"],
    ["Neha Kapoor", "98765 12003", "Car Loan", "₹12,00,000", "Instagram", "Closed"]
  ];
  return `<section class="table-panel"><div class="table-title"><h2>${detailed ? "Lead workflow" : "Recent leads"}</h2>${detailed ? "<button class='secondary'>⇩ Export CSV</button>" : ""}</div><table><thead><tr><th>Name</th><th>Phone</th><th>Loan type</th><th>Amount</th><th>Source</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.map((row, i) => `<tr>${row.map((cell, j) => `<td>${j === 0 ? `<strong>${cell}</strong><small>${["Needs eligibility guidance", "Requested callback tomorrow", "Documents submitted"][i]}</small>` : cell}</td>`).join("")}<td><div class="actions"><button class="whatsapp">Contact Lead</button><button>Delete</button>${detailed ? `<input placeholder="Add note" value="${["Called; documents pending", "Follow up Wednesday", "Application submitted"][i]}" />` : ""}</div></td></tr>`).join("")}</tbody></table></section>`;
}

function previewShell(body) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;background:#f6f9fd;color:#0f172a;font-family:Inter,Arial,sans-serif}.preview-header{height:72px;background:white;border-bottom:1px solid #dbe5f0;padding:0 58px;display:flex;align-items:center;justify-content:space-between}.preview-brand{display:flex;align-items:center;gap:11px}.preview-brand strong,.preview-brand span{display:block}.preview-brand span{font-size:11px;color:#64748b}.mark{width:36px;height:36px;border-radius:8px;background:#1769ff;color:white;display:grid;place-items:center;font-weight:900}nav{display:flex;gap:8px}button{border:1px solid #d8e2ed;border-radius:7px;background:white;padding:9px 13px;font-weight:700;color:#0f172a}.primary{background:#1769ff;color:white;border-color:#1769ff}.secondary{background:white}.preview-wrap{max-width:1260px;margin:auto;padding:26px 24px 55px}.trial{padding:12px 16px;background:#eaf3ff;border:1px solid #cfe2ff;color:#1769ff;border-radius:8px;font-size:13px;font-weight:700;margin-bottom:14px}.identity{display:flex;align-items:center;gap:15px;background:white;border:1px solid #dbe5f0;border-radius:10px;padding:20px;box-shadow:0 14px 32px #0f172a0c}.identity.compact{justify-content:space-between}.grow{flex:1}.avatar{width:54px;height:54px;border-radius:9px;background:#1769ff;color:white;display:grid;place-items:center;font-size:24px;font-weight:900}.eyebrow{color:#1769ff;text-transform:uppercase;font-size:11px;font-weight:900;letter-spacing:.08em}h1{font-size:25px;margin:4px 0}h2{font-size:18px;margin:0 0 12px}p{margin:3px 0;color:#64748b;font-size:13px;line-height:1.55}.metrics{display:grid;gap:12px;margin-top:14px}.metrics.five{grid-template-columns:repeat(5,1fr)}.metrics.four{grid-template-columns:repeat(4,1fr)}.metric{background:white;border:1px solid #dbe5f0;border-radius:9px;padding:16px}.metric span{display:block;color:#64748b;font-size:12px;font-weight:700}.metric strong{display:block;font-size:26px;margin-top:8px}.reminder{display:flex;gap:12px;align-items:center;margin-top:14px;background:#fff8e7;border:1px solid #f4d78e;border-radius:9px;padding:14px;color:#854d0e}.reminder span{background:white;border:1px solid #f4d78e;border-radius:6px;padding:8px 10px;font-size:12px}.table-panel,.panel,.email-panel{margin-top:16px;background:white;border:1px solid #dbe5f0;border-radius:10px;overflow:hidden;box-shadow:0 14px 32px #0f172a0c}.table-title{display:flex;justify-content:space-between;align-items:center;padding:16px;border-bottom:1px solid #dbe5f0}.table-title h2{margin:0}table{width:100%;border-collapse:collapse;font-size:12px}th{text-align:left;background:#f8fafc;color:#64748b;text-transform:uppercase;padding:11px}td{padding:13px 11px;border-top:1px solid #edf2f7;vertical-align:top}small{display:block;color:#64748b;margin-top:4px}.actions{display:flex;gap:6px;flex-wrap:wrap}.actions button{font-size:11px;padding:7px}.actions input{width:190px;border:1px solid #dbe5f0;border-radius:6px;padding:7px;font-size:11px}.whatsapp{background:#10b981;color:white;border-color:#10b981}.profile-grid,.state-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.panel{padding:20px;overflow:visible}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.field{border:1px solid #dbe5f0;border-radius:7px;padding:11px}.field span{display:block;color:#64748b;font-size:10px}.field strong{display:block;margin-top:4px;font-size:12px}.brand-preview{display:flex;align-items:center;gap:12px;background:#f8fbff;border:1px solid #dbe5f0;border-radius:8px;padding:13px;margin-bottom:12px}.logo{width:44px;height:44px;border-radius:8px;background:#1769ff;color:white;display:grid;place-items:center;font-weight:900}.service-panel{margin-top:16px}.chips{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.chips span{background:#f8fbff;border:1px solid #dbe5f0;border-radius:6px;padding:9px;font-size:11px;font-weight:700}.state{display:inline-block;padding:6px 9px;border-radius:99px;font-size:11px;font-weight:900;margin-bottom:12px}.state.active{background:#e8faf1;color:#047857}.state.locked{background:#feecec;color:#b91c1c}.expired{border-color:#fecaca;background:#fffafa}.mini-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:15px}.support{margin-top:15px;background:white;border:1px solid #fecaca;border-radius:7px;padding:12px}.support span,.support strong{display:block;font-size:12px;margin-top:4px}.email-panel{padding:20px;display:flex;align-items:center;gap:18px}.email-panel div:nth-child(2){flex:1}.mail-icon{width:52px;height:52px;border-radius:10px;background:#eaf3ff;color:#1769ff;display:grid;place-items:center;font-size:24px}
  </style></head><body>${body}</body></html>`;
}

async function imageData(name) {
  const bytes = await fs.readFile(path.join(screenshotDir, `${name}.png`));
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

async function buildDossier() {
  const images = {};
  for (const name of ["homepage", "signup", "login", "public-agent", "mobile-agent", "dashboard", "crm-detail", "profile-branding", "trial-controls"]) {
    images[name] = await imageData(name);
  }
  const date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  return `<!doctype html><html><head><meta charset="utf-8"><title>LeadHub Investor Product Dossier</title><style>${dossierCss()}</style></head><body>
    ${cover(date)}
    ${textPage("02", "The operating gap", "Independent loan agents need more than a digital brochure.", `<div class="problem-grid">${problem("Fragmented lead intake","Enquiries arrive through calls, WhatsApp, referrals, and forms without one reliable system.")}${problem("Slow follow-up","Without reminders and a usable CRM, high-intent borrowers can go cold.")}${problem("Limited digital identity","Agents need branded, mobile-first pages that communicate trust and services clearly.")}${problem("Low visibility","Without source and conversion analytics, agents cannot see what is generating demand.")}</div><div class="statement">LeadHub connects the full path from public discovery to organised follow-up and conversion.</div>`)}
    ${flowPage()}
    ${capabilitiesPage()}
    ${screenshotPage("05","Public product entry point","A clear SaaS proposition for loan agents",images.homepage,"LeadHub positions the platform around lead generation, CRM, follow-up, and conversion.")}
    ${screenshotPage("06","Agent onboarding","Business identity and website setup in one flow",images.signup,"Signup collects authentication, branding, logo, address, services, and public-page configuration.")}
    ${screenshotPage("07","Secure authentication","Protected access to each agent workspace",images.login,"Supabase email/password authentication protects dashboard routes and tenant-owned data.")}
    ${screenshotPage("08","Branded public website","Each agent receives a configurable lead-generation page",images["public-agent"],"Loan services, agent identity, WhatsApp CTA, EMI tools, contact details, and lead capture work together.")}
    ${mobilePage(images["mobile-agent"])}
    ${featureDetailPage()}
    ${screenshotPage("11","Profile and brand controls","Agents configure their identity without engineering support",images["profile-branding"],"Brand color, hero copy, logo, services, location, slug, and custom-domain groundwork are managed in one profile.")}
    ${screenshotPage("12","Lead dashboard","Operational visibility from one workspace",images.dashboard,"Lead pipeline counts, analytics, follow-up reminders, recent enquiries, and trial state appear together.")}
    ${screenshotPage("13","CRM workflow","Every lead stays actionable and portable",images["crm-detail"],"Agents track source, update status, add notes, contact borrowers through WhatsApp, and export data to CSV.")}
    ${analyticsPage()}
    ${screenshotPage("15","Notifications and lifecycle","Designed for activation, retention, and support",images["trial-controls"],"Brevo email notifications surface new leads while trial controls protect premium access and data continuity.")}
    ${architecturePage()}
    ${roadmapPage()}
    ${closingPage()}
  </body></html>`;
}

function cover(date) {
  return `<section class="page cover"><div class="topline"><span>Investor Product Dossier</span><span>${date}</span></div><div class="cover-body"><div class="brand-lockup"><div class="big-mark">H</div><div><h1>LeadHub</h1><p>Lead Generation · CRM · Follow-up · Conversion</p></div></div><h2>Infrastructure for the independent loan-agent economy</h2><p class="lead">A production-ready, multi-tenant SaaS that gives each loan agent a branded public website, secure CRM, lead intelligence, and conversion workflow.</p><div class="cover-chips"><span>Live on Vercel</span><span>Supabase RLS</span><span>Brevo SMTP</span><span>Mobile-first</span></div></div><div class="page-number">01</div></section>`;
}

function textPage(number, kicker, title, body) {
  return `<section class="page"><header><span>${kicker}</span><strong>LeadHub</strong></header><div class="page-content"><h2>${title}</h2>${body}</div><div class="page-number">${number}</div></section>`;
}

function problem(title, text) {
  return `<div class="problem"><span>●</span><h3>${title}</h3><p>${text}</p></div>`;
}

function flowPage() {
  return textPage("03","Product loop","A closed-loop customer and agent journey",`<div class="flow">${flow("1","Agent launches branded site","Profile inputs publish a mobile-first loan website.")}${arrow()}${flow("2","Borrower submits enquiry","Public lead form captures requirement and source.")}${arrow()}${flow("3","Agent is notified","LeadHub sends email and places the lead in the CRM.")}${arrow()}${flow("4","Agent follows up","WhatsApp, notes, status, reminders, and analytics support conversion.")}</div><div class="outcome-grid"><div><strong>Public acquisition</strong><p>Search, social, referrals, and WhatsApp can point to one credible destination.</p></div><div><strong>Private operations</strong><p>Each authenticated agent sees only their own profile, leads, notes, and analytics.</p></div></div>`);
}

function flow(n, title, text) {
  return `<div class="flow-step"><b>${n}</b><h3>${title}</h3><p>${text}</p></div>`;
}

function arrow() { return `<div class="arrow">→</div>`; }

function capabilitiesPage() {
  const items = [["Public agent sites","Mobile-first branded pages with services, EMI calculator, WhatsApp, and lead form."],["Lead CRM","Statuses, notes, source tracking, WhatsApp contact, deletion, and CSV export."],["Agent branding","Logo upload, primary color, hero copy, banner, location, services, slug, and domain groundwork."],["Growth analytics","Website visits, lead submissions, WhatsApp clicks, conversion percentage, and reminders."],["Lifecycle controls","Free-trial countdown, expired-account locking, and support reactivation flow."],["Secure tenancy","Supabase Auth, Postgres, Storage, and Row Level Security isolate every agent workspace."],["Transactional email","Brevo SMTP confirmation and new-lead notifications with server-side credentials."],["Production delivery","Next.js App Router, TypeScript, Tailwind CSS, Supabase, GitHub, and Vercel."]];
  return textPage("04","Available now","A working SaaS foundation with meaningful product depth",`<div class="cap-grid">${items.map(([a,b])=>`<div><span>✓</span><h3>${a}</h3><p>${b}</p></div>`).join("")}</div>`);
}

function screenshotPage(number, kicker, title, image, caption) {
  return `<section class="page screenshot-page"><header><span>${kicker}</span><strong>LeadHub</strong></header><div class="screenshot-copy"><h2>${title}</h2><p>${caption}</p></div><div class="browser"><div class="browser-bar"><i></i><i></i><i></i><span>leadhub-loan-crm.vercel.app</span></div><img src="${image}"></div><div class="page-number">${number}</div></section>`;
}

function mobilePage(image) {
  return textPage("09","Mobile-first delivery","Designed for the device borrowers use first",`<div class="mobile-layout"><div class="phone"><img src="${image}"></div><div class="mobile-copy"><h3>One responsive experience</h3><p>Public agent pages keep the brand, services, CTAs, and forms usable on compact screens without horizontal clipping.</p><ul><li>Touch-friendly Apply and WhatsApp actions</li><li>Readable service catalogue and agent identity</li><li>Responsive lead form and EMI calculator</li><li>Mobile lead generation without an app install</li></ul></div></div>`);
}

function featureDetailPage() {
  return textPage("10","Conversion surface","The public site is more than a profile page",`<div class="feature-detail"><div><span>01</span><h3>Service catalogue</h3><p>Agents choose from a broad set of loan and financial products.</p></div><div><span>02</span><h3>EMI calculator</h3><p>Borrowers can estimate repayments before submitting an enquiry.</p></div><div><span>03</span><h3>Lead capture</h3><p>Validated customer, loan, income, source, and address fields create structured CRM records.</p></div><div><span>04</span><h3>WhatsApp conversion</h3><p>Trackable CTAs connect borrowers and agents through a familiar channel.</p></div><div><span>05</span><h3>Address assistance</h3><p>Pincode lookup improves city, district, and state data quality.</p></div><div><span>06</span><h3>Agent trust</h3><p>Logo, location, contact details, and tailored copy make every page distinct.</p></div></div>`);
}

function analyticsPage() {
  return textPage("14","Growth intelligence","Simple analytics that make product value visible",`<div class="analytics-hero"><div><span>Website visits</span><strong>386</strong></div><div><span>Lead submissions</span><strong>48</strong></div><div><span>WhatsApp clicks</span><strong>91</strong></div><div><span>Conversion</span><strong>12%</strong></div></div><div class="analytics-copy"><div><h3>Source attribution</h3><p>Website, WhatsApp, Facebook, Instagram, Google, and referral sources are stored with each lead.</p></div><div><h3>Follow-up visibility</h3><p>Leads without activity for two days surface as pending reminders in the dashboard.</p></div><div><h3>Clear expansion path</h3><p>The event model creates a foundation for funnels, campaigns, cohort analysis, and automation.</p></div></div>`);
}

function architecturePage() {
  return textPage("16","Architecture and security","Tenant isolation is enforced at the data layer",`<div class="architecture"><div class="actors"><div>Public borrowers</div><div>Authenticated agents</div></div><div class="connector">↓</div><div class="platform"><h3>Next.js 14 on Vercel</h3><p>App Router · TypeScript · Tailwind CSS · server routes and actions</p></div><div class="split"><div class="stack"><h3>Supabase</h3><p>Auth</p><p>Postgres</p><p>Storage</p><p class="secure">Row Level Security</p></div><div class="stack"><h3>Brevo SMTP</h3><p>Signup confirmation</p><p>New-lead notification</p><p>Server-side credentials</p></div></div></div><div class="security-points"><span>Public users can submit leads but cannot read them.</span><span>Agents can access only rows tied to their own user ID.</span><span>Lead notes and analytics are tenant-scoped.</span><span>Service credentials never appear in client-side code.</span></div>`);
}

function roadmapPage() {
  return textPage("17","Production and roadmap","A live foundation with clear expansion vectors",`<div class="roadmap-grid"><div class="now"><span>Available now</span><h3>Production SaaS foundation</h3><ul><li>GitHub-connected Vercel deployment</li><li>Multi-tenant auth and RLS</li><li>Public sites and agent branding</li><li>Lead CRM, notes, sources, analytics, CSV</li><li>Brevo notifications and trial controls</li><li>Custom-domain data model and rewrite groundwork</li></ul></div><div class="next"><span>Roadmap</span><h3>Platform expansion</h3><ul><li>Demo prospect creation and instant demo sites</li><li>Self-service demo claim and trial conversion</li><li>Platform-owner admin dashboard</li><li>Subscription billing and plan enforcement</li><li>Scheduled email and WhatsApp follow-up automation</li><li>Deeper funnel and portfolio analytics</li></ul></div></div>`);
}

function closingPage() {
  return `<section class="page closing"><div class="closing-card"><div class="big-mark">H</div><span class="eyebrow">LeadHub investor product dossier</span><h2>Schedule a Product Demo</h2><p>See the complete journey from agent signup to public lead capture, notification, follow-up, analytics, and secure tenant isolation.</p><div class="contact-grid"><div><span>Contact</span><strong>Tamoghna Mondal</strong></div><div><span>Phone</span><strong>7001586476</strong></div><div><span>Email</span><strong>tamoghna171099@gmail.com</strong></div><div><span>Live product</span><strong>leadhub-loan-crm.vercel.app</strong></div></div></div><div class="page-number">18</div></section>`;
}

function dossierCss() {
  return `
    @page{size:A4 landscape;margin:0}*{box-sizing:border-box}body{margin:0;background:#dfe8f2;color:#0f172a;font-family:Inter,Arial,sans-serif}.page{position:relative;width:297mm;height:210mm;overflow:hidden;background:#f8fbff;padding:15mm 18mm;page-break-after:always}.page:last-child{page-break-after:auto}.page:before{content:"";position:absolute;inset:0 0 auto 0;height:5mm;background:#1769ff}.page header,.topline{display:flex;justify-content:space-between;align-items:center;color:#64748b;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.12em}.page header strong{color:#1769ff}.page-content{margin-top:15mm}.page h2{font-size:29px;line-height:1.08;margin:0 0 7mm;letter-spacing:0}.page h3{letter-spacing:0}.page p{color:#526277;line-height:1.55}.page-number{position:absolute;right:12mm;bottom:8mm;color:#94a3b8;font-size:10px;font-weight:900}.cover{background:#07142d;color:white;padding:17mm 19mm}.cover:before{background:#10b981}.topline{color:#9db0ca}.cover-body{margin-top:29mm;max-width:210mm}.brand-lockup{display:flex;align-items:center;gap:7mm}.big-mark{width:19mm;height:19mm;border-radius:5mm;background:#1769ff;color:white;display:grid;place-items:center;font-weight:900;font-size:30px;box-shadow:0 8mm 16mm #1769ff45}.brand-lockup h1{font-size:55px;margin:0}.brand-lockup p{margin:1mm 0;color:#8fe3be;font-weight:800}.cover h2{font-size:35px;max-width:190mm;margin:16mm 0 5mm}.lead{font-size:17px;max-width:190mm;color:#c6d3e4!important}.cover-chips{display:flex;gap:3mm;margin-top:12mm}.cover-chips span{border:1px solid #294365;border-radius:99px;padding:3mm 5mm;color:#dbe8f8;font-size:11px;font-weight:700}.problem-grid{display:grid;grid-template-columns:1fr 1fr;gap:5mm}.problem{background:white;border:1px solid #d9e4ef;border-radius:3mm;padding:7mm;box-shadow:0 7mm 18mm #0f172a0d}.problem>span{color:#10b981}.problem h3{font-size:18px;margin:3mm 0 2mm}.problem p{font-size:13px;margin:0}.statement{margin-top:7mm;padding:5mm;border-left:2mm solid #1769ff;background:#eaf3ff;color:#12396e;font-size:17px;font-weight:800}.flow{display:grid;grid-template-columns:1fr 13mm 1fr 13mm 1fr 13mm 1fr;align-items:center}.flow-step{height:64mm;background:white;border:1px solid #d9e4ef;border-radius:3mm;padding:7mm}.flow-step b{display:grid;place-items:center;width:9mm;height:9mm;background:#1769ff;color:white;border-radius:50%}.flow-step h3{font-size:17px;margin:6mm 0 3mm}.flow-step p{font-size:12px}.arrow{text-align:center;color:#10b981;font-size:26px}.outcome-grid{display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-top:7mm}.outcome-grid div{padding:5mm;border-radius:3mm;background:#07142d;color:white}.outcome-grid p{color:#c6d3e4;margin:2mm 0 0;font-size:12px}.cap-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:4mm}.cap-grid div{height:53mm;background:white;border:1px solid #d9e4ef;border-radius:3mm;padding:5mm}.cap-grid span{color:#10b981;font-weight:900}.cap-grid h3{font-size:15px;margin:3mm 0}.cap-grid p{font-size:11px;margin:0}.screenshot-page{padding-bottom:10mm}.screenshot-copy{margin-top:8mm;display:flex;align-items:end;justify-content:space-between;gap:10mm}.screenshot-copy h2{font-size:24px;margin:0;max-width:150mm}.screenshot-copy p{font-size:11px;max-width:95mm;margin:0}.browser{height:149mm;margin-top:5mm;border:1px solid #cfdce9;border-radius:3mm;overflow:hidden;background:white;box-shadow:0 7mm 18mm #0f172a14}.browser-bar{height:8mm;background:#f1f5f9;border-bottom:1px solid #d9e4ef;display:flex;align-items:center;gap:2mm;padding:0 4mm;color:#64748b;font-size:8px}.browser-bar i{width:2mm;height:2mm;border-radius:50%;background:#cbd5e1}.browser-bar i:first-child{background:#ef4444}.browser-bar i:nth-child(2){background:#f59e0b}.browser-bar i:nth-child(3){background:#10b981}.browser img{display:block;width:100%;height:calc(100% - 8mm);object-fit:contain;object-position:top center;background:white}.mobile-layout{display:grid;grid-template-columns:80mm 1fr;gap:18mm;align-items:center}.phone{height:157mm;width:74mm;border:3mm solid #07142d;border-radius:10mm;overflow:hidden;background:white;box-shadow:0 8mm 20mm #0f172a26}.phone img{width:100%;height:100%;object-fit:cover;object-position:top}.mobile-copy h3{font-size:25px;margin:0 0 5mm}.mobile-copy p{font-size:15px}.mobile-copy ul,.roadmap-grid ul{padding-left:5mm;color:#334155;line-height:2}.feature-detail{display:grid;grid-template-columns:repeat(3,1fr);gap:5mm}.feature-detail div{height:62mm;padding:7mm;background:white;border:1px solid #d9e4ef;border-radius:3mm}.feature-detail span{color:#1769ff;font-size:12px;font-weight:900}.feature-detail h3{font-size:18px;margin:5mm 0 3mm}.feature-detail p{font-size:13px}.analytics-hero{display:grid;grid-template-columns:repeat(4,1fr);gap:5mm}.analytics-hero div{background:#07142d;color:white;border-radius:3mm;padding:7mm}.analytics-hero span{display:block;color:#9db0ca;font-size:12px}.analytics-hero strong{display:block;font-size:36px;margin-top:4mm}.analytics-copy{display:grid;grid-template-columns:repeat(3,1fr);gap:5mm;margin-top:7mm}.analytics-copy div{background:white;border:1px solid #d9e4ef;border-radius:3mm;padding:7mm}.analytics-copy h3{font-size:17px;margin:0 0 3mm}.analytics-copy p{font-size:12px}.architecture{display:grid;grid-template-columns:48mm 8mm 1fr 1.2fr;gap:5mm;align-items:center}.actors,.platform,.stack{background:white;border:1px solid #d9e4ef;border-radius:3mm;padding:6mm;text-align:center}.actors div{padding:5mm;background:#eaf3ff;border-radius:2mm;margin:3mm 0;font-weight:800}.connector{text-align:center;font-size:28px;color:#10b981}.platform h3,.stack h3{margin:0 0 3mm}.split{display:grid;grid-template-columns:1fr 1fr;gap:4mm}.stack p{background:#f1f5f9;border-radius:2mm;padding:2mm;margin:2mm 0;font-size:11px}.stack .secure{background:#e8faf1;color:#047857;font-weight:800}.security-points{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-top:8mm}.security-points span{background:#07142d;color:#dbe8f8;border-radius:2mm;padding:4mm;font-size:11px}.roadmap-grid{display:grid;grid-template-columns:1fr 1fr;gap:7mm}.roadmap-grid>div{height:130mm;border-radius:4mm;padding:9mm}.roadmap-grid .now{background:#07142d;color:white}.roadmap-grid .next{background:white;border:1px solid #d9e4ef}.roadmap-grid span{color:#10b981;font-weight:900;text-transform:uppercase;font-size:11px}.roadmap-grid h3{font-size:23px;margin:5mm 0}.roadmap-grid .now ul{color:#dbe8f8}.closing{background:#07142d;display:grid;place-items:center;color:white}.closing:before{background:#10b981}.closing-card{width:215mm;text-align:center}.closing-card .big-mark{margin:0 auto 8mm}.closing-card h2{font-size:42px;margin:5mm 0}.closing-card>p{font-size:16px;color:#c6d3e4;max-width:175mm;margin:0 auto}.contact-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:4mm;margin-top:12mm;text-align:left}.contact-grid div{background:#102443;border:1px solid #294365;border-radius:3mm;padding:5mm}.contact-grid span,.contact-grid strong{display:block}.contact-grid span{color:#8fe3be;font-size:10px;text-transform:uppercase;font-weight:900}.contact-grid strong{font-size:14px;margin-top:2mm}
  `;
}
