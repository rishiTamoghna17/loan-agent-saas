alter table public.leads
  add column if not exists archived_at timestamptz,
  add column if not exists deleted_at timestamptz;

create index if not exists leads_agent_lifecycle_idx
  on public.leads(agent_id, archived_at, deleted_at, created_at desc);
