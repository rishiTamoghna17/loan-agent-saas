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
  await expect(page.getByText(/Brochure attached/i)).toBeVisible();
  await expect(page.getByText(/Grow your loan business with LeadHub/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Send .* Email/i })).toBeDisabled();
});

test("brevo webhook rejects requests without the configured secret", async ({ request }) => {
  const response = await request.post("/api/webhooks/brevo", {
    data: {
      event: "delivered",
      "message-id": "missing-secret-test"
    }
  });

  if (process.env.BREVO_WEBHOOK_SECRET) {
    expect(response.status()).toBe(401);
  } else {
    expect([200, 500]).toContain(response.status());
  }
});
