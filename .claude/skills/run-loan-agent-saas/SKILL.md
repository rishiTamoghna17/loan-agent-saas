---
name: run-loan-agent-saas
description: run, build, and screenshot the LeadHub loan agent SaaS web app
---

# Run LeadHub Loan Agent SaaS

This is a Next.js 14 web application. The driver uses Playwright with bundled Chromium to programmatically drive the app and take screenshots.

**Paths in this file are relative to `<unit>/`** (the repo root).

---

## Prerequisites

The project already has Playwright installed with bundled Chromium. No additional browser installation needed:

```bash
# Install Playwright browsers (already done in this repo)
npx playwright install chromium
```

For headless Linux, this uses Playwright's bundled Chromium which doesn't require system packages.

---

## Setup

1. Install dependencies (already done):

```bash
npm install
```

2. Ensure `.env.local` has the required variables:

```bash
cp .env.example .env.local
# Edit .env.local to fill in:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - NEXT_PUBLIC_APP_HOST
# - SUPABASE_SERVICE_ROLE_KEY
# - DATABASE_URL
# - BREVO_SMTP_* variables
# - ADMIN_EMAILS (must include the test user email for admin routes)
# - CRON_SECRET
```

3. Apply Supabase migrations in the Supabase Dashboard SQL editor:
   - `supabase/migrations/001_core_mvp.sql`
   - `supabase/migrations/002_agent_address_fields.sql`
   - `supabase/migrations/003_landmark_and_lead_address_fields.sql`
   - `supabase/migrations/004_growth_features.sql`
   - (Plus any newer migrations in `supabase/migrations/`)

---

## Run (agent path)

### Primary: E2E Driver Script (`scripts/run-loan-agent-e2e.mjs`)

The driver script is the primary agent path for launching and driving the app:

```bash
# Run the driver (starts dev server, launches browser, takes screenshots)
npm run e2e:driver

# Or run the driver script directly
node scripts/run-loan-agent-e2e.mjs

# Screenshots are saved to ./screenshots/
ls screenshots/
```

The driver handles:
- Starting the dev server (if not running)
- Waiting for it to be ready
- Launching Playwright with Chromium (headless mode)
- Navigating to key pages (login, signup, public agent, dashboard, admin)
- Taking full-page screenshots

### Alternative: Playwright test runner

Run the dev server in background and execute Playwright tests:

```bash
# Start dev server in background
npm run dev &
DEV_PID=$!

# Wait for server to be ready
sleep 5

# Run e2e tests
npx playwright test

# Cleanup
kill $DEV_PID 2>/dev/null
```

---

## Run (human path)

Start the dev server and open in browser:

```bash
npm run dev
```

Then open `http://localhost:3000` in your browser. This is **not usable headless** (window opens, requires interaction).

---

## Direct invocation (internal testing)

For PRs that touch internal functions without UI changes, import and call directly:

```bash
# Run internal tests
npm run typecheck

# Run specific Node.js test scripts
npm run test:db
npm run test:campaign-templates
npm run test:brevo-send
```

---

## Test

Run the full Playwright e2e test suite:

```bash
npx playwright test
```

Existing tests in `tests/admin-campaigns.spec.ts` cover:
- Login redirects
- Campaign demo routes
- Admin campaigns page
- Admin overview (Brevo health)
- Prospects page
- Template creation
- Webhook authentication
- Password recovery

---

## Gotchas

1. **Supabase email rate limits**: If signup fails with "email sending is temporarily limited", either:
   - Disable email confirmation in Supabase Auth for testing
   - Configure Brevo SMTP properly

2. **Admin routes require configured admin email**: The `/admin` routes check against `ADMIN_EMAILS` in `.env.local`. Ensure your test user email is in this list.

3. **Cron secret required for cron routes**: The `/api/cron/follow-up-reminders` endpoint returns 401 unless `CRON_SECRET` is set and the request includes the correct Bearer token.

4. **Headless Linux**: App runs headless but requires Chromium. No GUI dependencies - Electron-style GPU fallback applies.

5. **Migration state**: Tests assume migrations are applied. Check Supabase Dashboard SQL editor for existing tables.

6. **Dev server port conflicts**: If port 3000 is in use, Next.js will try 3001, 3002, etc. Check the logs for the actual port.

7. **Public agent page 404**: The `/agent/[slug]` route returns 404 - this page does not exist in the current codebase. Use the `/demo` route for authenticated demo pages instead.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `npm run dev` fails with module errors | Run `npm install` to ensure dependencies are installed |
| Dev server won't start on port 3000 | Check logs for errors; Next.js may use 3001, 3002, etc. |
| Supabase connection errors | Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` |
| 401 on admin routes | Add your test email to `ADMIN_EMAILS` in `.env.local` |
| 401 on cron routes | Ensure `CRON_SECRET` is set and matches Vercel deployment |
| Email sending fails | Configure Brevo SMTP in Supabase Dashboard or disable email confirmation for testing |
| Migrations not applied | Run SQL migrations in Supabase Dashboard SQL editor |
| Playwright tests fail to load | Ensure `npm run dev` is running before tests; increase `sleep` time |
| Driver script fails | Check that .env.local exists and has required Supabase credentials |

---

## Screenshot location

The E2E driver saves screenshots to `./screenshots/`:
- `01-login.png`
- `02-signup.png`
- `03-campaign-demo.png`
- `04-dashboard.png`
- `05-admin-overview.png`

Playwright e2e tests save screenshots to `tests/_results/` (or `test-results/` by default) when configured with `screenshot: "only-on-failure"`.

## Known Pages

| Page | Path | Notes |
|---|---|
| Login | `/login` | ✓ Available |
| Signup | `/signup` | ✓ Available |
| Campaign Demo | `/demo?prospect_id=...` | ✓ Available (works without login) |
| Dashboard | `/dashboard` | ✓ Available (may redirect to login without auth) |
| Admin Overview | `/admin` | ✓ Available (requires admin email in .env.local) |
| Public Agent | `/agent/[slug]` | ✗ 404 - this page does not exist in the current codebase |
