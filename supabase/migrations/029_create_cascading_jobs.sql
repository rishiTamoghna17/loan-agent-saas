-- Create cascading_jobs table for delayed failover worker
create table if not exists public.cascading_jobs (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.agents(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  email_campaign_id uuid references public.email_campaigns(id) on delete cascade,
  whatsapp_payload jsonb not null,
  scheduled_for timestamptz not null,
  status text not null default 'pending', -- 'pending', 'processed', 'cancelled', 'failed'
  created_at timestamptz default now(),
  processed_at timestamptz,
  updated_at timestamptz default now()
);

-- Enable RLS on cascading_jobs
alter table public.cascading_jobs enable row level security;

-- Policy to allow agents to see their own delayed cascading jobs
drop policy if exists "Agents can manage their own cascading_jobs" on public.cascading_jobs;
create policy "Agents can manage their own cascading_jobs"
on public.cascading_jobs
for all
to authenticated
using (agent_id = (select id from public.agents where user_id = auth.uid()))
with check (agent_id = (select id from public.agents where user_id = auth.uid()));

-- Service role bypass for workers
drop policy if exists "Service role can manage cascading_jobs" on public.cascading_jobs;
create policy "Service role can manage cascading_jobs"
on public.cascading_jobs
for all
to service_role
using (true)
with check (true);

-- Index for worker scheduling query
create index if not exists cascading_jobs_status_scheduled_for_idx on public.cascading_jobs(status, scheduled_for);
