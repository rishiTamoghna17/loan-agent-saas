import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./env.mjs";

loadLocalEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const webhookSecret = process.env.BREVO_WEBHOOK_SECRET;
const baseUrl = (process.env.BREVO_WEBHOOK_TEST_URL || process.env.CAMPAIGN_BASE_URL || process.env.NEXT_PUBLIC_APP_HOST || "").replace(/\/$/, "");

if (!supabaseUrl || !serviceRoleKey || !webhookSecret || !baseUrl) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BREVO_WEBHOOK_SECRET, or CAMPAIGN_BASE_URL.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const now = Date.now();
const email = `brevo-webhook-test-${now}@example.com`;
const messageId = `brevo-webhook-test-${now}@mail.brevo.local`;
let prospectId = "";

try {
  const { data: prospect, error: prospectError } = await supabase
    .from("prospects")
    .insert({
      name: "Brevo Webhook Test",
      company_name: "LeadHub QA",
      email,
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
      campaign_name: "webhook_test",
      email_sent_at: new Date().toISOString(),
      message_id: messageId,
      provider: "brevo",
      status: "sent"
    })
    .select("id")
    .single();

  if (campaignError) throw campaignError;

  const webhookUrl = `${baseUrl}/api/webhooks/brevo?secret=${encodeURIComponent(webhookSecret)}`;
  const events = ["delivered", "opened", "clicked"];

  for (const event of events) {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event,
        "message-id": `<${messageId}>`,
        email,
        ts: Math.floor(Date.now() / 1000)
      })
    });

    if (!response.ok) {
      throw new Error(`Webhook ${event} failed: HTTP ${response.status} ${await response.text()}`);
    }
  }

  const { data: updatedCampaign, error: updatedCampaignError } = await supabase
    .from("email_campaigns")
    .select("status, delivered_at, opened_at, clicked_at, event_history")
    .eq("id", campaign.id)
    .single();

  if (updatedCampaignError) throw updatedCampaignError;

  const { data: updatedProspect, error: updatedProspectError } = await supabase
    .from("prospects")
    .select("status, lead_score")
    .eq("id", prospectId)
    .single();

  if (updatedProspectError) throw updatedProspectError;

  const passed =
    updatedCampaign.status === "clicked" &&
    updatedCampaign.delivered_at &&
    updatedCampaign.opened_at &&
    updatedCampaign.clicked_at &&
    Number(updatedProspect.lead_score) === 30 &&
    updatedProspect.status === "clicked";

  if (!passed) {
    console.error("BREVO_WEBHOOK_TEST=failed");
    console.error(JSON.stringify({ updatedCampaign, updatedProspect }, null, 2));
    process.exit(2);
  }

  console.log("BREVO_WEBHOOK_TEST=ok");
  console.log(`CAMPAIGN_STATUS=${updatedCampaign.status}`);
  console.log(`PROSPECT_SCORE=${updatedProspect.lead_score}`);
} catch (error) {
  console.error("BREVO_WEBHOOK_TEST=failed");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (prospectId) {
    await supabase.from("prospects").delete().eq("id", prospectId);
  }
}

