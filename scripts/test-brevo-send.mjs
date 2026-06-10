import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./env.mjs";

loadLocalEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const brevoApiKey = process.env.BREVO_API_KEY;
const senderEmail = process.env.BREVO_SMTP_SENDER_EMAIL;
const senderName = process.env.BREVO_SMTP_SENDER_NAME || "LeadHub";
const testEmail = process.env.BREVO_TEST_EMAIL;
const baseUrl = (process.env.CAMPAIGN_BASE_URL || process.env.NEXT_PUBLIC_APP_HOST || "https://leadhub-loan-crm.vercel.app").replace(/\/$/, "");

if (!supabaseUrl || !serviceRoleKey || !brevoApiKey || !senderEmail || !testEmail) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BREVO_API_KEY, BREVO_SMTP_SENDER_EMAIL, or BREVO_TEST_EMAIL.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const now = Date.now();
let prospectId = "";

try {
  const { data: prospect, error: prospectError } = await supabase
    .from("prospects")
    .insert({
      name: "Brevo Send Test",
      company_name: "LeadHub QA",
      email: `brevo-send-test-${now}@example.com`,
      city: "Kolkata",
      loan_category: "Business Loan",
      status: "new",
      lead_score: 0
    })
    .select("id")
    .single();

  if (prospectError) throw prospectError;
  prospectId = prospect.id;

  const { data: campaign, error: campaignError } = await supabase
    .from("email_campaigns")
    .insert({
      prospect_id: prospectId,
      campaign_name: "brevo_send_test",
      provider: "brevo",
      status: "sending",
      provider_response: { to: testEmail, subject: "LeadHub Brevo Campaign Test" }
    })
    .select("id")
    .single();

  if (campaignError) throw campaignError;

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": brevoApiKey,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: testEmail, name: "LeadHub Test" }],
      subject: "LeadHub Brevo Campaign Test",
      htmlContent: `
        <p>Hi,</p>
        <p>This is a controlled LeadHub campaign test email.</p>
        <p>Demo: <a href="${baseUrl}/demo?prospect_id=${prospectId}">${baseUrl}/demo</a></p>
        <p>Signup: <a href="${baseUrl}/signup">${baseUrl}/signup</a></p>
      `,
      tags: ["campaign", "brevo_send_test"]
    })
  });

  const result = await response.json().catch(() => ({ message: response.statusText }));

  if (!response.ok) {
    await supabase
      .from("email_campaigns")
      .update({ status: "failed", provider_error: result })
      .eq("id", campaign.id);
    throw new Error(`Brevo API failed with HTTP ${response.status}: ${JSON.stringify(result)}`);
  }

  await supabase
    .from("email_campaigns")
    .update({
      status: "sent",
      email_sent_at: new Date().toISOString(),
      message_id: result.messageId,
      provider_response: result
    })
    .eq("id", campaign.id);

  const { data: savedCampaign, error: savedCampaignError } = await supabase
    .from("email_campaigns")
    .select("status, message_id, email_sent_at")
    .eq("id", campaign.id)
    .single();

  if (savedCampaignError) throw savedCampaignError;
  if (savedCampaign.status !== "sent" || !savedCampaign.message_id || !savedCampaign.email_sent_at) {
    throw new Error(`Campaign row was not saved correctly: ${JSON.stringify(savedCampaign)}`);
  }

  console.log("BREVO_SEND_TEST=ok");
  console.log(`TEST_RECIPIENT=${testEmail}`);
  console.log(`MESSAGE_ID=${savedCampaign.message_id}`);
} catch (error) {
  console.error("BREVO_SEND_TEST=failed");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (prospectId && process.env.BREVO_SEND_TEST_KEEP !== "1") {
    await supabase.from("prospects").delete().eq("id", prospectId);
  }
}

