import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("/Users/tamoghna/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(projectRoot, "artifacts", "leadhub-screenshots");
const pdfPath = path.join(projectRoot, "artifacts", "leadhub-client-project-overview.pdf");
const htmlPath = path.join(projectRoot, "artifacts", "leadhub-client-project-overview.html");
const baseUrl = "http://localhost:3000";

await fs.mkdir(outDir, { recursive: true });

let browser;

try {
  browser = await launchChrome();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  const publicSlug = await findPublicSlug(page);
  const captures = [];

  await captureRoute(page, captures, "01-home", "LeadHub Overview", `${baseUrl}/`, "The product entry point introduces LeadHub as a loan website, lead CRM, follow-up, and conversion platform.");
  await captureRoute(page, captures, "02-signup", "Agent Signup", `${baseUrl}/signup`, "Agent onboarding collects business details, logo, services, address, and secure auth credentials.");
  await captureRoute(page, captures, "03-login", "Agent Login", `${baseUrl}/login`, "Existing agents can sign in to access their private dashboard.");
  await captureRoute(page, captures, "04-public-agent", "Public Agent Website", `${baseUrl}/agent/${publicSlug}`, "Each agent gets a public loan page with services, EMI calculator, WhatsApp CTA, and lead form.");

  await captureHtml(page, captures, "05-dashboard", "Lead Dashboard", `${baseUrl}/dashboard`, "The authenticated dashboard shows tenant-specific lead counts, lead status updates, notes, WhatsApp actions, and delete actions.", dashboardPreviewHtml());
  await captureHtml(page, captures, "06-profile", "Agent Profile Editor", `${baseUrl}/dashboard/profile`, "Agents can update business details, services, logo, public slug, and address data.", profilePreviewHtml());

  await context.close();

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    deviceScaleFactor: 2
  });
  const mobilePage = await mobileContext.newPage();
  await captureRoute(mobilePage, captures, "07-mobile-public-agent", "Mobile Public Page", `${baseUrl}/agent/${publicSlug}`, "The public page remains usable on mobile for quick customer enquiries.");
  await mobileContext.close();

  const reportHtml = await buildReportHtml(captures);
  await fs.writeFile(htmlPath, reportHtml);

  const pdfContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const pdfPage = await pdfContext.newPage();
  await pdfPage.setContent(reportHtml, { waitUntil: "networkidle" });
  await pdfPage.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "14mm", right: "12mm", bottom: "14mm", left: "12mm" }
  });
  await pdfContext.close();

  console.log(JSON.stringify({ pdfPath, htmlPath, captures }, null, 2));
} finally {
  if (browser) {
    await browser.close();
  }
}

async function launchChrome() {
  const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

  try {
    await fs.access(chromePath);
    return chromium.launch({ executablePath: chromePath, headless: true });
  } catch {
    return chromium.launch({ headless: true });
  }
}

async function findPublicSlug(page) {
  for (const slug of ["test-crm", "tamoghna-loan-mechine"]) {
    await page.goto(`${baseUrl}/agent/${slug}`, { waitUntil: "networkidle" });
    const notFound = await page.locator("text=Agent not found").count();
    if (!notFound) return slug;
  }

  return "test-crm";
}

async function captureRoute(page, captures, key, title, url, caption) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.screenshot({
    path: path.join(outDir, `${key}.png`),
    fullPage: true
  });

  captures.push({
    key,
    title,
    url: page.url(),
    caption,
    imagePath: path.join(outDir, `${key}.png`)
  });
}

async function captureHtml(page, captures, key, title, url, caption, html) {
  await page.setContent(html, { waitUntil: "networkidle" });
  await page.screenshot({
    path: path.join(outDir, `${key}.png`),
    fullPage: true
  });

  captures.push({
    key,
    title,
    url,
    caption,
    imagePath: path.join(outDir, `${key}.png`)
  });
}

function dashboardPreviewHtml() {
  return previewShell(`
    <header class="topbar">
      <div class="brand"><div class="mark"></div><div><strong>LeadHub</strong><span>Lead Generation • CRM • Follow-up • Conversion</span></div></div>
      <nav><button>Leads</button><button>Profile</button><button>Logout</button></nav>
    </header>
    <main class="wrap">
      <section class="identity">
        <div class="avatar">A</div>
        <div>
          <p class="kicker">Lead dashboard</p>
          <h1>LeadHub Capital Services</h1>
          <p class="muted">Aarav Sharma · Mumbai, Mumbai · /agent/leadhub-capital</p>
        </div>
        <a class="primary">View public page</a>
      </section>
      <section class="metrics">
        ${metric("Total leads", "24")}
        ${metric("New leads", "7")}
        ${metric("Follow-up", "10")}
        ${metric("Closed", "5")}
        ${metric("Rejected", "2")}
      </section>
      <section class="card table-card">
        <h2>Leads</h2>
        <table>
          <thead><tr><th>Name</th><th>Phone</th><th>Loan type</th><th>Amount</th><th>City</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody>
            <tr>
              <td><strong>Priya Mehta</strong><small>Looking for eligibility and EMI details.</small></td>
              <td>9000012345</td>
              <td>Home Loan</td>
              <td>₹25,00,000</td>
              <td>Pune<small>Maharashtra - 411001</small></td>
              <td><select><option>Follow-up</option></select></td>
              <td>8 Jun 2026</td>
              <td><div class="actions"><button class="whatsapp">WhatsApp</button><button>Delete</button><input placeholder="Add note" /><button>Add</button></div></td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  `);
}

function profilePreviewHtml() {
  return previewShell(`
    <header class="topbar">
      <div class="brand"><div class="mark"></div><div><strong>LeadHub</strong><span>Lead Generation • CRM • Follow-up • Conversion</span></div></div>
      <nav><button>Leads</button><button>Profile</button><button>Logout</button></nav>
    </header>
    <main class="wrap">
      <section class="identity">
        <div>
          <p class="kicker">Agent profile</p>
          <h1>Manage public website details</h1>
          <p class="muted">Changes update the public agent page, lead form services, WhatsApp CTA, and contact section.</p>
        </div>
        <a class="primary">Save profile</a>
      </section>
      <section class="card">
        <div class="form-grid">
          ${field("Business name", "LeadHub Capital Services")}
          ${field("Agent name", "Aarav Sharma")}
          ${field("Phone", "9876543210")}
          ${field("WhatsApp number", "9876543210")}
          ${field("Pincode", "400001")}
          ${field("Area / city", "Mumbai")}
          ${field("District", "Mumbai")}
          ${field("State", "Maharashtra")}
          ${field("Landmark", "Near Fort business district")}
          ${field("Public slug", "leadhub-capital")}
        </div>
        <h2>Services offered</h2>
        <div class="chips">
          ${["Personal Loan", "Business Loan", "Home Loan", "Loan Against Property", "Gold Loan", "Car Loan", "MSME Loan", "Credit Card", "Insurance"].map((service) => `<span>${service}</span>`).join("")}
        </div>
      </section>
    </main>
  `);
}

function previewShell(body) {
  return `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; background: #f8fbff; color: #0f172a; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
          .topbar { height: 76px; display: flex; align-items: center; justify-content: space-between; padding: 0 72px; background: #fff; border-bottom: 1px solid #dbe6f3; }
          .brand { display: flex; align-items: center; gap: 12px; }
          .brand strong { display: block; font-size: 18px; }
          .brand span { display: block; font-size: 12px; color: #64748b; }
          .mark { width: 38px; height: 38px; border-radius: 12px; background: #1769ff; box-shadow: 0 12px 26px rgba(23, 105, 255, 0.22); position: relative; }
          .mark:before { content: "H"; position: absolute; inset: 0; color: #fff; display: grid; place-items: center; font-weight: 900; }
          nav { display: flex; gap: 10px; }
          button, .primary { border: 1px solid #dbe6f3; border-radius: 8px; background: #fff; color: #0f172a; padding: 11px 16px; font-weight: 800; text-decoration: none; }
          .primary { background: #1769ff; color: #fff; border-color: #1769ff; }
          .wrap { max-width: 1180px; margin: 0 auto; padding: 34px 24px 70px; }
          .identity { display: flex; align-items: center; justify-content: space-between; gap: 24px; background: #fff; border: 1px solid #dbe6f3; border-radius: 12px; padding: 26px; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08); }
          .avatar { width: 62px; height: 62px; border-radius: 12px; display: grid; place-items: center; background: #1769ff; color: #fff; font-size: 28px; font-weight: 900; }
          .kicker { margin: 0 0 6px; color: #1769ff; font-weight: 900; font-size: 13px; }
          h1 { margin: 0; font-size: 34px; letter-spacing: 0; }
          h2 { margin: 0 0 18px; font-size: 20px; letter-spacing: 0; }
          .muted { margin: 8px 0 0; color: #64748b; }
          .metrics { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin-top: 22px; }
          .metric, .card { background: #fff; border: 1px solid #dbe6f3; border-radius: 12px; padding: 20px; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.06); }
          .metric p { margin: 0; color: #64748b; font-weight: 800; }
          .metric strong { display: block; margin-top: 12px; font-size: 34px; }
          .table-card { margin-top: 24px; padding: 0; overflow: hidden; }
          .table-card h2 { padding: 20px; border-bottom: 1px solid #dbe6f3; margin: 0; }
          table { width: 100%; border-collapse: collapse; font-size: 14px; }
          th { text-align: left; color: #64748b; background: #f8fafc; padding: 14px; text-transform: uppercase; font-size: 12px; }
          td { padding: 16px 14px; vertical-align: top; border-top: 1px solid #edf2f7; }
          small { display: block; margin-top: 6px; color: #64748b; }
          select, input { border: 1px solid #dbe6f3; border-radius: 8px; padding: 12px; font: inherit; background: #fff; }
          .actions { display: flex; flex-wrap: wrap; gap: 8px; max-width: 320px; }
          .whatsapp { background: #10b981; border-color: #10b981; color: #fff; }
          .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
          label { display: block; color: #334155; font-weight: 800; font-size: 13px; margin-bottom: 8px; }
          .field-box { border: 1px solid #dbe6f3; border-radius: 8px; padding: 13px 14px; color: #0f172a; background: #fff; }
          .chips { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px; }
          .chips span { border: 1px solid #dbe6f3; border-radius: 8px; padding: 12px; background: #f8fbff; font-weight: 700; }
        </style>
      </head>
      <body>${body}</body>
    </html>`;
}

function metric(label, value) {
  return `<div class="metric"><p>${label}</p><strong>${value}</strong></div>`;
}

function field(label, value) {
  return `<div><label>${label}</label><div class="field-box">${value}</div></div>`;
}

async function buildReportHtml(captures) {
  const imageBlocks = await Promise.all(
    captures.map(async (capture) => {
      const bytes = await fs.readFile(capture.imagePath);
      const base64 = bytes.toString("base64");
      return `
        <section class="page screenshot-page">
          <div class="section-kicker">${escapeHtml(capture.key.replace(/^[0-9]+-/, "").replaceAll("-", " "))}</div>
          <h2>${escapeHtml(capture.title)}</h2>
          <p>${escapeHtml(capture.caption)}</p>
          <div class="browser-frame">
            <div class="browser-bar"><span></span><span></span><span></span><strong>${escapeHtml(capture.url)}</strong></div>
            <img src="data:image/png;base64,${base64}" alt="${escapeHtml(capture.title)} screenshot" />
          </div>
        </section>
      `;
    })
  );

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>LeadHub Client Project Overview</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #0f172a;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f8fbff;
      }
      .page {
        min-height: 1020px;
        page-break-after: always;
        padding: 34px;
        background: linear-gradient(135deg, #f8fbff 0%, #ffffff 58%, #effdf7 100%);
      }
      .cover {
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .brand { display: flex; gap: 16px; align-items: center; margin-bottom: 42px; }
      .mark {
        width: 58px;
        height: 58px;
        border-radius: 18px;
        background: #1769ff;
        position: relative;
        box-shadow: 0 18px 36px rgba(23, 105, 255, 0.24);
      }
      .mark:before { content: "H"; position: absolute; inset: 0; display: grid; place-items: center; color: #fff; font-weight: 900; font-size: 30px; }
      h1 { font-size: 58px; line-height: 1; margin: 0 0 16px; letter-spacing: 0; }
      h2 { font-size: 30px; line-height: 1.15; margin: 8px 0 10px; letter-spacing: 0; }
      p { font-size: 15px; line-height: 1.65; color: #475569; margin: 0; }
      .tagline { font-size: 20px; color: #0f766e; font-weight: 800; }
      .summary {
        margin-top: 36px;
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 14px;
      }
      .summary div {
        border: 1px solid #dbe6f3;
        border-radius: 12px;
        background: #fff;
        padding: 18px;
      }
      .summary strong { display: block; margin-bottom: 6px; font-size: 15px; }
      .section-kicker {
        color: #1769ff;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .browser-frame {
        margin-top: 18px;
        border: 1px solid #dbe6f3;
        border-radius: 16px;
        overflow: hidden;
        background: #fff;
        box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08);
      }
      .browser-bar {
        height: 34px;
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 0 12px;
        border-bottom: 1px solid #e2e8f0;
        background: #f8fafc;
        color: #64748b;
        font-size: 9px;
      }
      .browser-bar span {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #cbd5e1;
      }
      .browser-bar span:nth-child(1) { background: #ef4444; }
      .browser-bar span:nth-child(2) { background: #f59e0b; }
      .browser-bar span:nth-child(3) { background: #10b981; }
      .browser-bar strong {
        margin-left: 8px;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      img {
        display: block;
        width: 100%;
        max-height: 760px;
        object-fit: contain;
        object-position: top center;
        background: #fff;
      }
      .footer {
        margin-top: 34px;
        color: #64748b;
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <section class="page cover">
      <div class="brand">
        <div class="mark"></div>
        <div>
          <h1>LeadHub</h1>
          <p class="tagline">Lead Generation • CRM • Follow-up • Conversion</p>
        </div>
      </div>
      <h2>Multi-tenant loan agent website and lead dashboard SaaS</h2>
      <p>
        This project gives each loan agent a public fintech-style website, a secure private dashboard,
        tenant-isolated lead management, public lead capture, EMI tools, WhatsApp actions, and profile
        controls powered by Supabase Auth, Postgres, and Row Level Security.
      </p>
      <div class="summary">
        <div><strong>Agent websites</strong><p>Public pages update from each agent profile and support mobile-first lead capture.</p></div>
        <div><strong>Lead CRM</strong><p>Agents manage statuses, notes, WhatsApp follow-up, and deletions from one dashboard.</p></div>
        <div><strong>Secure tenancy</strong><p>Supabase RLS keeps every profile, lead, and note isolated by logged-in user.</p></div>
        <div><strong>Production ready</strong><p>Next.js App Router, TypeScript, Tailwind CSS, Supabase, Vercel-ready setup, and Brevo SMTP guidance.</p></div>
      </div>
      <p class="footer">Prepared on ${new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
    </section>
    ${imageBlocks.join("")}
  </body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
