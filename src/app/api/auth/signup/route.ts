import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signupSchema } from "@/lib/schemas";
import { getServerDb } from "@/lib/server-db";

export const runtime = "nodejs";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(0, 10);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Check signup details." }, { status: 400 });
    }

    const values = parsed.data;
    const normalizedEmail = normalizeEmail(values.email);
    const phone = normalizePhone(values.phone);
    const whatsapp_number = normalizePhone(values.whatsapp_number);
    const { business_name, agent_name, password, city, district, state, pincode, landmark, slug } = values;
    const area_city = city;

    const db = getServerDb();
    const origin = new URL(request.url).origin;
    
    // 1. Check if a verified agent exists
    const verifiedAgentResult = await db.query(
      `select id from public.agents where email = $1 and email_verified = true limit 1`,
      [normalizedEmail]
    );
    if (verifiedAgentResult.rows.length > 0) {
      return NextResponse.json({
        code: "ACCOUNT_ALREADY_EXISTS",
        status: "ACCOUNT_ALREADY_EXISTS",
        message: "An account already exists with this email. Please sign in."
      }, { status: 400 });
    }

    // 2. Check if a Supabase Auth user already exists and check if verified
    const authUserResult = await db.query(
      `select id, email_confirmed_at from auth.users where email = $1 limit 1`,
      [normalizedEmail]
    );
    const authUser = authUserResult.rows[0];

    if (authUser) {
      if (authUser.email_confirmed_at !== null) {
        return NextResponse.json({
          code: "ACCOUNT_ALREADY_EXISTS",
          status: "ACCOUNT_ALREADY_EXISTS",
          message: "An account already exists with this email. Please sign in."
        }, { status: 400 });
      }

      // Check pending signups
      const pendingResult = await db.query(
        `select * from public.pending_agent_signups where email = $1 limit 1`,
        [normalizedEmail]
      );
      const pending = pendingResult.rows[0];

      // Enforce rate limit cooldown
      if (pending && pending.last_verification_sent_at) {
        const lastSent = new Date(pending.last_verification_sent_at).getTime();
        const elapsed = (Date.now() - lastSent) / 1000;
        if (elapsed < 60) {
          return NextResponse.json({
            status: "RATE_LIMITED",
            code: "RESEND_COOLDOWN",
            message: "Please wait before requesting another verification email.",
            retry_after: Math.ceil(60 - elapsed)
          }, { status: 429 });
        }
      }

      // Update pending signup with latest details
      await db.query(
        `update public.pending_agent_signups
         set business_name = $1, agent_name = $2, phone = $3, whatsapp_number = $4,
             pincode = $5, area_city = $6, district = $7, state = $8, landmark = $9,
             resend_count = resend_count + 1, last_verification_sent_at = now(), updated_at = now()
         where email = $10`,
        [
          business_name,
          agent_name,
          phone,
          whatsapp_number,
          pincode,
          area_city,
          district,
          state,
          landmark || null,
          normalizedEmail
        ]
      );

      // Resend signup verification
      let resendError = null;
      if (process.env.PLAYWRIGHT_TEST === "true") {
        console.log("Mocking Supabase resend for test:", normalizedEmail);
      } else {
        const supabase = createAdminClient();
        const res = await supabase.auth.resend({
          type: "signup",
          email: normalizedEmail,
          options: {
            emailRedirectTo: `${origin}/auth/callback`
          }
        });
        resendError = res.error;
      }

      if (resendError) {
        const isRateLimit = resendError.message.toLowerCase().includes("rate limit") || resendError.status === 429;
        return NextResponse.json({
          error: isRateLimit ? "Too many verification requests. Please wait a few minutes and try again." : resendError.message
        }, { status: isRateLimit ? 429 : 400 });
      }

      return NextResponse.json({
        status: "VERIFICATION_RESENT",
        message: "Your account is waiting for email verification. We sent you a new verification link."
      });
    }

    // 3. New registration flow - Create supabase auth user
    const supabase = createAdminClient();
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        data: {
          business_name,
          agent_name,
          phone,
          whatsapp_number,
          pincode,
          area_city,
          district,
          state,
          landmark
        }
      }
    });

    if (signUpError) {
      return NextResponse.json({ error: signUpError.message }, { status: 400 });
    }

    if (!signUpData.user) {
      return NextResponse.json({ error: "Failed to initialize registration." }, { status: 500 });
    }

    // Insert pending agent signup
    await db.query(
      `insert into public.pending_agent_signups (
        auth_user_id, email, business_name, agent_name, phone, whatsapp_number,
        pincode, area_city, district, state, landmark, status, resend_count, last_verification_sent_at
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', 0, now())`,
      [
        signUpData.user.id,
        normalizedEmail,
        business_name,
        agent_name,
        phone,
        whatsapp_number,
        pincode,
        area_city,
        district,
        state,
        landmark || null
      ]
    );

    return NextResponse.json({
      status: "VERIFICATION_REQUIRED",
      message: "We sent a verification link to your email address. Verify your email to activate your account."
    });

  } catch (error) {
    console.error("Signup endpoint failure:", error);
    const message = error instanceof Error ? error.message : "Internal server error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
