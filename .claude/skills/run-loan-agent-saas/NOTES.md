# Notes for run-loan-agent-saas skill

## Project Type
- Next.js 14 web application (browser-driven)
- Uses Playwright for e2e testing with bundled Chromium
- No GUI dependencies, runs headlessly

## Discovery
- No existing run skill found
- Existing test file: `tests/admin-campaigns.spec.ts`
- Environment configured with Supabase and Brevo SMTP

## Prerequisites for Headless Linux
- Playwright bundled Chromium (no system packages needed)
- nodejs/npm (already installed)
- npm install (dependencies already installed)

## Build Process
1. `npm install` (already done)
2. Set up `.env.local` with Supabase credentials
3. Apply Supabase migrations (done in Supabase Dashboard)
4. Run `npm run dev` to start dev server

## Driver
- E2E driver script: `scripts/run-loan-agent-e2e.mjs`
- Uses Playwright's bundled Chromium
- Automates: starting dev server, navigating to key pages, taking screenshots
- Runs `npm run e2e:driver` or `node scripts/run-loan-agent-e2e.mjs`

## Screenshots Generated
- `01-login.png` - Login page (working)
- `02-signup.png` - Signup page (working)
- `03-campaign-demo.png` - Campaign demo page (working)
- `04-dashboard.png` - Dashboard (working)
- `05-admin-overview.png` - Admin overview (working)

## Gotchas Encountered

### 1. Public Agent Page 404
- **Issue**: `/agent/[slug]` route returns 404
- **Diagnosis**: This route/page doesn't exist in the current codebase
- **Workaround**: Use `/demo` route for authenticated demo pages instead
- **Action**: Updated driver to use `/demo` instead of `/agent/[slug]`

### 2. Dev Server Port Conflicts
- **Issue**: Port 3000 may be in use
- **Diagnosis**: Next.js tries 3001, 3002, etc.
- **Workaround**: Check logs for actual port, use correct port in driver
- **Action**: Driver now checks for existing server before starting

### 3. Supabase Email Rate Limits
- **Issue**: Signup fails with "email sending is temporarily limited"
- **Diagnosis**: Supabase demo mailer has low sending limits
- **Workaround**: Disable email confirmation in Supabase Auth for testing
- **Action**: Documented in Gotchas section

### 4. Admin Routes Require Configured Admin Email
- **Issue**: `/admin` routes may redirect to login
- **Diagnosis**: Admin routes check against `ADMIN_EMAILS` in `.env.local`
- **Workaround**: Ensure test user email is in `ADMIN_EMAILS`
- **Action**: Documented in Gotchas section

### 5. Cron Secret Required for Cron Routes
- **Issue**: `/api/cron/follow-up-reminders` returns 401
- **Diagnosis**: Endpoint requires correct Bearer token from `CRON_SECRET`
- **Workaround**: Set `CRON_SECRET` in `.env.local`
- **Action**: Documented in Gotchas section

## Screenshot Locations
- E2E driver: `./screenshots/`
- Playwright tests: `tests/_results/` or `test-results/`

## Known Working Pages
| Page | Path | Auth Required |
|---|---|---|
| Login | `/login` | No |
| Signup | `/signup` | No |
| Campaign Demo | `/demo?prospect_id=...` | No |
| Dashboard | `/dashboard` | Yes |
| Admin Overview | `/admin` | Yes (admin email) |

## Known Non-Working Pages
| Page | Path | Issue |
|---|---|---|
| Public Agent | `/agent/[slug]` | 404 - route doesn't exist |
