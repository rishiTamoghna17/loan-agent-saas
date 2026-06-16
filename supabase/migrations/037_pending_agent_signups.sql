-- Create pending_agent_signups table
create table if not exists public.pending_agent_signups (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text not null unique,
  business_name text not null,
  agent_name text not null,
  phone text not null,
  whatsapp_number text not null,
  pincode text not null,
  area_city text not null,
  district text not null,
  state text not null,
  landmark text,
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'expired', 'cancelled')),
  resend_count integer not null default 0,
  last_verification_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '48 hours'
);

-- Register set_updated_at trigger for pending_agent_signups
drop trigger if exists set_pending_agent_signups_updated_at on public.pending_agent_signups;
create trigger set_pending_agent_signups_updated_at
before update on public.pending_agent_signups
for each row execute function public.set_updated_at();

-- Add columns to public.agents
alter table public.agents add column if not exists email_verified boolean not null default false;
alter table public.agents add column if not exists is_active boolean not null default false;
alter table public.agents add column if not exists auth_user_id uuid references auth.users(id) on delete cascade;

-- Backfill auth_user_id mapping in existing agent records
update public.agents set auth_user_id = user_id where auth_user_id is null;

-- Set constraints on public.agents
alter table public.agents drop constraint if exists agents_auth_user_id_unique;
alter table public.agents add constraint agents_auth_user_id_unique unique (auth_user_id);

alter table public.agents drop constraint if exists agents_email_unique;
alter table public.agents add constraint agents_email_unique unique (email);

-- Backfill email_verified and is_active based on Supabase email confirmation status
update public.agents a
set email_verified = case when u.email_confirmed_at is not null then true else false end,
    is_active = case when u.email_confirmed_at is not null then true else false end
from auth.users u
where a.user_id = u.id;
