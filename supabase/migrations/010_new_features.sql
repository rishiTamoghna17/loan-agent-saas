-- Add brochure_attached and pdf_url columns to campaign_templates
alter table public.campaign_templates
  add column if not exists brochure_attached boolean default false,
  add column if not exists pdf_url text;

-- Add soft delete columns to prospects
alter table public.prospects
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid;

-- Create audit_logs table for tracking actions
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  user_id uuid,
  action text not null,
  table_name text not null,
  record_id uuid not null,
  old_data jsonb,
  new_data jsonb
);

create index if not exists audit_logs_table_name_idx on public.audit_logs(table_name);
create index if not exists audit_logs_record_id_idx on public.audit_logs(record_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);

-- Enable RLS on audit_logs
alter table public.audit_logs enable row level security;

-- Service role policies for audit_logs
drop policy if exists "Service role can manage audit_logs" on public.audit_logs;
create policy "Service role can manage audit_logs"
on public.audit_logs
for all
to service_role
using (true)
with check (true);
