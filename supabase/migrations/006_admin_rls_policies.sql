-- Create admin_users table to store authorized admin emails
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz default now()
);

-- Enable RLS on admin_users
alter table public.admin_users enable row level security;

-- Function to check if a user is an admin based on their email in admin_users table
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1
    from public.admin_users
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
end;
$$;

-- Restricted RLS policy for admin_users table
drop policy if exists "Admins can read admin_users" on public.admin_users;
create policy "Admins can read admin_users"
on public.admin_users
for select
to authenticated
using (public.is_admin());

-- Secure RLS policies for prospects
drop policy if exists "Authenticated users can manage prospects" on public.prospects;
drop policy if exists "Admins can manage prospects" on public.prospects;
create policy "Admins can manage prospects"
on public.prospects
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Secure RLS policies for email_campaigns
drop policy if exists "Authenticated users can manage email_campaigns" on public.email_campaigns;
drop policy if exists "Admins can manage email_campaigns" on public.email_campaigns;
create policy "Admins can manage email_campaigns"
on public.email_campaigns
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Secure RLS policies for website_visits
drop policy if exists "Authenticated users can manage website_visits" on public.website_visits;
drop policy if exists "Admins can manage website_visits" on public.website_visits;
create policy "Admins can manage website_visits"
on public.website_visits
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Secure RLS policies for conversions
drop policy if exists "Authenticated users can manage conversions" on public.conversions;
drop policy if exists "Admins can manage conversions" on public.conversions;
create policy "Admins can manage conversions"
on public.conversions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
