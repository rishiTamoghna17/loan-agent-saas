-- Add RLS policies for prospects
drop policy if exists "Authenticated users can manage prospects" on public.prospects;
create policy "Authenticated users can manage prospects"
on public.prospects
for all
to authenticated
using (true)
with check (true);

-- Add RLS policies for email_campaigns
drop policy if exists "Authenticated users can manage email_campaigns" on public.email_campaigns;
create policy "Authenticated users can manage email_campaigns"
on public.email_campaigns
for all
to authenticated
using (true)
with check (true);

-- Add RLS policies for website_visits
drop policy if exists "Authenticated users can manage website_visits" on public.website_visits;
create policy "Authenticated users can manage website_visits"
on public.website_visits
for all
to authenticated
using (true)
with check (true);

-- Add RLS policies for conversions
drop policy if exists "Authenticated users can manage conversions" on public.conversions;
create policy "Authenticated users can manage conversions"
on public.conversions
for all
to authenticated
using (true)
with check (true);

-- Note: We rely on application-level security (Middleware and Layout checks) 
-- to ensure only users in ADMIN_EMAILS can access these routes and actions.
