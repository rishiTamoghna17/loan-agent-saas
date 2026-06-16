import { NextResponse } from "next/server";
import { verifyApiAccess } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";

const HEADERS = [
  "Name",
  "Phone",
  "Email",
  "Loan Type",
  "Required Amount",
  "Monthly Income",
  "City",
  "District",
  "State",
  "Pincode",
  "Landmark",
  "Source",
  "Status",
  "Message",
  "Created At",
  "Updated At"
];

export async function GET(request: Request) {
  const access = await verifyApiAccess(request);
  if (access.response) {
    return access.response;
  }
  const agent = access.agent!;
  const supabase = createClient();

  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  const status = url.searchParams.get("status");
  const source = url.searchParams.get("source");
  const loanType = url.searchParams.get("loanType");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const followUp = url.searchParams.get("followUp");
  let followUpLeadIds: string[] | null = null;
  if (followUp) {
    const { data: tasks } = await supabase
      .from("lead_follow_ups")
      .select("lead_id,due_at")
      .eq("agent_id", agent.id)
      .eq("status", "pending");
    const now = new Date();
    const { data: preferences } = await supabase.from("agent_notification_preferences").select("timezone").eq("agent_id", agent.id).maybeSingle();
    const timezone = preferences?.timezone ?? "Asia/Kolkata";
    const { classifyFollowUp } = await import("@/lib/follow-ups");
    followUpLeadIds = (tasks ?? []).filter((task) => followUp === "none" ? false : classifyFollowUp(task.due_at, timezone, now) === followUp).map((task) => task.lead_id);
    if (followUp === "none") {
      const pendingIds = new Set((tasks ?? []).map((task) => task.lead_id));
      const { data: allIds } = await supabase.from("leads").select("id").eq("agent_id", agent.id);
      followUpLeadIds = (allIds ?? []).filter((lead) => !pendingIds.has(lead.id)).map((lead) => lead.id);
    }
  }

  let leadQuery = supabase
    .from("leads")
    .select(
      "name,phone,email,loan_type,required_amount,monthly_income,city,district,state,pincode,landmark,source,status,message,created_at,updated_at"
    )
    .eq("agent_id", agent.id);
  if (query) leadQuery = leadQuery.or(`name.ilike.%${query}%,phone.ilike.%${query}%`);
  if (status) leadQuery = leadQuery.eq("status", status);
  if (source) leadQuery = leadQuery.eq("source", source);
  if (loanType) leadQuery = leadQuery.eq("loan_type", loanType);
  if (from) leadQuery = leadQuery.gte("created_at", `${from}T00:00:00`);
  if (to) leadQuery = leadQuery.lte("created_at", `${to}T23:59:59`);
  if (followUpLeadIds) {
    if (!followUpLeadIds.length) return csvResponse([], agent.slug);
    leadQuery = leadQuery.in("id", followUpLeadIds);
  }
  const { data: leads, error } = await leadQuery.order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Could not export leads." }, { status: 500 });
  }

  return csvResponse(leads ?? [], agent.slug);
}

function csvResponse(leads: any[], slug: string) {
  const rows = leads.map((lead) => [
    lead.name,
    lead.phone,
    lead.email,
    lead.loan_type,
    lead.required_amount,
    lead.monthly_income,
    lead.city,
    lead.district,
    lead.state,
    lead.pincode,
    lead.landmark,
    lead.source,
    lead.status,
    lead.message,
    lead.created_at,
    lead.updated_at
  ]);
  const csv = [HEADERS, ...rows].map((row) => row.map(toCsvCell).join(",")).join("\r\n");
  const filename = `${slug}-leads-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store"
    }
  });
}

function toCsvCell(value: string | number | null) {
  if (value == null) return "";
  const text = String(value);
  return `"${text.replaceAll('"', '""')}"`;
}
