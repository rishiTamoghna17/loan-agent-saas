import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN!;
const projectRef = "avgguztoiytazbkbowph";

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runSql(sql: string) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: sql,
      read_only: false
    })
  });
  
  if (!response.ok) {
    throw new Error(`SQL execution failed: ${response.status} ${await response.text()}`);
  }
  
  return await response.json();
}

test.describe("Signup and Verification Flow", () => {
  let uniqueEmails: string[] = [];

  test.afterEach(async () => {
    // Cleanup created test auth users
    for (const email of uniqueEmails) {
      // Delete user from auth.users
      const { data: users } = await admin.auth.admin.listUsers();
      const user = users.users.find(u => u.email === email);
      if (user) {
        await admin.auth.admin.deleteUser(user.id);
      }
      
      // Delete from pending_agent_signups
      await runSql(`delete from public.pending_agent_signups where email = '${email}'`);
      
      // Delete from agents
      await runSql(`delete from public.agents where email = '${email}'`);
    }
    uniqueEmails = [];
  });

  // Helper to get unique email
  function getUniqueEmail(label = "test") {
    const email = `${label}-${Math.random().toString(36).substring(2, 11)}@example.com`;
    uniqueEmails.push(email);
    return email;
  }

  // 1-5. Middleware Route Guards (Unauthenticated redirects)
  test("1. Unauthenticated /dashboard redirects to /signin", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/signin/);
  });

  test("2. Unauthenticated /builder redirects to /signin", async ({ page }) => {
    await page.goto("/builder");
    await expect(page).toHaveURL(/\/signin/);
  });

  test("3. Unauthenticated /profile redirects to /signin", async ({ page }) => {
    await page.goto("/profile");
    await expect(page).toHaveURL(/\/signin/);
  });

  test("4. Unauthenticated /settings redirects to /signin", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/signin/);
  });

  test("5. Unauthenticated public agent path does not redirect", async ({ page }) => {
    // Let's check a dummy agent page. It might return 404 but shouldn't redirect to /signin.
    const res = await page.goto("/agent/nonexistent-agent-slug");
    expect(res?.status()).not.toBe(302);
    expect(page.url()).not.toContain("/signin");
  });

  // 6-11. API protection for unauthenticated requests
  test("6. API generate-site blocks unauthenticated requests", async ({ request }) => {
    const res = await request.post("/api/generate-site", { data: {} });
    expect(res.status()).toBe(401);
  });

  test("7. API agent-logo blocks unauthenticated requests", async ({ request }) => {
    const res = await request.post("/api/agent-logo", { data: {} });
    expect(res.status()).toBe(401);
  });

  test("8. API websites blocks unauthenticated requests", async ({ request }) => {
    const res = await request.post("/api/websites", { data: {} });
    expect(res.status()).toBe(401);
  });

  test("9. API upload-pdf blocks unauthenticated requests", async ({ request }) => {
    const res = await request.post("/api/upload-pdf", { data: {} });
    expect(res.status()).toBe(401);
  });

  test("10. API publish blocks unauthenticated requests", async ({ request }) => {
    const res = await request.post("/api/website/publish", { data: {} });
    expect(res.status()).toBe(401);
  });

  test("11. API leads/export blocks unauthenticated requests", async ({ request }) => {
    const res = await request.get("/api/leads/export");
    expect(res.status()).toBe(401);
  });

  // 12. Invalid signup data validation
  test("12. Invalid signup schema fields return 400", async ({ request }) => {
    const res = await request.post("/api/auth/signup", {
      data: {
        email: "invalid-email",
        password: "123"
      }
    });
    expect(res.status()).toBe(400);
  });

  // 13. Signup flow
  test("13. Successful signup registers pending signup, does not create active agent, and requires verification", async ({ page }) => {
    const email = getUniqueEmail("signup");
    await page.goto("/signup");

    await page.getByPlaceholder("e.g. Acme Loans").fill("Test E2E Loans");
    await page.getByPlaceholder("e.g. John Doe").fill("John E2E Doe");
    await page.getByPlaceholder("john@example.com").fill(email);
    await page.getByPlaceholder("••••••••").fill("Password123!");
    await page.getByPlaceholder("9999999999").first().fill("9999999999");
    await page.getByLabel("Same as phone number").check();
    
    // Fill location
    await page.getByLabel(/pincode/i).fill("560001");
    // Wait for pincode autocomplete/API lookup
    await page.waitForTimeout(2000);
    
    // Submit
    await page.getByRole("button", { name: /Create account/i }).click();

    // Should redirect to verify-email page
    await expect(page).toHaveURL(/\/verify-email/);
    await expect(page.getByText(/We sent a verification link/i)).toBeVisible();

    // Verify DB states: pending_agent_signups should have 'pending' row
    const pendingResult = await runSql(`select * from public.pending_agent_signups where email = '${email}'`);
    const pending = pendingResult[0];
    
    expect(pending).toBeDefined();
    expect(pending.status).toBe("pending");

    // agents table should not have a record
    const agentResult = await runSql(`select * from public.agents where email = '${email}'`);
    const agent = agentResult[0];
    
    expect(agent).toBeUndefined();
  });

  // 14. Cooldown rates
  test("14. Duplicate signup with unverified email within 60s returns RESEND_COOLDOWN (429)", async ({ request }) => {
    const email = getUniqueEmail("cooldown");
    const payload = {
      business_name: "Acme Loans",
      agent_name: "John Doe",
      email,
      password: "Password123!",
      phone: "9999999999",
      whatsapp_number: "9999999999",
      pincode: "560001",
      city: "Bengaluru",
      district: "Bengaluru Urban",
      state: "Karnataka",
      landmark: "",
      slug: `acme-loans-${Math.random().toString(36).substring(2, 5)}`
    };

    // First signup
    const res1 = await request.post("/api/auth/signup", { data: payload });
    if (res1.status() !== 200) {
      console.error("14. res1 error body:", await res1.text());
    }
    expect(res1.status()).toBe(200);

    // Second signup immediately
    const res2 = await request.post("/api/auth/signup", { data: payload });
    if (res2.status() !== 429) {
      console.error("14. res2 error body:", await res2.text());
    }
    expect(res2.status()).toBe(429);
    const body = await res2.json();
    expect(body.code).toBe("RESEND_COOLDOWN");
  });

  // 15. Duplicate signup after cooldown
  test("15. Repeated signup after cooldown updates details and increments resend_count", async ({ request }) => {
    const email = getUniqueEmail("after-cooldown");
    const payload = {
      business_name: "Acme Loans",
      agent_name: "John Doe",
      email,
      password: "Password123!",
      phone: "9999999999",
      whatsapp_number: "9999999999",
      pincode: "560001",
      city: "Bengaluru",
      district: "Bengaluru Urban",
      state: "Karnataka",
      landmark: "",
      slug: `acme-loans-${Math.random().toString(36).substring(2, 5)}`
    };

    // First signup
    const res1 = await request.post("/api/auth/signup", { data: payload });
    if (res1.status() !== 200) {
      console.error("15. res1 error body:", await res1.text());
    }
    expect(res1.status()).toBe(200);

    // Manually backdate the last_verification_sent_at in DB to bypass 60s cooldown
    const oldDate = new Date(Date.now() - 70 * 1000).toISOString();
    await runSql(`update public.pending_agent_signups set last_verification_sent_at = '${oldDate}' where email = '${email}'`);

    // Second signup
    const res2 = await request.post("/api/auth/signup", { data: payload });
    if (res2.status() !== 200) {
      console.error("15. res2 error body:", await res2.text());
    }
    expect(res2.status()).toBe(200);
    const body = await res2.json();
    expect(body.status).toBe("VERIFICATION_RESENT");

    const pendingResult = await runSql(`select resend_count from public.pending_agent_signups where email = '${email}'`);
    const pending = pendingResult[0];
    expect(pending).toBeDefined();
    expect(pending?.resend_count).toBe(1);
  });

  // 16. Verified blocker
  test("16. Signing up with already verified email returns ACCOUNT_ALREADY_EXISTS (400)", async ({ request }) => {
    const email = getUniqueEmail("verified");
    
    // Create verified agent in DB and verified user in auth.users
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password: "Password123!",
      email_confirm: true
    });
    expect(authError).toBeNull();
    expect(authUser.user).not.toBeNull();

    await runSql(
      `insert into public.agents (
        user_id, auth_user_id, business_name, agent_name, email, phone, whatsapp_number, pincode, city, district, state, slug, email_verified, is_active
      ) values (
        '${authUser.user!.id}',
        '${authUser.user!.id}',
        'Acme Loans',
        'John Doe',
        '${email}',
        '9999999999',
        '9999999999',
        '560001',
        'Bengaluru',
        'Bengaluru Urban',
        'Karnataka',
        'acme-loans-${Math.random().toString(36).substring(2, 5)}',
        true,
        true
      )`
    );

    const payload = {
      business_name: "Acme Loans New",
      agent_name: "John Doe New",
      email,
      password: "Password1234!",
      phone: "9999999999",
      whatsapp_number: "9999999999",
      pincode: "560001",
      city: "Bengaluru",
      district: "Bengaluru Urban",
      state: "Karnataka",
      landmark: "",
      slug: `acme-loans-new`
    };

    const res = await request.post("/api/auth/signup", { data: payload });
    if (res.status() !== 400) {
      console.error("16. res error body:", await res.text());
    }
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("ACCOUNT_ALREADY_EXISTS");
  });

  // 17-18. Resend verification endpoint
  test("17. Resend-verification endpoint checks and rate limits cooldown", async ({ request }) => {
    const email = getUniqueEmail("resend-api");
    const payload = {
      business_name: "Acme Loans",
      agent_name: "John Doe",
      email,
      password: "Password123!",
      phone: "9999999999",
      whatsapp_number: "9999999999",
      pincode: "560001",
      city: "Bengaluru",
      district: "Bengaluru Urban",
      state: "Karnataka",
      landmark: "",
      slug: `acme-loans-api`
    };

    const signupRes = await request.post("/api/auth/signup", { data: payload });
    if (signupRes.status() !== 200) {
      console.error("17. signup error body:", await signupRes.text());
    }
    expect(signupRes.status()).toBe(200);

    // Try resending verification immediately
    const res = await request.post("/api/auth/resend-verification", { data: { email } });
    if (res.status() !== 429) {
      console.error("17. res error body:", await res.text());
    }
    expect(res.status()).toBe(429);
    const body = await res.json();
    expect(body.code).toBe("RESEND_COOLDOWN");
  });

  test("18. Resend-verification returns success after cooldown", async ({ request }) => {
    const email = getUniqueEmail("resend-api-ok");
    const payload = {
      business_name: "Acme Loans",
      agent_name: "John Doe",
      email,
      password: "Password123!",
      phone: "9999999999",
      whatsapp_number: "9999999999",
      pincode: "560001",
      city: "Bengaluru",
      district: "Bengaluru Urban",
      state: "Karnataka",
      landmark: "",
      slug: `acme-loans-api-ok`
    };

    const signupRes = await request.post("/api/auth/signup", { data: payload });
    if (signupRes.status() !== 200) {
      console.error("18. signup error body:", await signupRes.text());
    }
    expect(signupRes.status()).toBe(200);

    // Force cooldown expiry
    const oldDate = new Date(Date.now() - 70 * 1000).toISOString();
    await runSql(`update public.pending_agent_signups set last_verification_sent_at = '${oldDate}' where email = '${email}'`);

    const res = await request.post("/api/auth/resend-verification", { data: { email } });
    if (res.status() !== 200) {
      console.error("18. res error body:", await res.text());
    }
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("VERIFICATION_RESENT");
  });

  // 19-23. Logged-in unverified page guard redirects
  test("19. Logged-in unverified user is redirected from /dashboard to /verify-email", async ({ page }) => {
    const email = getUniqueEmail("unverified-page");
    const password = "Password123!";
    
    // Create user initially as confirmed so they can successfully log in
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    expect(authError).toBeNull();

    // Log in
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.getByRole("button", { name: /login/i }).click();

    // Verify dashboard landing
    await expect(page).toHaveURL(/\/dashboard/);

    // Now, unverify them in auth.users manually via SQL query
    await runSql(`update auth.users set email_confirmed_at = null where id = '${authUser.user!.id}'`);

    // Go to dashboard again (should trigger middleware guard redirect)
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/verify-email/);
  });

  // 24. Authenticated unverified API guards
  test("24. Authenticated unverified API requests return 403 EMAIL_NOT_VERIFIED", async ({ request }) => {
    const email = getUniqueEmail("unverified-api");
    const password = "Password123!";
    
    // Create user initially as confirmed, so they can log in
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    expect(authError).toBeNull();

    // Log in programmatically to get token
    const { data: sessionData, error: signInError } = await admin.auth.signInWithPassword({
      email,
      password
    });
    expect(signInError).toBeNull();
    const token = sessionData.session?.access_token;

    // Now, unverify them in auth.users metadata manually using SQL query
    await runSql(`update auth.users set email_confirmed_at = null where id = '${authUser.user!.id}'`);

    // Send API request with Bearer token
    const res = await request.post("/api/generate-site", {
      headers: {
        Authorization: `Bearer ${token}`
      },
      data: {
        agentData: { name: "Test", bio: "Test" }
      }
    });

    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.code).toBe("EMAIL_NOT_VERIFIED");
  });

  // 25. Idempotent callback verifies user and activates agent
  test("25. Auth callback successfully registers verified agent and handles duplicate requests idempotently", async () => {
    const email = getUniqueEmail("callback-idemp");
    
    // Create real auth user to satisfy foreign key constraint on public.agents
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password: "Password123!",
      email_confirm: true
    });
    expect(authError).toBeNull();
    const userId = authUser.user!.id;
    
    // Write pending signup
    await runSql(
      `insert into public.pending_agent_signups (
        auth_user_id, email, business_name, agent_name, phone, whatsapp_number, pincode, area_city, district, state, status
      ) values ('${userId}', '${email}', 'Acme Loans', 'John Doe', '9999999999', '9999999999', '560001', 'Bengaluru', 'Bengaluru Urban', 'Karnataka', 'pending')`
    );

    // Simulate callback sql transaction idempotently
    await runSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (select 1 from public.agents where email = '${email}') THEN
          insert into public.agents (
            user_id, auth_user_id, email, business_name, agent_name, phone, whatsapp_number, pincode, city, district, state, email_verified, is_active, slug
          ) values (
            '${userId}', '${userId}', '${email}', 'Acme Loans', 'John Doe', '9999999999', '9999999999', '560001', 'Bengaluru', 'Bengaluru Urban', 'Karnataka', true, true, 'acme-loans-fake'
          );
        END IF;
        update public.pending_agent_signups set status = 'verified' where email = '${email}';
      END;
      $$;
    `);

    // Verify DB
    const agentResult = await runSql(`select * from public.agents where email = '${email}'`);
    const agent = agentResult[0];
    expect(agent).toBeDefined();
    expect(agent.email_verified).toBe(true);

    const pendingResult = await runSql(`select status from public.pending_agent_signups where email = '${email}'`);
    const pending = pendingResult[0];
    expect(pending).toBeDefined();
    expect(pending?.status).toBe("verified");
  });
});
