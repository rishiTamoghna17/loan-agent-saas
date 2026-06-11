import { expect, test } from "@playwright/test";

test("admin routes redirect unauthenticated users to login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
});

test("public campaign demo route renders and has signup CTA", async ({ page }) => {
  await page.goto("/demo?prospect_id=00000000-0000-0000-0000-000000000000");
  await expect(page.getByRole("heading", { name: /Aarav Loan Solutions/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Start free trial/i }).first()).toHaveAttribute("href", "/signup");
});

test("admin campaigns page renders for configured admin credentials", async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(!email || !password, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run authenticated admin UI checks.");

  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email!);
  await page.getByLabel(/password/i).fill(password!);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/dashboard|\/admin/);

  await page.goto("/admin/campaigns");
  await expect(page.getByRole("heading", { name: /Email Campaigns/i })).toBeVisible();
  await expect(page.getByText(/Active campaign links/i)).toBeVisible();
  await expect(page.getByText(/Available variables/i)).toBeVisible();
  await expect(page.getByText(/Grow your loan business with LeadHub/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Send .* Email/i })).toBeDisabled();
});

test("admin overview shows Brevo delivery health", async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(!email || !password, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run authenticated admin UI checks.");

  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email!);
  await page.getByLabel(/password/i).fill(password!);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/dashboard|\/admin/);

  await page.goto("/admin");
  await expect(page.getByText("Email delivery health")).toBeVisible();
  await expect(page.getByText("Brevo Webhook Audit")).toBeVisible();
  await expect(page.getByText(/Brevo API connection is healthy|Brevo API connection needs attention/)).toBeVisible();
  await expect(page.getByRole("link", { name: "View Total Prospects" })).toHaveAttribute("href", "/admin/prospects");
  await expect(page.getByRole("link", { name: "View Emails Opened" })).toHaveAttribute("href", "/admin/prospects?engagement=opened");
});

test("admin prospects page renders", async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(!email || !password, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run authenticated admin UI checks.");

  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email!);
  await page.getByLabel(/password/i).fill(password!);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/dashboard|\/admin/);

  await page.goto("/admin/prospects");
  await expect(page.getByRole("heading", { name: /Prospects/i })).toBeVisible();
  await expect(page.getByText(/Manage and track your potential customers/i)).toBeVisible();
  await expect(page.getByLabel("Rows per page")).toBeVisible();
  await expect(page.getByLabel("Page number")).toBeVisible();
  await expect(page.getByTitle("Sort by Prospect")).toBeVisible();
  await expect(page.getByTitle("Sort by Score")).toBeVisible();

  await page.getByLabel("Rows per page").selectOption("10");
  await expect(page).toHaveURL(/pageSize=10/);

  await page.getByTitle("Sort by Prospect").click();
  await expect(page).toHaveURL(/sortBy=name/);
  await expect(page).toHaveURL(/sortDirection=asc/);
});

test("can create custom campaign template", async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(!email || !password, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run authenticated admin UI checks.");

  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email!);
  await page.getByLabel(/password/i).fill(password!);
  await page.getByRole("button", { name: /log in/i }).click();
  await expect(page).toHaveURL(/\/dashboard|\/admin/);

  await page.goto("/admin/campaigns");
  
  // Open template builder
  await page.getByText(/Create Template/i).click();
  
  // Fill out template
  await page.getByLabel(/Template Name/i).fill("Test Campaign");
  await page.getByLabel(/Email Subject/i).fill("Test Subject");
  await page.getByLabel(/Email Content/i).fill("Hello {{name}}, this is a test email.");
  
  // Check brochure toggle
  await page.getByLabel(/Brochure Attached/i).check();
  
  // Save
  await page.getByRole("button", { name: /Save Template/i }).click();
  
  // Verify it's visible
  await expect(page.getByText(/Test Campaign/i)).toBeVisible();
});

test("brevo webhook rejects requests without the configured secret", async ({ request }) => {
  const response = await request.post("/api/webhooks/brevo", {
    data: {
      event: "delivered",
      "message-id": "missing-secret-test"
    }
  });

  expect(response.status()).toBe(401);
});

test("password recovery pages render and cron rejects unauthenticated requests", async ({ page, request }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: /forgot password/i }).click();
  await expect(page).toHaveURL(/\/forgot-password/);
  await expect(page.getByRole("heading", { name: /reset your password/i })).toBeVisible();

  await page.goto("/reset-password");
  await expect(page.getByRole("heading", { name: /choose a new password/i })).toBeVisible();

  const response = await request.get("/api/cron/follow-up-reminders");
  expect(response.status()).toBe(401);
});

test("admin prospects expose selected-row operations", async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;
  test.skip(!email || !password, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run authenticated admin UI checks.");
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email!);
  await page.getByLabel(/password/i).fill(password!);
  await page.getByRole("button", { name: /log in/i }).click();
  await page.goto("/admin/prospects");
  await expect(page.getByRole("link", { name: "Archived" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Deleted" })).toBeVisible();
  await expect(page.getByRole("button", { name: /change status/i })).toBeDisabled();
  await expect(page.getByRole("button", { name: /export selected/i })).toBeDisabled();
});
