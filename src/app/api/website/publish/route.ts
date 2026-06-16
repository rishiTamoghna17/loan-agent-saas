import { NextResponse } from "next/server";
import { verifyApiAccess } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function escapeYamlString(val: string): string {
  // Simple JSON stringify handles most escaping (quotes, newlines, etc.) cleanly for YAML double-quoted strings
  return JSON.stringify(val || "");
}

function generateYamlFrontMatter(agent: {
  id: string;
  agent_name: string;
  role?: string | null;
  business_name: string;
  phone: string;
  email: string;
  whatsapp_number: string;
  photo_url?: string | null;
  logo_url?: string | null;
  chosen_theme?: string | null;
  services?: any;
  description?: string | null;
  licensing_info?: string | null;
}) {
  const lines = [
    "---",
    `agent_id: ${escapeYamlString(agent.id)}`,
    `title: ${escapeYamlString(agent.agent_name)}`,
    `role: ${escapeYamlString(agent.role || "")}`,
    `company: ${escapeYamlString(agent.business_name)}`,
    `phone: ${escapeYamlString(agent.phone)}`,
    `email: ${escapeYamlString(agent.email)}`,
    `whatsapp: ${escapeYamlString(agent.whatsapp_number)}`,
    `photo: ${escapeYamlString(agent.photo_url || "")}`,
    `logo: ${escapeYamlString(agent.logo_url || "")}`,
    `theme: ${escapeYamlString(agent.chosen_theme || "authority")}`,
    `licensing_info: ${escapeYamlString(agent.licensing_info || "")}`,
    // Backward compatibility with existing default templates in local testing
    `name: ${escapeYamlString(agent.agent_name)}`,
    `bio: ${escapeYamlString(agent.description || "")}`,
    "contact:",
    `  phone: ${escapeYamlString(agent.phone)}`,
    `  email: ${escapeYamlString(agent.email)}`,
    `  company: ${escapeYamlString(agent.business_name)}`,
    `  whatsapp: ${escapeYamlString(agent.whatsapp_number)}`,
    `  photo: ${escapeYamlString(agent.photo_url || "")}`,
    `  logo: ${escapeYamlString(agent.logo_url || "")}`,
  ];

  if (Array.isArray(agent.services) && agent.services.length > 0) {
    lines.push("services:");
    agent.services.forEach((service: any) => {
      lines.push(`  - title: ${escapeYamlString(service.title)}`);
      lines.push(`    description: ${escapeYamlString(service.description)}`);
    });
  } else {
    lines.push("services: []");
  }

  lines.push("---");
  lines.push(agent.description || "");

  return lines.join("\n");
}

export async function POST(request: Request) {
  // 1. Authenticate user session
  const access = await verifyApiAccess(request);
  if (access.response) {
    return access.response;
  }
  const user = access.user!;
  const supabase = createClient();

  // 2. Retrieve GitHub tokens
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.error("Missing GITHUB_TOKEN environment variable.");
    return NextResponse.json(
      { error: "GitHub integration is not configured on the server." },
      { status: 500 }
    );
  }
  const owner = process.env.GITHUB_OWNER || "rishiTamoghna17";
  const repo = "leadhub-agent-sites";

  // 3. Parse request payload
  let body: any;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  const {
    name,
    role,
    company,
    phone,
    email,
    whatsapp,
    licensing_info,
    logo,
    photo,
    chosen_theme,
    bio,
    services
  } = body;

  if (!name || !bio) {
    return NextResponse.json(
      { error: "Agent 'name' and 'bio' are required fields." },
      { status: 400 }
    );
  }

  // 4. Update Supabase record for the agent
  const { error: updateError } = await supabase
    .from("agents")
    .update({
      agent_name: name,
      role: role || null,
      business_name: company || "",
      phone: phone || "",
      email: email || "",
      whatsapp_number: whatsapp || "",
      licensing_info: licensing_info || null,
      logo_url: logo || null,
      photo_url: photo || null,
      chosen_theme: chosen_theme || "authority",
      description: bio,
      services: services || []
    })
    .eq("user_id", user.id);

  if (updateError) {
    console.error("Database update error:", updateError);
    return NextResponse.json(
      { error: "Failed to update agent profile in database.", details: updateError.message },
      { status: 500 }
    );
  }

  // 5. Fetch fully updated agent profile to get generated values
  const { data: agent, error: fetchError } = await supabase
    .from("agents")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (fetchError || !agent) {
    console.error("Database fetch error:", fetchError);
    return NextResponse.json(
      { error: "Failed to retrieve updated agent profile.", details: fetchError?.message },
      { status: 500 }
    );
  }

  const slug = agent.website_slug || agent.slug;
  if (!slug) {
    return NextResponse.json(
      { error: "Agent does not have a valid website subdomain slug." },
      { status: 400 }
    );
  }

  // 6. Generate Markdown Front Matter String
  const markdownContent = generateYamlFrontMatter(agent);

  // 7. Get file status on GitHub (check for existing blob sha)
  const githubPath = `content/agents/${slug}.md`;
  const githubApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${githubPath}`;
  const githubHeaders = {
    "Authorization": `Bearer ${githubToken}`,
    "Accept": "application/vnd.github+json",
    "User-Agent": "leadhub-saas-app"
  };

  let fileSha: string | undefined;
  try {
    const getRes = await fetch(githubApiUrl, {
      method: "GET",
      headers: githubHeaders,
      cache: "no-store"
    });

    if (getRes.ok) {
      const getJson = await getRes.json();
      fileSha = getJson.sha;
    } else if (getRes.status !== 404) {
      const errorText = await getRes.text();
      console.warn(`GitHub API status check returned ${getRes.status}: ${errorText}`);
    }
  } catch (err: any) {
    console.error("Error checking file status on GitHub:", err);
  }

  // 8. PUT Markdown content to GitHub API
  const contentBase64 = Buffer.from(markdownContent, "utf-8").toString("base64");
  const putPayload = {
    message: `Update website for ${agent.agent_name}`,
    content: contentBase64,
    sha: fileSha
  };

  try {
    const putRes = await fetch(githubApiUrl, {
      method: "PUT",
      headers: {
        ...githubHeaders,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(putPayload)
    });

    if (!putRes.ok) {
      const errorText = await putRes.text();
      console.error(`GitHub API PUT request failed: ${putRes.status} ${errorText}`);
      return NextResponse.json(
        { error: "Failed to push content update to GitHub.", details: errorText },
        { status: putRes.status }
      );
    }
  } catch (err: any) {
    console.error("Network or internal error during GitHub API push:", err);
    return NextResponse.json(
      { error: "Failed to communicate with GitHub API.", details: err.message || String(err) },
      { status: 500 }
    );
  }

  // 9. Update Supabase deployment status
  const { error: finalUpdateError } = await supabase
    .from("agents")
    .update({
      is_website_published: true,
      last_published_at: new Date().toISOString()
    })
    .eq("user_id", user.id);

  if (finalUpdateError) {
    console.error("Failed to update publication status in database:", finalUpdateError);
    return NextResponse.json(
      { error: "Website was published to GitHub but database status update failed.", details: finalUpdateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Website content pushed and published successfully.",
    website_slug: slug
  });
}
