alter table public.agents
add column if not exists primary_color text not null default '#1769ff',
add column if not exists hero_title text,
add column if not exists hero_subtitle text,
add column if not exists banner_image_url text,
add column if not exists trial_started_at timestamptz not null default now(),
add column if not exists trial_ends_at timestamptz not null default (now() + interval '14 days'),
add column if not exists plan_status text not null default 'trial',
add column if not exists custom_domain text,
add column if not exists domain_status text not null default 'not_connected';

alter table public.leads
add column if not exists source text not null default 'Website';

create table if not exists public.agent_events (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint agent_events_type_check check (event_type in ('website_visit', 'lead_submission', 'whatsapp_click'))
);

create index if not exists agent_events_agent_type_created_at_idx
on public.agent_events(agent_id, event_type, created_at desc);

create index if not exists leads_agent_status_updated_at_idx
on public.leads(agent_id, status, updated_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agents_primary_color_format'
      and conrelid = 'public.agents'::regclass
  ) then
    alter table public.agents
    add constraint agents_primary_color_format check (primary_color ~ '^#[0-9A-Fa-f]{6}$');
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'agents_plan_status_check'
      and conrelid = 'public.agents'::regclass
  ) then
    alter table public.agents
    add constraint agents_plan_status_check check (plan_status in ('trial', 'active', 'expired', 'cancelled'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'agents_domain_status_check'
      and conrelid = 'public.agents'::regclass
  ) then
    alter table public.agents
    add constraint agents_domain_status_check check (domain_status in ('not_connected', 'pending', 'connected'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'leads_source_check'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads
    add constraint leads_source_check check (source in ('Website', 'WhatsApp', 'Facebook', 'Instagram', 'Google', 'Referral'));
  end if;
end;
$$;

alter table public.agent_events enable row level security;

drop policy if exists "Public can create analytics events" on public.agent_events;
create policy "Public can create analytics events"
on public.agent_events for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.agents
    where agents.id = agent_events.agent_id
  )
);

drop policy if exists "Agents can read own analytics events" on public.agent_events;
create policy "Agents can read own analytics events"
on public.agent_events for select
to authenticated
using (
  exists (
    select 1
    from public.agents
    where agents.id = agent_events.agent_id
      and agents.user_id = auth.uid()
  )
);

create or replace function public.add_new_lead_note()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.lead_notes (lead_id, agent_id, note)
  values (
    new.id,
    new.agent_id,
    'New lead captured from ' || coalesce(new.source, 'Website') || '.'
  );

  return new;
end;
$$;

drop trigger if exists add_new_lead_note on public.leads;
create trigger add_new_lead_note
after insert on public.leads
for each row execute function public.add_new_lead_note();
