import { NextResponse } from "next/server";
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

export async function GET() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("id,slug")
    .eq("user_id", user.id)
    .single();

  if (agentError || !agent) {
    return NextResponse.json({ error: "Agent profile not found." }, { status: 404 });
  }

  const { data: leads, error } = await supabase
    .from("leads")
    .select(
      "name,phone,email,loan_type,required_amount,monthly_income,city,district,state,pincode,landmark,source,status,message,created_at,updated_at"
    )
    .eq("agent_id", agent.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Could not export leads." }, { status: 500 });
  }

  const rows = (leads ?? []).map((lead) => [
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
  const filename = `${agent.slug}-leads-${new Date().toISOString().slice(0, 10)}.csv`;

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
