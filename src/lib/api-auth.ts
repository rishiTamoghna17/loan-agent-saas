import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function verifyApiAccess(request: Request) {
  const supabase = createClient();
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;
  
  const {
    data: { user },
    error: userError
  } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();

  if (userError || !user) {
    return {
      user: null,
      agent: null,
      response: NextResponse.json({ error: "Authentication required." }, { status: 401 })
    };
  }

  // Confirm email is verified
  if (!user.email_confirmed_at) {
    return {
      user,
      agent: null,
      response: NextResponse.json(
        {
          code: "EMAIL_NOT_VERIFIED",
          message: "Please verify your email before continuing."
        },
        { status: 403 }
      )
    };
  }

  // Find matching agent
  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (agentError || !agent || agent.is_active === false || agent.email_verified === false) {
    return {
      user,
      agent: null,
      response: NextResponse.json(
        {
          code: "AGENT_SETUP_INCOMPLETE",
          message: "Your account setup is still being completed."
        },
        { status: 403 }
      )
    };
  }

  return { user, agent, response: null };
}
