create extension if not exists "pgcrypto";

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  business_name text not null,
  agent_name text not null,
  phone text not null,
  whatsapp_number text not null,
  email text not null,
  city text not null,
  district text not null,
  state text not null,
  pincode text not null,
  landmark text,
  logo_url text,
  slug text not null unique,
  description text,
  services_offered text[] not null default array[
    'Personal Loan',
    'Business Loan',
    'Home Loan'
  ],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agents_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint agents_pincode_format check (pincode ~ '^[0-9]{6}$')
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  loan_type text not null,
  required_amount numeric(14, 2) not null,
  monthly_income numeric(14, 2),
  city text not null,
  district text,
  state text,
  pincode text,
  landmark text,
  message text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_status_check check (status in ('new', 'follow_up', 'closed', 'rejected')),
  constraint leads_amount_check check (required_amount >= 1000),
  constraint leads_monthly_income_check check (monthly_income is null or monthly_income >= 0),
  constraint leads_pincode_format check (pincode is null or pincode ~ '^[0-9]{6}$')
);

create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists agents_user_id_idx on public.agents(user_id);
create index if not exists agents_slug_idx on public.agents(slug);
create index if not exists leads_agent_id_created_at_idx on public.leads(agent_id, created_at desc);
create index if not exists lead_notes_lead_id_idx on public.lead_notes(lead_id);
create index if not exists lead_notes_agent_id_idx on public.lead_notes(agent_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'agent-logos',
  'agent-logos',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_agents_updated_at on public.agents;
create trigger set_agents_updated_at
before update on public.agents
for each row execute function public.set_updated_at();

drop trigger if exists set_leads_updated_at on public.leads;
create trigger set_leads_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

alter table public.agents enable row level security;
alter table public.leads enable row level security;
alter table public.lead_notes enable row level security;

drop policy if exists "Public can read agent logos" on storage.objects;
create policy "Public can read agent logos"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'agent-logos');

drop policy if exists "Agents can upload own logos" on storage.objects;
create policy "Agents can upload own logos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'agent-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Agents can update own logos" on storage.objects;
create policy "Agents can update own logos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'agent-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'agent-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Agents can delete own logos" on storage.objects;
create policy "Agents can delete own logos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'agent-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Public can read agent pages" on public.agents;
create policy "Public can read agent pages"
on public.agents for select
to anon, authenticated
using (true);

drop policy if exists "Agents can create own profile" on public.agents;
create policy "Agents can create own profile"
on public.agents for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Agents can update own profile" on public.agents;
create policy "Agents can update own profile"
on public.agents for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Public can submit leads" on public.leads;
create policy "Public can submit leads"
on public.leads for insert
to anon, authenticated
with check (
  exists (
    select 1
    from public.agents
    where agents.id = leads.agent_id
  )
);

drop policy if exists "Agents can read own leads" on public.leads;
create policy "Agents can read own leads"
on public.leads for select
to authenticated
using (
  exists (
    select 1
    from public.agents
    where agents.id = leads.agent_id
      and agents.user_id = auth.uid()
  )
);

drop policy if exists "Agents can update own leads" on public.leads;
create policy "Agents can update own leads"
on public.leads for update
to authenticated
using (
  exists (
    select 1
    from public.agents
    where agents.id = leads.agent_id
      and agents.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.agents
    where agents.id = leads.agent_id
      and agents.user_id = auth.uid()
  )
);

drop policy if exists "Agents can delete own leads" on public.leads;
create policy "Agents can delete own leads"
on public.leads for delete
to authenticated
using (
  exists (
    select 1
    from public.agents
    where agents.id = leads.agent_id
      and agents.user_id = auth.uid()
  )
);

drop policy if exists "Agents can read own lead notes" on public.lead_notes;
create policy "Agents can read own lead notes"
on public.lead_notes for select
to authenticated
using (
  exists (
    select 1
    from public.agents
    where agents.id = lead_notes.agent_id
      and agents.user_id = auth.uid()
  )
);

drop policy if exists "Agents can create notes for own leads" on public.lead_notes;
create policy "Agents can create notes for own leads"
on public.lead_notes for insert
to authenticated
with check (
  exists (
    select 1
    from public.leads
    join public.agents on agents.id = leads.agent_id
    where leads.id = lead_notes.lead_id
      and leads.agent_id = lead_notes.agent_id
      and agents.user_id = auth.uid()
  )
);

drop policy if exists "Agents can update own lead notes" on public.lead_notes;
create policy "Agents can update own lead notes"
on public.lead_notes for update
to authenticated
using (
  exists (
    select 1
    from public.agents
    where agents.id = lead_notes.agent_id
      and agents.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.agents
    where agents.id = lead_notes.agent_id
      and agents.user_id = auth.uid()
  )
);

drop policy if exists "Agents can delete own lead notes" on public.lead_notes;
create policy "Agents can delete own lead notes"
on public.lead_notes for delete
to authenticated
using (
  exists (
    select 1
    from public.agents
    where agents.id = lead_notes.agent_id
      and agents.user_id = auth.uid()
  )
);
