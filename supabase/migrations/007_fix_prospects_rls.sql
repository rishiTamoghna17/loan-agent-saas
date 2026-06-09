-- Re-assert RLS policies for prospects and ensure service_role bypass is explicitly handled if needed
-- Though service_role should bypass by default, some configurations might require explicit policies

-- Enable RLS (already done, but good for idempotency)
alter table public.prospects enable row level security;

-- Drop existing policies to avoid conflicts
drop policy if exists "Authenticated users can manage prospects" on public.prospects;
drop policy if exists "Service role can manage prospects" on public.prospects;

-- Policy for authenticated users (admins)
create policy "Authenticated users can manage prospects"
on public.prospects
for all
to authenticated
using (true)
with check (true);

-- Explicit policy for service role just in case bypass is not working as expected
create policy "Service role can manage prospects"
on public.prospects
for all
to service_role
using (true)
with check (true);

-- Ensure other related tables also have correct policies
alter table public.email_campaigns enable row level security;
drop policy if exists "Authenticated users can manage email_campaigns" on public.email_campaigns;
create policy "Authenticated users can manage email_campaigns"
on public.email_campaigns
for all
to authenticated
using (true)
with check (true);

alter table public.website_visits enable row level security;
drop policy if exists "Authenticated users can manage website_visits" on public.website_visits;
create policy "Authenticated users can manage website_visits"
on public.website_visits
for all
to authenticated
using (true)
with check (true);

alter table public.conversions enable row level security;
drop policy if exists "Authenticated users can manage conversions" on public.conversions;
create policy "Authenticated users can manage conversions"
on public.conversions
for all
to authenticated
using (true)
with check (true);
