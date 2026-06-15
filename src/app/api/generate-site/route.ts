import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateAgentSite, AgentData } from "@/lib/site-builder";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // 1. Authenticate user session
  const supabase = createClient();
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : undefined;
  
  const {
    data: { user },
    error: userError
  } = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "Authentication required to generate websites." },
      { status: 401 }
    );
  }

  // 2. Parse and validate payload
  let body: any;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  const { agentId, agentData } = body;
  const targetAgentId = agentId || user.id;

  if (!agentData) {
    return NextResponse.json(
      { error: "Missing required 'agentData' parameter." },
      { status: 400 }
    );
  }

  const { name, bio, contact, services } = agentData;

  if (!name || !bio) {
    return NextResponse.json(
      { error: "Agent 'name' and 'bio' are required fields." },
      { status: 400 }
    );
  }

  const structuredAgentData: AgentData = {
    name,
    bio,
    contact: contact || {},
    services: Array.isArray(services) ? services : [],
  };

  // 3. Execute Hugo Build and return results
  try {
    const publicUrl = await generateAgentSite(targetAgentId, structuredAgentData);
    return NextResponse.json({
      success: true,
      message: "Website generated and compiled successfully.",
      publicUrl,
    });
  } catch (error: any) {
    console.error("Hugo build engine failure:", error);
    
    // Return 500 containing the CLI build log details as requested
    return NextResponse.json(
      {
        error: "Static site compilation failed.",
        details: error.message || String(error),
      },
      { status: 500 }
    );
  }
}
