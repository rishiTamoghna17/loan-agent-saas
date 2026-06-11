import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLocalDateParts } from "@/lib/follow-ups";
import { sendOverdueFollowUpDigest } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
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

  for (const preference of preferences ?? []) {
    const agent = Array.isArray(preference.agents) ? preference.agents[0] : preference.agents;
    const trialExpired = agent?.plan_status === "trial" && agent.trial_ends_at && new Date(agent.trial_ends_at).getTime() <= now.getTime();
    if (!agent || ["expired", "cancelled"].includes(agent.plan_status) || trialExpired) {
      skipped++;
      continue;
    }

    const local = getLocalDateParts(now, preference.timezone);
    if (local.hour !== preference.digest_hour) {
      skipped++;
      continue;
    }

    const { data: followUps } = await supabase
      .from("lead_follow_ups")
      .select("id,due_at,note,leads!inner(name,phone,loan_type)")
      .eq("agent_id", preference.agent_id)
      .eq("status", "pending")
      .lt("due_at", now.toISOString())
      .order("due_at", { ascending: true })
      .limit(100);

    if (!followUps?.length) {
      skipped++;
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
      sent++;
    } catch (sendError) {
      await supabase.from("notification_deliveries").update({
        status: "failed",
        error_message: sendError instanceof Error ? sendError.message.slice(0, 500) : "Reminder email failed"
      }).eq("id", delivery.id);
      failed++;
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, failed });
}
