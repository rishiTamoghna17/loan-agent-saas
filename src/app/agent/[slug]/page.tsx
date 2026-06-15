import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

// Disable Next.js page caching for dynamic static proxied pages
export const revalidate = 0;

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function AgentPage({ params }: PageProps) {
  const { slug } = params;

  // 1. Query Supabase to find agent by website_slug
  const supabase = createClient();
  const { data: agent, error } = await supabase
    .from("agents")
    .select("*")
    .eq("website_slug", slug)
    .single();

  let activeAgent = agent;

  if (error || !agent) {
    // Fallback search using the old slug column
    const { data: fallbackAgent, error: fallbackError } = await supabase
      .from("agents")
      .select("*")
      .eq("slug", slug)
      .single();

    if (fallbackError || !fallbackAgent) {
      notFound();
    }
    activeAgent = fallbackAgent;
  }

  const agentSlug = activeAgent.website_slug || activeAgent.slug;

  const hugoDeploymentUrl = process.env.HUGO_DEPLOYMENT_URL || "https://leadhub-agent-sites.vercel.app";
  const targetUrl = `${hugoDeploymentUrl}/agents/${agentSlug}/index.html`;

  try {
    const res = await fetch(targetUrl, {
      cache: "no-store",
      headers: {
        "User-Agent": "leadhub-saas-agent-renderer"
      }
    });

    if (!res.ok) {
      console.warn(`Hugo page not found at ${targetUrl}.`);
      notFound();
    }

    let html = await res.text();

    // Rewrite relative asset references to point absolutely to the Hugo deployment URL
    html = html.replace(/(href|src)="\/([^"]+)"/g, (match, attr, path) => {
      if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("//")) {
        return match;
      }
      return `${attr}="${hugoDeploymentUrl}/${path}"`;
    });

    // Also rewrite relative references that do not start with "/"
    html = html.replace(/(href|src)="(?!\/\/|http|https|mailto:|tel:|#|\/)([^"]+)"/g, `$1="${hugoDeploymentUrl}/$2"`);

    return (
      <div dangerouslySetInnerHTML={{ __html: html }} />
    );
  } catch (err) {
    console.error("Error loading agent static page from Hugo:", err);
    notFound();
  }
}
