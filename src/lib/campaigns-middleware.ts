import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type CampaignAccessResult = 
  | { allowed: true; agent: any; supabase: any }
  | { allowed: false; response: NextResponse };

/**
 * Server-Side Plan Verification Middleware/Helper
 * Verifies user's authentication and check plan status for WhatsApp campaigns.
 */
export async function verifyCampaignAccess(request: Request): Promise<CampaignAccessResult> {
  const supabase = createClient();
  
  // Try retrieving authorization token from header (for APIs) or cookie session
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;
  
  const {
    data: { user },
    error: userError
  } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();

  if (userError || !user) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: "Authentication required to access marketing campaign features." },
        { status: 401 }
      )
    };
  }

  // Fetch the agent's subscription/plan type from the database
  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (agentError || !agent) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: "Agent workspace profile not found." },
        { status: 404 }
      )
    };
  }

  // Plan type check: reject if agent is on 'trial'
  // Support both plan_type and plan_status (aliased to ensure safety)
  const planType = agent.plan_type || agent.plan_status;
  if (planType === "trial") {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: "WhatsApp campaigns are disabled during your trial period. Please upgrade to a Pro plan to start messaging." },
        { status: 403 }
      )
    };
  }

  return { allowed: true, agent, supabase };
}
