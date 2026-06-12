import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLocalDateParts } from "@/lib/follow-ups";
import { sendOverdueFollowUpDigest } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authorization = request.headers.get("authorization");
  if (!cronSecret) {
    console.error("Follow-up reminder cron rejected: CRON_SECRET is missing in this deployment.");
    return NextResponse.json({ error: "Cron authentication is not configured." }, { status: 401 });
  }
  if (authorization !== `Bearer ${cronSecret}`) {
    console.warn("Follow-up reminder cron rejected: authorization header did not match CRON_SECRET.", {
      userAgent: request.headers.get("user-agent"),
      hasAuthorizationHeader: Boolean(authorization)
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const appUrl = (process.env.NEXT_PUBLIC_APP_HOST || process.env.CAMPAIGN_BASE_URL || new URL(request.url).origin).replace(/\/$/, "");
  const { data: preferences, error } = await supabase
    .from("agent_notification_preferences")
    .select("agent_id,timezone,digest_hour,agents!inner(id,agent_name,business_name,email,plan_status,trial_ends_at)")
    .eq("overdue_digest_email_enabled", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const results: Array<{ agentId: string; result: string; detail?: string; itemCount?: number }> = [];

  for (const preference of preferences ?? []) {
    const agent = Array.isArray(preference.agents) ? preference.agents[0] : preference.agents;
    const trialExpired = agent?.plan_status === "trial" && agent.trial_ends_at && new Date(agent.trial_ends_at).getTime() <= now.getTime();
    if (!agent || ["expired", "cancelled"].includes(agent.plan_status) || trialExpired) {
      skipped++;
      results.push({ agentId: preference.agent_id, result: "skipped", detail: "Agent plan is inactive." });
      continue;
    }

    const local = getLocalDateParts(now, preference.timezone);
    const { data: followUps, error: followUpsError } = await supabase
      .from("lead_follow_ups")
      .select("id,due_at,note,leads!inner(name,phone,loan_type)")
      .eq("agent_id", preference.agent_id)
      .eq("status", "pending")
      .lte("due_at", now.toISOString())
      .order("due_at", { ascending: true })
      .limit(100);

    if (followUpsError) {
      failed++;
      results.push({ agentId: preference.agent_id, result: "failed", detail: followUpsError.message });
      continue;
    }

    if (!followUps?.length) {
      skipped++;
      results.push({ agentId: preference.agent_id, result: "skipped", detail: "No due follow-ups." });
      continue;
    }

    const { data: delivery, error: deliveryError } = await supabase
      .from("notification_deliveries")
      .insert({
        agent_id: preference.agent_id,
        notification_type: "overdue_follow_up_digest",
        local_date: local.localDate,
        status: "sending",
        item_count: followUps.length
      })
      .select("id")
      .single();

    if (deliveryError || !delivery) {
      skipped++;
      results.push({
        agentId: preference.agent_id,
        result: "skipped",
        detail: deliveryError?.message || "A reminder delivery already exists for today.",
        itemCount: followUps.length
      });
      continue;
    }

    try {
      const message = await sendOverdueFollowUpDigest({
        agentEmail: agent.email,
        agentName: agent.agent_name,
        businessName: agent.business_name,
        dashboardUrl: `${appUrl}/dashboard?followUp=overdue`,
        timezone: preference.timezone,
        followUps: followUps.map((followUp) => {
          const lead = Array.isArray(followUp.leads) ? followUp.leads[0] : followUp.leads;
          return {
            leadName: lead?.name ?? "Lead",
            phone: lead?.phone ?? "",
            loanType: lead?.loan_type ?? "",
            dueAt: followUp.due_at,
            note: followUp.note
          };
        })
      });
      await supabase.from("notification_deliveries").update({
        status: "sent",
        provider_message_id: message.messageId || null,
        sent_at: new Date().toISOString()
      }).eq("id", delivery.id);
      const completedAt = new Date().toISOString();
      const { error: completionError } = await supabase
        .from("lead_follow_ups")
        .update({
          status: "completed",
          completed_at: completedAt,
          completion_source: "reminder_email"
        })
        .in("id", followUps.map((followUp) => followUp.id))
        .eq("agent_id", preference.agent_id)
        .eq("status", "pending");
      if (completionError) {
        const { error: fallbackCompletionError } = await supabase
          .from("lead_follow_ups")
          .update({ status: "completed", completed_at: completedAt })
          .in("id", followUps.map((followUp) => followUp.id))
          .eq("agent_id", preference.agent_id)
          .eq("status", "pending");
        if (fallbackCompletionError) {
          throw new Error(`Email sent, but follow-up completion failed: ${fallbackCompletionError.message}`);
        }
      }
      sent++;
      results.push({ agentId: preference.agent_id, result: "sent", itemCount: followUps.length });
    } catch (sendError) {
      await supabase.from("notification_deliveries").update({
        status: "failed",
        error_message: sendError instanceof Error ? sendError.message.slice(0, 500) : "Reminder email failed"
      }).eq("id", delivery.id);
      failed++;
      results.push({
        agentId: preference.agent_id,
        result: "failed",
        detail: sendError instanceof Error ? sendError.message : "Reminder email failed",
        itemCount: followUps.length
      });
    }
  }

  console.info("Follow-up reminder cron completed.", { sent, skipped, failed, results });
  return NextResponse.json({ ok: failed === 0, sent, skipped, failed, results });
}
