import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SCORE_RULES, updateLeadScore } from "@/lib/lead-scoring";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const body = rawBody ? JSON.parse(rawBody) : {};
    const prospectId = typeof body.prospect_id === "string" ? body.prospect_id : "";
    const pageUrl = typeof body.page_url === "string" ? body.page_url : "";
    const userAgent = request.headers.get("user-agent") || "";
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;

    if (!prospectId || !pageUrl) {
      return NextResponse.json({ error: "Invalid tracking payload" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: prospect } = await supabase
      .from("prospects")
      .select("id")
      .eq("id", prospectId)
      .maybeSingle();

    if (!prospect) {
      return NextResponse.json({ success: true, tracked: false });
    }

    const { data: existingVisit } = await supabase
      .from("website_visits")
      .select("id")
      .eq("prospect_id", prospectId)
      .limit(1)
      .maybeSingle();

    await supabase.from("website_visits").insert({
      prospect_id: prospectId,
      page_url: pageUrl,
      user_agent: userAgent,
      ip_address: ipAddress
    });

    if (!existingVisit) {
      await updateLeadScore(prospectId, SCORE_RULES.VISITED_DEMO);
      await supabase
        .from("prospects")
        .update({ status: "demo_requested" })
        .eq("id", prospectId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid tracking payload" }, { status: 400 });
    }

    console.error("Demo tracking error:", error);
    return NextResponse.json({ error: "Tracking failed" }, { status: 500 });
  }
}
