create table if not exists public.lead_follow_ups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  due_at timestamptz not null,
  note text,
  status text not null default 'pending',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_follow_ups_status_check check (status in ('pending', 'completed', 'cancelled'))
);

create table if not exists public.agent_notification_preferences (
  agent_id uuid primary key references public.agents(id) on delete cascade,
  timezone text not null default 'Asia/Kolkata',
  new_lead_email_enabled boolean not null default true,
  overdue_digest_email_enabled boolean not null default true,
  digest_hour integer not null default 9,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_notification_preferences_digest_hour_check check (digest_hour between 0 and 23)
);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  notification_type text not null,
  local_date date not null,
  status text not null default 'sending',
  item_count integer not null default 0,
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notification_deliveries_type_check check (notification_type in ('overdue_follow_up_digest')),
  constraint notification_deliveries_status_check check (status in ('sending', 'sent', 'failed')),
  constraint notification_deliveries_unique_daily unique (agent_id, notification_type, local_date)
);

alter table public.prospects
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid;

create index if not exists lead_follow_ups_agent_status_due_idx
  on public.lead_follow_ups(agent_id, status, due_at);
create index if not exists lead_follow_ups_lead_created_idx
  on public.lead_follow_ups(lead_id, created_at desc);
create unique index if not exists lead_follow_ups_one_pending_per_lead_idx
  on public.lead_follow_ups(lead_id)
  where status = 'pending';
create index if not exists leads_agent_source_status_created_idx
  on public.leads(agent_id, source, status, created_at desc);
create index if not exists leads_agent_loan_type_created_idx
  on public.leads(agent_id, loan_type, created_at desc);
create index if not exists prospects_archived_deleted_idx
  on public.prospects(archived_at, deleted_at, created_at desc);
create index if not exists email_campaigns_prospect_status_created_idx
  on public.email_campaigns(prospect_id, status, created_at desc);

drop trigger if exists set_lead_follow_ups_updated_at on public.lead_follow_ups;
create trigger set_lead_follow_ups_updated_at
before update on public.lead_follow_ups
for each row execute function public.set_updated_at();

drop trigger if exists set_agent_notification_preferences_updated_at on public.agent_notification_preferences;
create trigger set_agent_notification_preferences_updated_at
before update on public.agent_notification_preferences
for each row execute function public.set_updated_at();

create or replace function public.create_default_agent_notification_preferences()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.agent_notification_preferences (agent_id)
  values (new.id)
  on conflict (agent_id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_default_agent_notification_preferences on public.agents;
create trigger create_default_agent_notification_preferences
after insert on public.agents
for each row execute function public.create_default_agent_notification_preferences();

insert into public.agent_notification_preferences (agent_id)
select id from public.agents
on conflict (agent_id) do nothing;

alter table public.lead_follow_ups enable row level security;
alter table public.agent_notification_preferences enable row level security;
alter table public.notification_deliveries enable row level security;

drop policy if exists "Agents can read own follow ups" on public.lead_follow_ups;
create policy "Agents can read own follow ups"
on public.lead_follow_ups for select to authenticated
using (exists (
  select 1 from public.agents
  where agents.id = lead_follow_ups.agent_id and agents.user_id = auth.uid()
));

drop policy if exists "Agents can create own follow ups" on public.lead_follow_ups;
create policy "Agents can create own follow ups"
on public.lead_follow_ups for insert to authenticated
with check (exists (
  select 1 from public.leads
  join public.agents on agents.id = leads.agent_id
  where leads.id = lead_follow_ups.lead_id
    and leads.agent_id = lead_follow_ups.agent_id
    and agents.user_id = auth.uid()
));

drop policy if exists "Agents can update own follow ups" on public.lead_follow_ups;
create policy "Agents can update own follow ups"
on public.lead_follow_ups for update to authenticated
using (exists (
  select 1 from public.agents
  where agents.id = lead_follow_ups.agent_id and agents.user_id = auth.uid()
))
with check (exists (
  select 1 from public.leads
  join public.agents on agents.id = leads.agent_id
  where leads.id = lead_follow_ups.lead_id
    and leads.agent_id = lead_follow_ups.agent_id
    and agents.user_id = auth.uid()
));

drop policy if exists "Agents can delete own follow ups" on public.lead_follow_ups;
create policy "Agents can delete own follow ups"
on public.lead_follow_ups for delete to authenticated
using (exists (
  select 1 from public.agents
  where agents.id = lead_follow_ups.agent_id and agents.user_id = auth.uid()
));

drop policy if exists "Agents can read own notification preferences" on public.agent_notification_preferences;
create policy "Agents can read own notification preferences"
on public.agent_notification_preferences for select to authenticated
using (exists (
  select 1 from public.agents
  where agents.id = agent_notification_preferences.agent_id and agents.user_id = auth.uid()
));

drop policy if exists "Agents can manage own notification preferences" on public.agent_notification_preferences;
create policy "Agents can manage own notification preferences"
on public.agent_notification_preferences for all to authenticated
using (exists (
  select 1 from public.agents
  where agents.id = agent_notification_preferences.agent_id and agents.user_id = auth.uid()
))
with check (exists (
  select 1 from public.agents
  where agents.id = agent_notification_preferences.agent_id and agents.user_id = auth.uid()
));

drop policy if exists "Service role can manage notification deliveries" on public.notification_deliveries;
create policy "Service role can manage notification deliveries"
on public.notification_deliveries for all to service_role
using (true) with check (true);
