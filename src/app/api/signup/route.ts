import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getFriendlyAuthError } from "@/lib/auth-errors";
import { logoFileToDataUrl, uploadAgentLogo } from "@/lib/logo-upload";
import { signupSchema } from "@/lib/schemas";
import { insertAgentProfile } from "@/lib/server-db";
import { handleProspectConversion } from "@/lib/conversions";

export const runtime = "nodejs";

function getPublicAppUrl(request: Request) {
  const configuredHost = process.env.NEXT_PUBLIC_APP_HOST?.trim();
  if (!configuredHost) return new URL(request.url).origin;
  return configuredHost.startsWith("http://") || configuredHost.startsWith("https://")
    ? configuredHost.replace(/\/$/, "")
    : `https://${configuredHost.replace(/\/$/, "")}`;
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const parsed = signupSchema.safeParse({
    business_name: formData.get("business_name"),
    agent_name: formData.get("agent_name"),
    phone: formData.get("phone"),
    whatsapp_number: formData.get("whatsapp_number"),
    email: formData.get("email"),
    password: formData.get("password"),
    city: formData.get("city"),
    district: formData.get("district"),
    state: formData.get("state"),
    pincode: formData.get("pincode"),
    landmark: formData.get("landmark"),
    slug: formData.get("slug")
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message || "Check the signup details." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "Supabase environment variables are missing." }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { password, ...profile } = parsed.data;
  const { data, error } = await supabase.auth.signUp({
    email: profile.email,
    password,
    options: {
      emailRedirectTo: `${getPublicAppUrl(request)}/auth/confirm?next=/dashboard`
    }
  });

  if (error) {
    return NextResponse.json({ error: getFriendlyAuthError(error) }, { status: 400 });
  }

  if (!data.user) {
    return NextResponse.json({ error: "Signup did not return a user. Check your Supabase auth settings." }, { status: 500 });
  }

  // Supabase may return an obfuscated user with no identities when the email
  // already exists. That UUID is intentionally not present in auth.users.
  if (!data.user.identities?.length) {
    return NextResponse.json(
      { error: "An account may already exist for this email. Please log in or reset your password." },
      { status: 400 }
    );
  }

  try {
    const agent = await insertAgentProfile({
      user_id: data.user.id,
      business_name: profile.business_name,
      agent_name: profile.agent_name,
      phone: profile.phone,
      whatsapp_number: profile.whatsapp_number,
      email: profile.email,
      city: profile.city,
      district: profile.district,
      state: profile.state,
      pincode: profile.pincode,
      landmark: profile.landmark || null,
      logo_url: null,
      slug: profile.slug,
      description: null,
      services_offered: ["Personal Loan", "Business Loan", "Home Loan"],
      primary_color: "#1769ff",
      hero_title: null,
      hero_subtitle: null,
      banner_image_url: null,
      custom_domain: null
    });

    if (agent?.id) {
      await handleProspectConversion(profile.email, agent.id);
    }
  } catch (uploadOrProfileError) {
    const message = uploadOrProfileError instanceof Error ? uploadOrProfileError.message : "Could not create the agent profile.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({
    requiresEmailConfirmation: !data.session,
    email: profile.email
  });
}
