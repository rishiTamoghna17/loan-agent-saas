import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const pathname = request.nextUrl.pathname;

  // Extract hostname (strip port in local development)
  const hostname = host.split(":")[0].toLowerCase();
  
  // Extract subdomain based on environment configurations
  let subdomain: string | null = null;
  const appHost = (process.env.NEXT_PUBLIC_APP_HOST || "leadhub.com").toLowerCase();
  const rootDomain = "leadhub.com";
  const cleanAppHost = appHost.replace(/^https?:\/\//, "").split(":")[0];

  const isPrimaryDomain = 
    hostname === rootDomain || 
    hostname === `www.${rootDomain}` || 
    hostname === cleanAppHost || 
    hostname === `www.${cleanAppHost}` || 
    hostname === "localhost" || 
    hostname === "127.0.0.1" ||
    hostname.endsWith(".vercel.app");

  // A custom domain is any hostname that is not a primary domain and does not end with our primary domain/local domain suffixes
  const isCustomDomain = 
    !isPrimaryDomain && 
    !hostname.endsWith(`.${cleanAppHost}`) && 
    !hostname.endsWith(`.${rootDomain}`) && 
    !hostname.endsWith(".localhost") && 
    !hostname.endsWith(".lvh.me");

  if (hostname.endsWith(`.${appHost}`)) {
    subdomain = hostname.replace(`.${appHost}`, "");
  } else if (hostname.endsWith(".localhost")) {
    subdomain = hostname.replace(".localhost", "");
  } else if (hostname.endsWith(".lvh.me")) {
    subdomain = hostname.replace(".lvh.me", "");
  }

  // Handle custom domain rewrites to serve static pages and assets
  if (isCustomDomain) {
    const isSystemAsset = pathname.startsWith("/_next") || pathname === "/favicon.ico";
    if (isSystemAsset) {
      return updateSession(request);
    }
    
    const url = request.nextUrl.clone();
    url.pathname = "/api/website/serve-custom";
    url.searchParams.set("host", hostname);
    url.searchParams.set("path", pathname);
    return NextResponse.rewrite(url);
  }

  // Define SaaS system routes and reserved subdomains to skip rewrite
  const isReservedSubdomain = 
    !subdomain || 
    subdomain === "www" || 
    subdomain === "api" || 
    subdomain === "admin" || 
    subdomain === "dashboard";

  const isSystemPath = 
    pathname.startsWith("/_next") || 
    pathname.startsWith("/api") || 
    pathname.startsWith("/dashboard") || 
    pathname.startsWith("/admin") || 
    pathname.startsWith("/login") || 
    pathname.startsWith("/signup") || 
    pathname.startsWith("/auth");

  if (isReservedSubdomain || isSystemPath) {
    // Standard SaaS user session validation & routing
    return updateSession(request);
  }

  // Transparently rewrite subdomain requests to the public sites catch-all route
  const url = request.nextUrl.clone();
  url.pathname = `/sites/${subdomain}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Match all paths except Next.js system assets & global favicon
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
