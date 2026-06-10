alter table public.email_campaigns
  add column if not exists provider text default 'brevo',
  add column if not exists provider_response jsonb,
  add column if not exists provider_error jsonb,
  add column if not exists last_event_at timestamptz,
  add column if not exists bounced_at timestamptz,
  add column if not exists event_history jsonb not null default '[]'::jsonb;

create index if not exists email_campaigns_message_id_idx on public.email_campaigns(message_id);
create index if not exists email_campaigns_status_idx on public.email_campaigns(status);
create index if not exists email_campaigns_created_at_idx on public.email_campaigns(created_at desc);

drop policy if exists "Authenticated users can manage prospects" on public.prospects;
drop policy if exists "Authenticated users can manage email_campaigns" on public.email_campaigns;
drop policy if exists "Authenticated users can manage website_visits" on public.website_visits;
drop policy if exists "Authenticated users can manage conversions" on public.conversions;
drop policy if exists "Authenticated users can manage campaign_templates" on public.campaign_templates;

drop policy if exists "Service role can manage prospects" on public.prospects;
create policy "Service role can manage prospects"
on public.prospects
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage email_campaigns" on public.email_campaigns;
create policy "Service role can manage email_campaigns"
on public.email_campaigns
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage website_visits" on public.website_visits;
create policy "Service role can manage website_visits"
on public.website_visits
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage conversions" on public.conversions;
create policy "Service role can manage conversions"
on public.conversions
for all
to service_role
using (true)
with check (true);

drop policy if exists "Service role can manage campaign_templates" on public.campaign_templates;
create policy "Service role can manage campaign_templates"
on public.campaign_templates
for all
to service_role
using (true)
with check (true);

