import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("/Users/tamoghna/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const shots = path.join(root, "artifacts", "leadhub-sales-screenshots");
const htmlPath = path.join(root, "artifacts", "LeadHub-Loan-Agent-Sales-Brochure.html");
const pdfPath = path.join(root, "artifacts", "LeadHub-Loan-Agent-Sales-Brochure.pdf");
const baseUrl = "https://leadhub-loan-crm.vercel.app";

await fs.mkdir(shots, { recursive: true });

let browser;
try {
  browser = await launchChrome();
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
  const page = await desktop.newPage();
  await capturePublic(page, "public-agent", `${baseUrl}/agent/test-crm`);
  await capturePreview(page, "dashboard", dashboardPreview());
  await capturePreview(page, "follow-up", followUpPreview());
  await capturePreview(page, "analytics", analyticsPreview());
  await capturePreview(page, "setup", setupPreview());
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
  const mobilePage = await mobile.newPage();
  await capturePublic(mobilePage, "mobile-agent", `${baseUrl}/agent/test-crm`);
  await mobile.close();

  const html = await brochureHtml();
  await fs.writeFile(htmlPath, html);
  const printContext = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const printPage = await printContext.newPage();
  await printPage.setContent(html, { waitUntil: "networkidle" });
  await printPage.pdf({
    path: pdfPath,
    format: "A4",
    landscape: true,
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
    preferCSSPageSize: true
  });
  await printContext.close();
  console.log(JSON.stringify({ htmlPath, pdfPath, shots }, null, 2));
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

async function capturePublic(page, name, url) {
  await page.goto(url, { waitUntil: "networkidle", timeout: 90_000 });
  await sanitizePublicPage(page);
  await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: true });
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
  await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: true });
}

function dashboardPreview() {
  return `${header()}<main class="wrap"><div class="trial">12 days remaining in your free trial.</div>${identity("Lead dashboard","Arora Finance Solutions","Aarav Arora · Pune · /agent/arora-finance")}<section class="metrics five">${metric("Total leads","48")}${metric("New","11")}${metric("Follow-up","19")}${metric("Closed","14")}${metric("Rejected","4")}</section>${table(false)}</main>`;
}

function followUpPreview() {
  return `${header()}<main class="wrap">${identity("Follow-up centre","Contact customers quickly","WhatsApp, notes, reminders, and email alerts keep every enquiry moving.")}<section class="email"><div class="mail">✉</div><div><b>New Lead Received</b><h2>Priya Mehta · Home Loan · ₹25,00,000</h2><p>Receive the customer's phone number, requirement, source, and direct dashboard link.</p></div><button class="primary">Open lead</button></section><section class="reminder"><b>Follow-up pending</b><span>Priya Mehta · Home Loan</span><span>Rohan Das · Business Loan</span><span>Neha Kapoor · Car Loan</span></section>${table(true)}</main>`;
}

function analyticsPreview() {
  return `${header()}<main class="wrap">${identity("Business insights","Know what is working","See visits, enquiries, WhatsApp interest, conversion, and lead sources.")}<section class="metrics four">${metric("Website visits","386")}${metric("Lead submissions","48")}${metric("WhatsApp clicks","91")}${metric("Conversion","12%")}</section><section class="source-grid"><div><b>Where leads came from</b><div class="bars">${bar("Google",76)}${bar("Website",62)}${bar("Referral",48)}${bar("Instagram",34)}</div></div><div><b>Keep your own records</b><p>Download all leads as CSV whenever you need them.</p><button class="secondary">⇩ Export CSV</button></div><div><b>Follow up on time</b><p>Older new and follow-up leads appear as reminders.</p><button class="whatsapp">Contact Lead</button></div></section></main>`;
}

function setupPreview() {
  return `${header()}<main class="wrap">${identity("Easy setup","Make LeadHub yours","Add your logo, services, contact details, and website message.")}<section class="setup-grid"><div class="panel"><h2>Your details</h2><div class="fields">${field("Business name","Arora Finance Solutions")}${field("Agent name","Aarav Arora")}${field("Phone & WhatsApp","98765 43210")}${field("City","Pune, Maharashtra")}${field("Public website","/agent/arora-finance")}${field("Primary colour","#1769FF")}</div></div><div class="panel"><h2>Services offered</h2><div class="chips">${["Personal Loan","Business Loan","Home Loan","Loan Against Property","Gold Loan","Car Loan","MSME Loan","Credit Card","Insurance"].map(x=>`<span>✓ ${x}</span>`).join("")}</div></div></section><section class="secure"><div>🔒</div><div><b>Your private dashboard</b><p>Only you can access your profile, leads, notes, and analytics after login.</p></div><div class="trial-card"><b>14-day free trial</b><span>Try all core features before choosing a plan.</span></div></section></main>`;
}

function header() {
  return `<header><div class="brand"><div class="mark">H</div><div><b>LeadHub</b><span>Lead Generation · CRM · Follow-up · Conversion</span></div></div><nav><button>Leads</button><button>Profile</button><button>Logout</button></nav></header>`;
}

function identity(kicker, title, sub) {
  return `<section class="identity"><div><span class="eyebrow">${kicker}</span><h1>${title}</h1><p>${sub}</p></div><button class="secondary">Edit profile</button><button class="primary">View public page</button></section>`;
}

function metric(label, value) { return `<div class="metric"><span>${label}</span><b>${value}</b></div>`; }
function field(label, value) { return `<div class="field"><span>${label}</span><b>${value}</b></div>`; }
function bar(label, width) { return `<div class="bar"><span>${label}</span><i style="width:${width}%"></i></div>`; }

function table(notes) {
  const rows = [
    ["Priya Mehta","98765 12001","Home Loan","₹25,00,000","Google","Follow-up"],
    ["Rohan Das","98765 12002","Business Loan","₹8,00,000","Referral","New"],
    ["Neha Kapoor","98765 12003","Car Loan","₹12,00,000","Instagram","Closed"]
  ];
  return `<section class="table-panel"><div class="table-title"><h2>Leads</h2><button class="secondary">⇩ Export CSV</button></div><table><thead><tr><th>Name</th><th>Phone</th><th>Loan type</th><th>Amount</th><th>Source</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.map((r,i)=>`<tr>${r.map((x,j)=>`<td>${j===0?`<b>${x}</b><small>${["Needs eligibility guidance","Requested callback tomorrow","Documents submitted"][i]}</small>`:x}</td>`).join("")}<td><div class="actions"><button class="whatsapp">Contact Lead</button>${notes?`<input value="${["Documents pending","Call Wednesday","Application submitted"][i]}">`:""}</div></td></tr>`).join("")}</tbody></table></section>`;
}

function previewShell(body) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;background:#f7faff;color:#0f172a;font-family:Inter,Arial,sans-serif}header{height:72px;background:white;border-bottom:1px solid #dbe5ef;padding:0 58px;display:flex;align-items:center;justify-content:space-between}.brand{display:flex;align-items:center;gap:11px}.brand b,.brand span{display:block}.brand span{font-size:11px;color:#64748b}.mark{width:36px;height:36px;border-radius:8px;background:#1769ff;color:white;display:grid;place-items:center;font-weight:900}nav{display:flex;gap:8px}button{border:1px solid #d8e2ed;border-radius:7px;background:white;padding:9px 13px;font-weight:700;color:#0f172a}.primary{background:#1769ff;color:white;border-color:#1769ff}.secondary{background:white}.whatsapp{background:#10b981;color:white;border-color:#10b981}.wrap{max-width:1260px;margin:auto;padding:26px 24px 55px}.trial{padding:12px 16px;background:#eaf3ff;border:1px solid #cfe2ff;color:#1769ff;border-radius:8px;font-size:13px;font-weight:700;margin-bottom:14px}.identity{display:flex;align-items:center;gap:12px;background:white;border:1px solid #dbe5ef;border-radius:10px;padding:20px;box-shadow:0 14px 32px #0f172a0c}.identity>div{flex:1}.eyebrow{color:#1769ff;text-transform:uppercase;font-size:11px;font-weight:900;letter-spacing:.08em}h1{font-size:25px;margin:4px 0}h2{font-size:18px;margin:0 0 12px}p{margin:3px 0;color:#64748b;font-size:13px;line-height:1.55}.metrics{display:grid;gap:12px;margin-top:14px}.metrics.five{grid-template-columns:repeat(5,1fr)}.metrics.four{grid-template-columns:repeat(4,1fr)}.metric{background:white;border:1px solid #dbe5ef;border-radius:9px;padding:16px}.metric span{display:block;color:#64748b;font-size:12px;font-weight:700}.metric b{display:block;font-size:26px;margin-top:8px}.table-panel,.panel,.email,.source-grid,.secure{margin-top:16px;background:white;border:1px solid #dbe5ef;border-radius:10px;overflow:hidden;box-shadow:0 14px 32px #0f172a0c}.table-title{display:flex;justify-content:space-between;align-items:center;padding:16px;border-bottom:1px solid #dbe5ef}.table-title h2{margin:0}table{width:100%;border-collapse:collapse;font-size:12px}th{text-align:left;background:#f8fafc;color:#64748b;text-transform:uppercase;padding:11px}td{padding:13px 11px;border-top:1px solid #edf2f7;vertical-align:top}small{display:block;color:#64748b;margin-top:4px}.actions{display:flex;gap:6px;flex-wrap:wrap}.actions button,.actions input{font-size:11px;padding:7px;border-radius:6px}.actions input{border:1px solid #dbe5ef;width:170px}.email{padding:18px;display:flex;align-items:center;gap:16px}.email>div:nth-child(2){flex:1}.mail{width:48px;height:48px;display:grid;place-items:center;border-radius:9px;background:#eaf3ff;color:#1769ff;font-size:22px}.email h2{margin:5px 0}.reminder{display:flex;gap:12px;align-items:center;margin-top:14px;background:#fff8e7;border:1px solid #f4d78e;border-radius:9px;padding:14px;color:#854d0e}.reminder span{background:white;border:1px solid #f4d78e;border-radius:6px;padding:8px 10px;font-size:12px}.source-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:18px;padding:22px}.source-grid>div{border:1px solid #dbe5ef;border-radius:8px;padding:17px}.source-grid p{margin:10px 0}.bars{margin-top:14px}.bar{margin-top:10px}.bar span{display:block;font-size:11px;color:#64748b;margin-bottom:4px}.bar i{display:block;height:7px;background:#1769ff;border-radius:10px}.setup-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.panel{padding:20px}.fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}.field{border:1px solid #dbe5ef;border-radius:7px;padding:11px}.field span{display:block;color:#64748b;font-size:10px}.field b{display:block;margin-top:4px;font-size:12px}.chips{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.chips span{background:#f8fbff;border:1px solid #dbe5ef;border-radius:6px;padding:10px;font-size:11px;font-weight:700}.secure{display:grid;grid-template-columns:44px 1fr 1fr;gap:14px;align-items:center;padding:17px}.secure>div:first-child{font-size:27px}.trial-card{background:#e8faf1;border:1px solid #b7ecd3;border-radius:8px;padding:12px}.trial-card b,.trial-card span{display:block}.trial-card span{font-size:11px;color:#047857;margin-top:4px}
  </style></head><body>${body}</body></html>`;
}

async function image(name) {
  const data = await fs.readFile(path.join(shots, `${name}.png`));
  return `data:image/png;base64,${data.toString("base64")}`;
}

async function brochureHtml() {
  const imgs = {};
  for (const name of ["public-agent","mobile-agent","dashboard","follow-up","analytics","setup"]) imgs[name] = await image(name);
  return `<!doctype html><html><head><meta charset="utf-8"><title>LeadHub Loan Agent Sales Brochure</title><style>${salesCss()}</style></head><body>
  ${cover()}
  ${problemPage()}
  ${journeyPage()}
  ${screenPage("04","Your professional website","Give customers one trusted place to understand your services and contact you.",imgs["public-agent"],["Your branding and contact details","All loan services in one place","EMI calculator and enquiry form","One-click WhatsApp contact"])}
  ${mobilePage(imgs["mobile-agent"])}
  ${screenPage("06","All your leads in one dashboard","Stop searching through messages and spreadsheets. Keep every enquiry organised.",imgs.dashboard,["See new, follow-up, closed, and rejected leads","Know each customer's requirement and source","Update status and keep notes","Export leads whenever you need them"])}
  ${screenPage("07","Follow up quickly and professionally","Receive new-lead emails, see pending reminders, and contact customers through WhatsApp.",imgs["follow-up"],["Instant new-lead email notification","Ready-to-use Contact Lead WhatsApp message","Follow-up reminders for older leads","Notes keep every conversation clear"])}
  ${screenPage("08","Understand your business","See which channels bring enquiries and where follow-up needs attention.",imgs.analytics,["Website visits and lead submissions","WhatsApp clicks and conversion percentage","Lead-source tracking","CSV download for your own records"])}
  ${screenPage("09","Easy to set up. Private to you.","Create your profile, add your services and logo, then start sharing your website.",imgs.setup,["No technical knowledge needed","Your logo, colours, services, and message","Secure login to your private dashboard","Try all core features for 14 days"])}
  ${closing()}
  </body></html>`;
}

function cover() {
  return `<section class="page cover"><div class="top"><span>LeadHub for Loan Agents</span><span>Contact for pricing</span></div><div class="cover-content"><div class="logo-lock"><div class="big-mark">H</div><div><h1>LeadHub</h1><p>Lead Generation · CRM · Follow-up · Conversion</p></div></div><h2>Get Your Own Loan Website and Lead CRM</h2><p class="lead">Look professional online, receive structured loan enquiries, and follow up with every customer from one simple dashboard.</p><div class="benefits"><span>Professional website</span><span>Lead dashboard</span><span>WhatsApp follow-up</span><span>14-day free trial</span></div><div class="cover-cta">Start your free trial at <b>leadhub-loan-crm.vercel.app</b></div></div><div class="num">01</div></section>`;
}

function problemPage() {
  return page("02","Why LeadHub?","Do these problems slow down your loan business?",`<div class="problem-grid">${card("Missed enquiries","Customer details get lost between calls, WhatsApp messages, and notebooks.")}${card("Slow follow-up","Without reminders and notes, it is difficult to contact every customer on time.")}${card("No professional website","Customers cannot easily see your services, identity, and contact details online.")}${card("Scattered information","Lead status, requirements, and sources are hard to track without one dashboard.")}</div><div class="highlight">LeadHub gives you a professional website and an organised lead dashboard in one service.</div>`);
}

function journeyPage() {
  return page("03","How it works","From customer enquiry to follow-up in four simple steps",`<div class="journey">${step("1","Share your website","Send your LeadHub link through WhatsApp, social media, or referrals.")}<div class="arrow">→</div>${step("2","Customer submits enquiry","The form captures their loan type, amount, phone, location, and source.")}<div class="arrow">→</div>${step("3","You receive the lead","LeadHub adds it to your dashboard and sends a new-lead email.")}<div class="arrow">→</div>${step("4","Follow up and convert","Contact the customer on WhatsApp, add notes, and update lead status.")}</div><div class="simple">No app installation. No technical setup. Just share your link and manage enquiries.</div>`);
}

function page(number,kicker,title,body) {
  return `<section class="page"><header><span>${kicker}</span><b>LeadHub</b></header><main><h2>${title}</h2>${body}</main><div class="num">${number}</div></section>`;
}

function card(title,text) { return `<div class="card"><span>✓</span><h3>${title}</h3><p>${text}</p></div>`; }
function step(n,title,text) { return `<div class="step"><b>${n}</b><h3>${title}</h3><p>${text}</p></div>`; }

function screenPage(number,title,caption,img,points) {
  return `<section class="page screen"><header><span>LeadHub in action</span><b>LeadHub</b></header><div class="screen-head"><div><h2>${title}</h2><p>${caption}</p></div><ul>${points.map(x=>`<li>✓ ${x}</li>`).join("")}</ul></div><div class="browser"><div class="bar"><i></i><i></i><i></i><span>leadhub-loan-crm.vercel.app</span></div><img src="${img}"></div><div class="num">${number}</div></section>`;
}

function mobilePage(img) {
  return page("05","Made for mobile","Your customers can enquire from anywhere",`<div class="mobile-layout"><div class="phone"><img src="${img}"></div><div class="mobile-copy"><h3>A complete loan website on the customer's phone</h3><p>Customers can view your services, calculate EMI, contact you through WhatsApp, and submit an enquiry without installing anything.</p><div class="mobile-benefits">${card("Easy to share","Send the website link through WhatsApp, Facebook, Instagram, Google, or referral messages.")}${card("Easy to use","Large buttons, readable information, and a simple enquiry form work smoothly on mobile.")}${card("Built for trust","Your business name, location, services, and contact details appear clearly.")}</div></div></div>`);
}

function closing() {
  return `<section class="page closing"><div class="closing-content"><div class="big-mark">H</div><span>LeadHub for Loan Agents</span><h2>Start Your Free 14-Day Trial</h2><p>Get your professional loan website and lead dashboard. Try the core features before choosing a plan.</p><div class="cta-grid"><div><span>Contact</span><b>Tamoghna Mondal</b></div><div><span>Phone / WhatsApp</span><b>7001586476</b></div><div><span>Email</span><b>tamoghna171099@gmail.com</b></div><div><span>Start free trial</span><b>leadhub-loan-crm.vercel.app/signup</b></div></div><div class="final-cta">Contact for pricing · Setup support included</div></div><div class="num">10</div></section>`;
}

function salesCss() {
  return `@page{size:A4 landscape;margin:0}*{box-sizing:border-box}body{margin:0;background:#dfe8f2;color:#0f172a;font-family:Inter,Arial,sans-serif}.page{position:relative;width:297mm;height:210mm;overflow:hidden;background:#f8fbff;padding:15mm 18mm;page-break-after:always}.page:last-child{page-break-after:auto}.page:before{content:"";position:absolute;inset:0 0 auto 0;height:5mm;background:#1769ff}.page header,.top{display:flex;justify-content:space-between;align-items:center;color:#64748b;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.12em}.page header b{color:#1769ff}.page main{margin-top:15mm}.page h2{font-size:30px;line-height:1.08;margin:0 0 8mm;letter-spacing:0}.page h3{letter-spacing:0}.page p{color:#526277;line-height:1.55}.num{position:absolute;right:12mm;bottom:8mm;color:#94a3b8;font-size:10px;font-weight:900}.cover,.closing{background:#07142d;color:white}.cover:before,.closing:before{background:#10b981}.top{color:#9db0ca}.cover-content{margin-top:22mm;max-width:215mm}.logo-lock{display:flex;align-items:center;gap:7mm}.big-mark{width:19mm;height:19mm;border-radius:5mm;background:#1769ff;color:white;display:grid;place-items:center;font-size:30px;font-weight:900}.logo-lock h1{font-size:53px;margin:0}.logo-lock p{margin:1mm 0;color:#8fe3be;font-weight:800}.cover h2{font-size:38px;max-width:200mm;margin:13mm 0 5mm}.lead{font-size:17px;max-width:190mm;color:#c6d3e4!important}.benefits{display:flex;gap:3mm;margin-top:10mm}.benefits span{border:1px solid #294365;border-radius:99px;padding:3mm 5mm;color:#dbe8f8;font-size:11px;font-weight:700}.cover-cta{margin-top:10mm;color:#8fe3be}.problem-grid{display:grid;grid-template-columns:1fr 1fr;gap:5mm}.card{background:white;border:1px solid #d9e4ef;border-radius:3mm;padding:7mm}.card>span{color:#10b981;font-weight:900}.card h3{font-size:18px;margin:3mm 0 2mm}.card p{font-size:13px;margin:0}.highlight,.simple{margin-top:7mm;padding:5mm;background:#eaf3ff;border-left:2mm solid #1769ff;color:#12396e;font-size:16px;font-weight:800}.journey{display:grid;grid-template-columns:1fr 12mm 1fr 12mm 1fr 12mm 1fr;align-items:center}.step{height:70mm;background:white;border:1px solid #d9e4ef;border-radius:3mm;padding:7mm}.step>b{width:9mm;height:9mm;border-radius:50%;display:grid;place-items:center;background:#1769ff;color:white}.step h3{font-size:17px;margin:6mm 0 3mm}.step p{font-size:12px}.arrow{text-align:center;color:#10b981;font-size:25px}.screen{padding-bottom:9mm}.screen-head{display:grid;grid-template-columns:1fr 1fr;gap:10mm;align-items:center;margin-top:7mm}.screen-head h2{font-size:25px;margin:0 0 3mm}.screen-head p{font-size:11px;margin:0}.screen-head ul{display:grid;grid-template-columns:1fr 1fr;gap:2mm;margin:0;padding:0;list-style:none;color:#334155;font-size:10px;font-weight:700}.browser{height:146mm;margin-top:4mm;border:1px solid #cfdce9;border-radius:3mm;overflow:hidden;background:white;box-shadow:0 7mm 18mm #0f172a14}.bar{height:8mm;background:#f1f5f9;border-bottom:1px solid #d9e4ef;display:flex;align-items:center;gap:2mm;padding:0 4mm;color:#64748b;font-size:8px}.bar i{width:2mm;height:2mm;border-radius:50%;background:#cbd5e1}.bar i:first-child{background:#ef4444}.bar i:nth-child(2){background:#f59e0b}.bar i:nth-child(3){background:#10b981}.browser img{display:block;width:100%;height:calc(100% - 8mm);object-fit:contain;object-position:top center}.mobile-layout{display:grid;grid-template-columns:78mm 1fr;gap:17mm;align-items:center}.phone{height:158mm;width:73mm;border:3mm solid #07142d;border-radius:10mm;overflow:hidden;background:white;box-shadow:0 8mm 20mm #0f172a26}.phone img{width:100%;height:100%;object-fit:cover;object-position:top}.mobile-copy h3{font-size:25px;margin:0 0 4mm}.mobile-copy>p{font-size:15px}.mobile-benefits{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-top:7mm}.mobile-benefits .card{padding:5mm}.mobile-benefits .card h3{font-size:14px}.mobile-benefits .card p{font-size:10px}.closing{display:grid;place-items:center}.closing-content{width:220mm;text-align:center}.closing-content .big-mark{margin:0 auto 7mm}.closing-content>span{color:#8fe3be;text-transform:uppercase;font-size:11px;font-weight:900}.closing h2{font-size:42px;margin:5mm 0}.closing-content>p{font-size:16px;color:#c6d3e4;max-width:180mm;margin:0 auto}.cta-grid{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-top:11mm;text-align:left}.cta-grid div{background:#102443;border:1px solid #294365;border-radius:3mm;padding:5mm}.cta-grid span,.cta-grid b{display:block}.cta-grid span{color:#8fe3be;text-transform:uppercase;font-size:9px;font-weight:900}.cta-grid b{font-size:14px;margin-top:2mm}.final-cta{display:inline-block;margin-top:8mm;background:#10b981;color:white;border-radius:99px;padding:4mm 8mm;font-weight:900}
  `;
}
