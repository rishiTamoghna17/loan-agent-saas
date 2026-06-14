import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendBrevoWhatsApp } from "@/lib/brevo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization");
  
  if (!cronSecret) {
    console.error("Cascading worker cron rejected: CRON_SECRET is missing.");
    return NextResponse.json({ error: "Cron authentication is not configured." }, { status: 501 });
  }

  const url = new URL(request.url);
  const token = authorization === `Bearer ${cronSecret}` || url.searchParams.get("secret") === cronSecret;
  
  if (!token) {
    console.warn("Cascading worker cron rejected: unauthorized access attempt.");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // Fetch pending jobs whose scheduled_for date has passed
  const { data: jobs, error: jobsError } = await supabase
    .from("cascading_jobs")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", now)
    .limit(50); // Batch process up to 50 jobs at a time

  if (jobsError) {
    console.error("Failed to query pending cascading jobs:", jobsError);
    return NextResponse.json({ error: jobsError.message }, { status: 500 });
  }

  let processedCount = 0;
  let cancelledCount = 0;
  let failedCount = 0;
  const results = [];

  for (const job of jobs || []) {
    try {
      if (job.email_campaign_id) {
        // Model B: Cascading failover flow
        // Check if email has been opened or clicked
        const { data: emailCampaign, error: emailError } = await supabase
          .from("email_campaigns")
          .select("id, status, opened_at, clicked_at")
          .eq("id", job.email_campaign_id)
          .maybeSingle();

        if (emailError) {
          throw new Error(`Failed to check email campaign status: ${emailError.message}`);
        }

        const emailOpened = emailCampaign && (
          emailCampaign.opened_at || 
          emailCampaign.clicked_at || 
          emailCampaign.status === "opened" || 
          emailCampaign.status === "clicked"
        );

        if (emailOpened) {
          // Email was opened, cancel the failover WhatsApp
          await supabase
            .from("cascading_jobs")
            .update({
              status: "cancelled",
              processed_at: new Date().toISOString()
            })
            .eq("id", job.id);

          cancelledCount++;
          results.push({ jobId: job.id, status: "cancelled", reason: "Email opened/clicked" });
          continue;
        }

        // Email was NOT opened, dispatch failover WhatsApp message
        const payload = job.whatsapp_payload;
        const campaignId = crypto.randomUUID();

        // 1. Create a WhatsApp campaign row in "sending" status
        await supabase
          .from("whatsapp_campaigns")
          .insert({
            id: campaignId,
            agent_id: job.agent_id,
            lead_id: job.lead_id,
            campaign_name: payload.campaign_name || "Cascading Failover WhatsApp",
            template_id: payload.template_id || null,
            template_name: payload.template_name || "Custom Msg",
            message_content: payload.text,
            status: "sending"
          });

        // 2. Call Brevo WhatsApp message endpoint
        const waResponse = await sendBrevoWhatsApp({
          senderNumber: payload.senderNumber,
          contactNumbers: [payload.recipientNumber],
          text: payload.text
        });

        const messageId = waResponse.messageId || (waResponse.messageIds && waResponse.messageIds[0]) || "";

        // 3. Update campaign row to sent
        await supabase
          .from("whatsapp_campaigns")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            message_id: messageId,
            event_history: [{ event_type: "sent", status: "sent", occurred_at: new Date().toISOString() }]
          })
          .eq("id", campaignId);

        // 4. Mark cascading job as processed
        await supabase
          .from("cascading_jobs")
          .update({
            status: "processed",
            processed_at: new Date().toISOString()
          })
          .eq("id", job.id);

        processedCount++;
        results.push({ jobId: job.id, status: "processed", reason: "Failover WhatsApp sent", messageId });
      } else {
        // Direct scheduled WhatsApp flow
        const payload = job.whatsapp_payload;
        const campaignId = payload.campaignId;

        // Call Brevo WhatsApp
        const waResponse = await sendBrevoWhatsApp({
          senderNumber: payload.senderNumber,
          contactNumbers: [payload.recipientNumber],
          text: payload.text
        });

        const messageId = waResponse.messageId || (waResponse.messageIds && waResponse.messageIds[0]) || "";

        // Update campaign row to sent with actual messageId
        await supabase
          .from("whatsapp_campaigns")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            message_id: messageId,
            event_history: [{ event_type: "sent", status: "sent", occurred_at: new Date().toISOString() }]
          })
          .eq("id", campaignId);

        // Mark cascading job as processed
        await supabase
          .from("cascading_jobs")
          .update({
            status: "processed",
            processed_at: new Date().toISOString()
          })
          .eq("id", job.id);

        processedCount++;
        results.push({ jobId: job.id, status: "processed", reason: "Scheduled WhatsApp sent", messageId });
      }
    } catch (err: any) {
      console.error(`Cascading job ${job.id} failed:`, err);
      
      await supabase
        .from("cascading_jobs")
        .update({
          status: "failed",
          processed_at: new Date().toISOString()
        })
        .eq("id", job.id);

      failedCount++;
      results.push({ jobId: job.id, status: "failed", error: err.message || "Unknown error" });
    }
  }

  return NextResponse.json({
    success: true,
    processedCount,
    cancelledCount,
    failedCount,
    results
  });
}
