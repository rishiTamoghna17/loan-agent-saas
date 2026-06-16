import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerDb } from "@/lib/server-db";

export const runtime = "nodejs";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const emailInput = typeof body?.email === "string" ? body.email : "";

    if (!emailInput) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(emailInput);
    const db = getServerDb();
    const origin = new URL(request.url).origin;

    // 1. Fetch pending signup
    const pendingResult = await db.query(
      `select * from public.pending_agent_signups where email = $1 limit 1`,
      [normalizedEmail]
    );
    const pending = pendingResult.rows[0];

    // Generic success response structure (to prevent email enumeration)
    const genericResponse = {
      success: true,
      status: "VERIFICATION_RESENT",
      message: "If this email is waiting for verification, a new verification link has been sent."
    };

    if (!pending) {
      return NextResponse.json(genericResponse);
    }

    // 2. Verify linked Supabase Auth user is unverified
    const authUserResult = await db.query(
      `select id, email_confirmed_at from auth.users where email = $1 limit 1`,
      [normalizedEmail]
    );
    const authUser = authUserResult.rows[0];

    if (!authUser || authUser.email_confirmed_at !== null) {
      return NextResponse.json(genericResponse);
    }

    // 3. Enforce resend cooldown (60 seconds)
    if (pending.last_verification_sent_at) {
      const lastSent = new Date(pending.last_verification_sent_at).getTime();
      const elapsed = (Date.now() - lastSent) / 1000;
      if (elapsed < 60) {
        return NextResponse.json({
          code: "RESEND_COOLDOWN",
          message: "Please wait before requesting another verification email.",
          retry_after: Math.ceil(60 - elapsed)
        }, { status: 429 });
      }
    }

    // 4. Update resend metrics in database
    await db.query(
      `update public.pending_agent_signups
       set resend_count = resend_count + 1, last_verification_sent_at = now(), updated_at = now()
       where id = $1`,
      [pending.id]
    );

    // 5. Trigger Supabase resend
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
      if (isRateLimit) {
        return NextResponse.json({
          status: "RATE_LIMITED",
          message: "Too many verification requests. Please wait a few minutes and try again.",
          retry_after: 60
        }, { status: 429 });
      }
      console.error("Supabase verification resend failed:", resendError);
    }

    return NextResponse.json(genericResponse);

  } catch (error) {
    console.error("Resend verification API failure:", error);
    return NextResponse.json({ error: "Internal server error occurred." }, { status: 500 });
  }
}
