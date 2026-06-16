import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

type CookieToSet = {
  name: string;
  value: string;
  options: Parameters<NextResponse["cookies"]["set"]>[2];
};

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    }
  );

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isAdminPath = pathname.startsWith("/admin");
  if (isAdminPath) {
    const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(email => email.trim().toLowerCase());
    if (!user || !user.email || !adminEmails.includes(user.email.toLowerCase())) {
      const url = request.nextUrl.clone();
      url.pathname = "/signin";
      url.searchParams.set("redirectedFrom", pathname);
      return NextResponse.redirect(url);
    }
  }

  const isAuthProtectedPath =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/builder") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/settings");

  const isVerificationRequiredPath =
    isAuthProtectedPath ||
    pathname.startsWith("/agent/");

  if (isAuthProtectedPath && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  if (isVerificationRequiredPath && user) {
    const isVerified = !!user.email_confirmed_at;
    if (!isVerified) {
      const url = request.nextUrl.clone();
      url.pathname = "/verify-email";
      url.searchParams.set("email", user.email || "");
      return NextResponse.redirect(url);
    }
  }

  if (request.nextUrl.pathname === "/") {
    const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();
    const appHost = process.env.NEXT_PUBLIC_APP_HOST?.toLowerCase();
    const isLocalHost = !host || host === "localhost" || host === "127.0.0.1" || host.endsWith(".vercel.app") || host === appHost;

    if (!isLocalHost) {
      const { data: customDomainAgent } = await supabase
        .from("agents")
        .select("slug")
        .eq("custom_domain", host)
        .eq("domain_status", "connected")
        .maybeSingle();

      if (customDomainAgent?.slug) {
        const url = request.nextUrl.clone();
        url.pathname = `/agent/${customDomainAgent.slug}`;
        return NextResponse.rewrite(url, response);
      }
    }
  }

  return response;
}
