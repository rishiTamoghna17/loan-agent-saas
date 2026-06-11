import { NextResponse } from "next/server";
import { getAdminSupabase, requireAdminUser } from "@/lib/admin-auth";

const columns = ["name", "company_name", "email", "phone", "city", "state", "loan_category", "status", "lead_score", "linkedin_url", "website_url", "notes"];

export async function POST(request: Request) {
  await requireAdminUser();
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? [...new Set(body.ids)].filter((id): id is string => typeof id === "string").slice(0, 500) : [];
  if (!ids.length) return NextResponse.json({ error: "Select at least one prospect." }, { status: 400 });
  const supabase = await getAdminSupabase();
  const { data, error } = await supabase.from("prospects").select(columns.join(",")).in("id", ids);
  if (error) return NextResponse.json({ error: "Could not export prospects." }, { status: 500 });
  const cell = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [columns, ...(data ?? []).map((row) => columns.map((key) => row[key as keyof typeof row]))].map((row) => row.map(cell).join(",")).join("\r\n");
  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="leadhub-selected-prospects.csv"',
      "cache-control": "private, no-store"
    }
  });
}
