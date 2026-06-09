-- Create campaign_templates table
create table if not exists public.campaign_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.campaign_templates enable row level security;

-- Admin policies
create policy "Authenticated users can manage campaign_templates"
on public.campaign_templates
for all
to authenticated
using (true)
with check (true);

-- Updated at trigger
drop trigger if exists set_campaign_templates_updated_at on public.campaign_templates;
create trigger set_campaign_templates_updated_at
before update on public.campaign_templates
for each row execute function public.set_updated_at();
