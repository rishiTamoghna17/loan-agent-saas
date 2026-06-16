import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getServerDb } from "@/lib/server-db";
import { createSlug } from "@/lib/format";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next")?.startsWith("/") ? url.searchParams.get("next")! : "/builder/welcome";

  const supabase = createClient();

  if (code) {
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
    if (sessionError) {
      console.error("Auth callback session exchange error:", sessionError);
      return NextResponse.redirect(new URL("/login?error=invalid_link", url.origin));
    }
  }

  // 3. Fetch current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Auth callback getUser error:", userError);
    return NextResponse.redirect(new URL("/login?error=auth_failed", url.origin));
  }

  // 4. Confirm verified email
  if (user.email_confirmed_at === null) {
    console.warn(`User ${user.id} has not verified their email.`);
    return NextResponse.redirect(new URL("/verify-email?email=" + encodeURIComponent(user.email || ""), url.origin));
  }

  const normalizedEmail = user.email!.trim().toLowerCase();
  const db = getServerDb();

  // 5. Check if an agent already exists
  const existingAgentResult = await db.query(
    `select id from public.agents where user_id = $1 or email = $2 limit 1`,
    [user.id, normalizedEmail]
  );
  let agentId = existingAgentResult.rows[0]?.id;

  // 6. Find pending agent signup
  const pendingResult = await db.query(
    `select * from public.pending_agent_signups where auth_user_id = $1 or email = $2 limit 1`,
    [user.id, normalizedEmail]
  );
  const pending = pendingResult.rows[0];

  if (!pending && !agentId) {
    console.error(`No pending registration found for verified user: ${normalizedEmail}`);
    return new Response(
      `<html>
        <head>
          <title>Registration Not Found</title>
          <style>
            body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fbff; color: #0f172a; }
            .card { max-width: 400px; padding: 32px; background: white; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.05); text-align: center; }
            h1 { font-size: 20px; margin: 0 0 12px; }
            p { font-size: 14px; color: #64748b; line-height: 1.6; margin: 0 0 24px; }
            a { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Registration Not Found</h1>
            <p>We couldn't find a pending agent registration for this verified email. Please try registering again or contact support.</p>
            <a href="/signup">Sign up again</a>
          </div>
        </body>
      </html>`,
      { status: 400, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  // 7. Complete agent creation inside a database transaction
  const pgClient = await db.connect();
  try {
    await pgClient.query("BEGIN");

    // Double check agent inside transaction for concurrent requests safety
    const txAgentResult = await pgClient.query(
      `select id from public.agents where user_id = $1 or email = $2 limit 1`,
      [user.id, normalizedEmail]
    );
    let activeAgentId = txAgentResult.rows[0]?.id;

    if (!activeAgentId && pending) {
      const slug = createSlug(pending.business_name);
      
      const insertResult = await pgClient.query(
        `insert into public.agents (
          user_id,
          auth_user_id,
          business_name,
          agent_name,
          phone,
          whatsapp_number,
          email,
          city,
          district,
          state,
          pincode,
          landmark,
          logo_url,
          slug,
          description,
          services_offered,
          primary_color,
          hero_title,
          hero_subtitle,
          banner_image_url,
          custom_domain,
          email_verified,
          is_active
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        on conflict (user_id) do nothing
        returning id`,
        [
          user.id,
          user.id,
          pending.business_name,
          pending.agent_name,
          pending.phone,
          pending.whatsapp_number,
          pending.email,
          pending.area_city,
          pending.district,
          pending.state,
          pending.pincode,
          pending.landmark || null,
          null, // logo_url
          slug,
          null, // description
          ['Personal Loan', 'Business Loan', 'Home Loan'],
          '#1769ff',
          null, // hero_title
          null, // hero_subtitle
          null, // banner_image_url
          null, // custom_domain
          true, // email_verified
          true  // is_active
        ]
      );
      
      activeAgentId = insertResult.rows[0]?.id;
    }

    // Mark pending signup verified
    if (pending) {
      await pgClient.query(
        `update public.pending_agent_signups set status = 'verified', updated_at = now() where id = $1`,
        [pending.id]
      );
    }

    await pgClient.query("COMMIT");
  } catch (txError) {
    await pgClient.query("ROLLBACK");
    console.error("Auth callback transaction failed:", txError);
    return new Response(
      `<html>
        <head>
          <title>Activation Failed</title>
          <style>
            body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fbff; color: #0f172a; }
            .card { max-width: 400px; padding: 32px; background: white; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.05); text-align: center; }
            h1 { font-size: 20px; margin: 0 0 12px; }
            p { font-size: 14px; color: #64748b; line-height: 1.6; margin: 0 0 24px; }
            a { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Activation Failed</h1>
            <p>An error occurred while activating your agent account profile. Please click retry below or contact support.</p>
            <a href="${request.url}">Retry activation</a>
          </div>
        </body>
      </html>`,
      { status: 500, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  } finally {
    pgClient.release();
  }

  // Redirect to welcome builder page
  return NextResponse.redirect(new URL(next, url.origin));
}
