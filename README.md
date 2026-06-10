# LeadHub SaaS

Multi-tenant loan agent website and lead dashboard built with Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth, Supabase Postgres, RLS, React Hook Form, and Zod.

## Current Scope

Implemented now:

- Agent signup and login with Supabase email/password auth
- Protected dashboard routes and logout
- Agent profile creation during signup
- Agent profile editing
- Agent logo upload through a server-only Supabase Storage route
- Public page at `/agent/[slug]`
- Public lead form that works without login
- New lead notification email through server-side Brevo SMTP
- Lead source tracking: Website, WhatsApp, Facebook, Instagram, Google, Referral
- EMI calculator and WhatsApp CTA
- Agent dashboard with lead counts, analytics, follow-up reminders, notes, WhatsApp contact action, and delete
- Agent branding: primary color, hero title, hero subtitle, and banner image URL
- Trial fields and expired-trial dashboard lock
- Custom domain fields and connected-domain root rewrite
- Supabase SQL schema and RLS policies

Deferred:

- Demo prospects
- Trial claim flow
- Admin dashboard
- Subscription plans
- Scheduled email/WhatsApp automation beyond dashboard reminders

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```bash
cp .env.example .env.local
```

3. Fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_HOST=
DATABASE_URL=
```

`SUPABASE_SERVICE_ROLE_KEY` is used only by server-side logo upload and local DB tests. Never expose it to client code.
`DATABASE_URL` is server-only and is used to create the agent profile during signup when production email confirmation means the new user is not logged in yet.

4. Run the SQL migrations in Supabase:

```text
supabase/migrations/001_core_mvp.sql
supabase/migrations/002_agent_address_fields.sql
supabase/migrations/003_landmark_and_lead_address_fields.sql
supabase/migrations/004_growth_features.sql
```

You can paste it into the Supabase SQL editor or apply it with the Supabase CLI.
The migration also creates a public `agent-logos` storage bucket with RLS policies that let each authenticated agent upload only inside their own user-id folder.

Or add a Supabase Postgres connection string to `.env.local` and run:

```bash
npm run migrate:db
```

The migration helper uses a Postgres connection string when present. It can also apply the migration through the Supabase Management API using `SUPABASE_ACCESS_TOKEN` and either `SUPABASE_PROJECT_REF` or `NEXT_PUBLIC_SUPABASE_URL`.

Supported migration env values:

```bash
DATABASE_URL=
SUPABASE_DB_URL=
POSTGRES_URL=
SUPABASE_ACCESS_TOKEN=
SUPABASE_PROJECT_REF=
```

5. For local testing only, you can disable email confirmation in Supabase Auth:

```text
Authentication -> Providers -> Email -> Confirm email = off
```

For production, keep email confirmation enabled and configure custom SMTP as described below.

6. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Test User Flow

1. Visit `/signup`.
2. Create an agent account and profile.
3. Confirm redirect to `/dashboard`.
4. Open `/dashboard/profile` and edit business details.
5. Open `/agent/[slug]` from the dashboard.
6. Submit a public lead form without being logged in.
7. Return to `/dashboard` and confirm the lead appears.
8. Change status, add a note, open Contact Lead WhatsApp, and delete the lead.
9. Create a second Supabase user and verify each dashboard only shows its own leads.
10. Confirm dashboard analytics update after public visits, lead submissions, and WhatsApp clicks.

## Supabase DB/RLS Tests

After applying all Supabase migrations, run the database integration tests against a non-production Supabase project:

```bash
npm run test:db
```

The test script creates two temporary auth users, creates one agent profile per user, inserts public leads, and verifies RLS isolation for agents, leads, lead updates/deletes, and lead notes. It requires these values in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` is used only in server actions, route handlers, and Node test/setup scripts. It is not imported by app client code.

If the test reports `This endpoint requires a valid Bearer token`, the value in `SUPABASE_SERVICE_ROLE_KEY` is not a real Supabase service-role JWT. Replace it with the Project Settings -> API -> service_role secret for a disposable/test project.

## Production Auth Email

Do not rely on Supabase's built-in demo mailer for production. It has a very low sending limit and is intended for testing. Configure a real SMTP provider before opening public agent signup.

Recommended low-cost option: Brevo SMTP. Brevo's official SMTP relay host is `smtp-relay.brevo.com`; Brevo recommends port `587` as the default SMTP submission port.

1. Create a Brevo account.
2. In Brevo, open the SMTP/Transactional email area and activate SMTP if prompted.
3. Add and verify your sender domain.
4. Configure DNS records from Brevo:
   - SPF
   - DKIM
   - DMARC
5. In Brevo, copy these values:

```text
SMTP server: smtp-relay.brevo.com
SMTP port: 587
SMTP login: your Brevo SMTP username/login
SMTP key: your Brevo SMTP password/key
Verified sender email: e.g. no-reply@yourdomain.com
Sender name: e.g. LeadHub
```

6. In Supabase, open:

```text
Project Dashboard -> Authentication -> SMTP Settings
```

7. Add the Brevo SMTP values:

```text
Host: smtp-relay.brevo.com
Port: 587
Username: BREVO_SMTP_USERNAME
Password: BREVO_SMTP_PASSWORD
Sender email: BREVO_SMTP_SENDER_EMAIL
Sender name: BREVO_SMTP_SENDER_NAME
```

8. In Supabase Auth URL settings, confirm:
   - Site URL points to your production domain.
   - Redirect URLs include your production auth/dashboard URLs.
9. In Supabase Auth email templates, confirm the confirmation email copy and redirect behavior.
10. Test with one real signup and confirm the email appears in Brevo's transactional email logs.

Required app runtime values for lead notification emails:

```bash
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USERNAME=
BREVO_SMTP_PASSWORD=
BREVO_SMTP_SENDER_EMAIL=
BREVO_SMTP_SENDER_NAME=LeadHub
```

Supabase Auth still sends signup and confirmation emails, so the same SMTP values must also be entered in the Supabase Dashboard. The Next.js app reads these `BREVO_*` variables only on the server to send “New Lead Received” notification emails after public lead submission.

Founder admin campaigns use Brevo's Transactional Email API and webhook tracking. Add these server-only values in local `.env.local` and in Vercel:

```bash
ADMIN_EMAILS=tamoghna171099@gmail.com
BREVO_API_KEY=
BREVO_WEBHOOK_SECRET=
CAMPAIGN_BASE_URL=https://leadhub-loan-crm.vercel.app
BREVO_TEST_EMAIL=
```

Add this webhook in Brevo Transactional webhooks:

```text
https://leadhub-loan-crm.vercel.app/api/webhooks/brevo?secret=BREVO_WEBHOOK_SECRET
```

Enable delivered, opened, clicked, hard bounce, soft bounce, blocked, and spam events. Campaign emails store a row in `email_campaigns` before the provider call, then update to `sent` or `failed`; webhook events update delivered/opened/clicked/bounced timestamps and lead score.

You can also configure Supabase Auth SMTP through the Management API:

```bash
SUPABASE_ACCESS_TOKEN=
SUPABASE_PROJECT_REF=
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USERNAME=
BREVO_SMTP_PASSWORD=
BREVO_SMTP_SENDER_EMAIL=
BREVO_SMTP_SENDER_NAME=

npm run configure:smtp
```

Create `SUPABASE_ACCESS_TOKEN` from Supabase Account -> Access Tokens. `SUPABASE_PROJECT_REF` is optional when `NEXT_PUBLIC_SUPABASE_URL` is present. The script enables Supabase custom SMTP (`external_email_enabled: true`) and keeps email confirmation enabled (`mailer_autoconfirm: false`).

After configuring SMTP, test the signup email handoff with:

```bash
npm run test:auth-email
```

If this still returns `over_email_send_rate_limit`, Supabase is still using the built-in mailer or the SMTP config has not propagated yet. If it returns an SMTP authentication/IP error, fix the Brevo SMTP key, sender, or authorized IP settings.

The app keeps normal Supabase email/password signup. If Supabase returns an email send-rate error, the signup page shows:

```text
Email sending is temporarily limited. Please try again later or contact support.
```

Avoid service-role public signup bypasses in production because they skip email ownership verification.

You can verify the signup error mapping locally with:

```bash
npm run test:auth-errors
```

## RLS Notes

- Public users can read agent profile rows so public pages can render.
- Public users can insert leads, but cannot read, update, or delete leads.
- Public users can insert analytics events for valid agents, but cannot read analytics.
- Authenticated agents can only read/update/delete leads linked to their own `agents.user_id`.
- Lead notes are tenant-scoped through both `lead_id` and `agent_id`.
- New leads automatically create an initial `lead_notes` row through a Postgres trigger.
- Authenticated agents can read only analytics events for their own agent row.

## Growth Features

- **Lead notifications:** `/api/leads` saves the lead, records a `lead_submission` event, and sends the agent a Brevo SMTP email with name, phone, loan type, amount, source, and dashboard link.
- **Contact Lead:** dashboard WhatsApp opens with: `Hi [Name], Thank you for your enquiry.`
- **Lead source:** source is stored on `leads.source` and shown in the dashboard table.
- **Agent branding:** agents can edit primary color, hero title, hero subtitle, banner image URL, and custom domain from `/dashboard/profile`.
- **Analytics:** dashboard cards show website visits, lead submissions, WhatsApp clicks, and conversion percentage from `agent_events`.
- **Trial system:** `agents.trial_started_at`, `trial_ends_at`, and `plan_status` control the trial banner and expired dashboard lock.
- **Custom domain:** set `custom_domain` and mark `domain_status='connected'` after DNS verification. Middleware rewrites root traffic from that host to the matching `/agent/[slug]`.
- **Auto follow-up:** dashboard highlights leads in `new` or `follow_up` status that have not changed for two days.

## Vercel Deployment

1. Push the project to GitHub.
2. Import the repo in Vercel.
3. Add these environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_HOST
SUPABASE_SERVICE_ROLE_KEY
BREVO_SMTP_HOST
BREVO_SMTP_PORT
BREVO_SMTP_USERNAME
BREVO_SMTP_PASSWORD
BREVO_SMTP_SENDER_EMAIL
BREVO_SMTP_SENDER_NAME
ADMIN_EMAILS
BREVO_API_KEY
BREVO_WEBHOOK_SECRET
CAMPAIGN_BASE_URL
```

4. Apply the Supabase migration before testing production.
5. Configure Brevo SMTP in the Supabase Dashboard before opening public signup.
6. Configure the Brevo Transactional webhook for `/api/webhooks/brevo`.
7. Set the Supabase Auth site URL to your Vercel domain.
8. Deploy.

## Security

Do not import or reference `SUPABASE_SERVICE_ROLE_KEY` in client components or browser utilities. Current uses are server-only: logo upload, founder admin CRM operations after `ADMIN_EMAILS` verification, tracking webhooks, and local test/setup scripts.
