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
      console.warn(`Hugo page not found at ${targetUrl}. Checking GitHub file status...`);

      const githubToken = process.env.GITHUB_TOKEN;
      const owner = process.env.GITHUB_OWNER || "rishiTamoghna17";
      const repo = "leadhub-agent-sites";
      const githubPath = `content/agents/${agentSlug}.md`;
      const githubApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${githubPath}`;

      if (githubToken) {
        try {
          const githubRes = await fetch(githubApiUrl, {
            headers: {
              "Authorization": `Bearer ${githubToken}`,
              "Accept": "application/vnd.github+json",
              "User-Agent": "leadhub-saas-agent-renderer"
            },
            cache: "no-store"
          });

          if (githubRes.ok) {
            return (
              <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center" style={{ fontFamily: "sans-serif" }}>
                <div style={{ maxWidth: "450px", margin: "0 auto", padding: "40px 20px" }}>
                  <div style={{
                    height: "64px",
                    width: "64px",
                    backgroundColor: "rgba(20, 184, 166, 0.1)",
                    border: "1px solid #14b8a6",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 24px",
                  }}>
                    <svg style={{ height: "32px", width: "32px", color: "#14b8a6", animation: "spin 2s linear infinite" }} fill="none" viewBox="0 0 24 24">
                      <style>{`
                        @keyframes spin {
                          0% { transform: rotate(0deg); }
                          100% { transform: rotate(360deg); }
                        }
                      `}</style>
                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <div style={{ marginBottom: "24px" }}>
                    <h1 style={{ fontSize: "24px", fontWeight: "900", color: "#ffffff", margin: "0 0 8px" }}>Compilation in Progress</h1>
                    <p style={{ fontSize: "14px", color: "#94a3b8", lineHeight: "1.6", margin: "0" }}>
                      Your website updates have been successfully pushed to GitHub and are currently being compiled and deployed by Vercel.
                    </p>
                  </div>
                  <div style={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: "12px",
                    padding: "20px",
                    fontSize: "12px",
                    color: "#64748b",
                    textAlign: "left",
                    lineHeight: "1.8",
                    marginBottom: "24px"
                  }}>
                    <p style={{ margin: "0 0 8px", color: "#10b981" }}>✔ **Step 1:** Saved changes to Supabase database</p>
                    <p style={{ margin: "0 0 8px", color: "#10b981" }}>✔ **Step 2:** Pushed Markdown Front Matter to GitHub</p>
                    <p style={{ margin: "0", color: "#f59e0b" }}>⚡ **Step 3:** Vercel static site deployment compiling...</p>
                  </div>
                  <p style={{ fontSize: "11px", color: "#475569", marginBottom: "16px" }}>This page will automatically refresh in 10 seconds.</p>
                  <a
                    href=""
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "10px 20px",
                      backgroundColor: "#14b8a6",
                      color: "#020617",
                      fontWeight: "bold",
                      fontSize: "12px",
                      borderRadius: "8px",
                      textDecoration: "none"
                    }}
                  >
                    Refresh Now
                  </a>
                  <script dangerouslySetInnerHTML={{ __html: `setTimeout(() => window.location.reload(), 10000);` }} />
                </div>
              </div>
            );
          }
        } catch (githubErr) {
          console.error("Failed to check GitHub file status fallback:", githubErr);
        }
      }

      console.error(`Hugo page fetch failed for URL: ${targetUrl}. HTTP Status: ${res.status}`);
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
