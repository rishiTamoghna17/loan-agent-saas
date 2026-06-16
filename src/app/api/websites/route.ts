import { NextResponse } from "next/server";
import { verifyApiAccess } from "@/lib/api-auth";
import { generateAgentSite, AgentData } from "@/lib/site-builder";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // 1. Authenticate and check api access
  const access = await verifyApiAccess(request);
  if (access.response) {
    return access.response;
  }
  const user = access.user!;

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
      message: "Website compiled successfully.",
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
