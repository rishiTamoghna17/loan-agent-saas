import { NextResponse } from "next/server";
import { analyticsEventSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = analyticsEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid analytics event." }, { status: 400 });
  }

  const supabase = createClient();
  const { error } = await supabase.from("agent_events").insert({
    agent_id: parsed.data.agent_id,
    lead_id: parsed.data.lead_id || null,
    event_type: parsed.data.event_type,
    metadata: parsed.data.metadata || {}
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
