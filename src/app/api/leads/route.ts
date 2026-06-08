import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { sendNewLeadEmail } from "@/lib/email";
import { leadSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = leadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || "Check the lead details." }, { status: 400 });
  }

  const agentId = typeof body?.agent_id === "string" ? body.agent_id : "";
  if (!agentId) {
    return NextResponse.json({ error: "Agent is required." }, { status: 400 });
  }

  const supabase = createClient();
  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id,agent_name,business_name,email")
    .eq("id", agentId)
    .single();

  if (agentError || !agent) {
    return NextResponse.json({ error: "Agent page is not available." }, { status: 404 });
  }

  const values = parsed.data;
  const leadId = randomUUID();
  const { error } = await supabase
    .from("leads")
    .insert({
      id: leadId,
      agent_id: agent.id,
      name: values.name,
      phone: values.phone,
      email: values.email || null,
      loan_type: values.loan_type,
      required_amount: Number(values.required_amount),
      monthly_income: values.monthly_income === "" || values.monthly_income == null ? null : Number(values.monthly_income),
      city: values.city,
      district: values.district,
      state: values.state,
      pincode: values.pincode,
      landmark: values.landmark || null,
      source: values.source,
      message: values.message || null
    });

  if (error) {
    return NextResponse.json({ error: error?.message || "Could not submit the lead." }, { status: 400 });
  }

  await supabase.from("agent_events").insert({
    agent_id: agent.id,
    lead_id: leadId,
    event_type: "lead_submission",
    metadata: { source: values.source, loan_type: values.loan_type }
  });

  try {
    const origin = new URL(request.url).origin;
    await sendNewLeadEmail({
      agentEmail: agent.email,
      agentName: agent.agent_name,
      businessName: agent.business_name,
      leadName: values.name,
      phone: values.phone,
      loanType: values.loan_type,
      amount: Number(values.required_amount),
      source: values.source,
      city: values.city,
      dashboardUrl: `${origin}/dashboard`
    });
  } catch (emailError) {
    console.error("Lead notification email failed", emailError);
  }

  return NextResponse.json({ ok: true, lead_id: leadId });
}
