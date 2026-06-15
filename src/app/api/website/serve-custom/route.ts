import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function getMimeType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    html: "text/html; charset=utf-8",
    css: "text/css; charset=utf-8",
    js: "application/javascript; charset=utf-8",
    json: "application/json",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    xml: "application/xml",
    txt: "text/plain; charset=utf-8",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    otf: "font/otf",
  };
  return mimeTypes[ext || ""] || "application/octet-stream";
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const host = searchParams.get("host");
  const path = searchParams.get("path") || "/";

  if (!host) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 1. Query Supabase to find agent by custom_link mapping
  const supabase = createClient();
  const { data: agent, error } = await supabase
    .from("agents")
    .select("*")
    .eq("custom_link", host)
    .single();

  if (error || !agent) {
    console.warn(`No agent mapped to custom link: ${host}`);
    return NextResponse.redirect(new URL("/", request.url));
  }

  const slug = agent.website_slug || agent.slug;
  if (!slug) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const hugoDeploymentUrl = process.env.HUGO_DEPLOYMENT_URL || "https://leadhub-agent-sites.vercel.app";
  const cleanPath = "/" + path.replace(/^\/+|\/+$/g, "");

  // 2. Identify if request is for a static asset or an HTML page page
  const isStaticAsset = /\.(css|js|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|json|xml|txt)$/i.test(cleanPath);

  if (isStaticAsset) {
    const assetUrl = `${hugoDeploymentUrl}${cleanPath}`;
    try {
      const assetRes = await fetch(assetUrl, {
        headers: {
          "User-Agent": "leadhub-saas-proxy"
        }
      });

      if (!assetRes.ok) {
        return new Response("Asset Not Found", { status: 404 });
      }

      const contentType = assetRes.headers.get("content-type") || getMimeType(cleanPath);
      const buffer = await assetRes.arrayBuffer();

      return new Response(buffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } catch (err) {
      console.error(`Error proxying asset ${cleanPath} from Hugo:`, err);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  // 3. Serve HTML Page Content (e.g. /, /about, /services)
  let pagePath = cleanPath;
  if (pagePath === "/" || pagePath === "") {
    pagePath = `/agents/${slug}/index.html`;
  } else {
    const trimmed = pagePath.replace(/^\/+|\/+$/g, "");
    pagePath = `/agents/${slug}/${trimmed}/index.html`;
  }

  const targetUrl = `${hugoDeploymentUrl}${pagePath}`;

  try {
    const pageRes = await fetch(targetUrl, {
      cache: "no-store",
      headers: {
        "User-Agent": "leadhub-saas-proxy"
      }
    });

    if (!pageRes.ok) {
      console.warn(`Hugo page not found at ${targetUrl}. Falling back to agent homepage.`);
      const fallbackUrl = `${hugoDeploymentUrl}/agents/${slug}/index.html`;
      const fallbackRes = await fetch(fallbackUrl, { cache: "no-store" });
      if (!fallbackRes.ok) {
        return NextResponse.redirect(new URL("/", request.url));
      }
      const rawHtml = await fallbackRes.text();
      return new Response(rawHtml, {
        headers: {
          "Content-Type": "text/html; charset=utf-8"
        }
      });
    }

    const html = await pageRes.text();
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8"
      }
    });
  } catch (err) {
    console.error("Error fetching agent site page:", err);
    return NextResponse.redirect(new URL("/", request.url));
  }
}
