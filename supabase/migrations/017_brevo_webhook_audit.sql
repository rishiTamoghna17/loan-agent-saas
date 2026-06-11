create table if not exists public.email_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'brevo',
  event_type text,
  message_id text,
  recipient_email text,
  campaign_id uuid references public.email_campaigns(id) on delete set null,
  prospect_id uuid references public.prospects(id) on delete set null,
  processing_status text not null check (
    processing_status in ('processed', 'duplicate', 'unmatched', 'unsupported', 'failed')
  ),
  unmatched_reason text,
  sanitized_payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);

create index if not exists email_webhook_events_received_at_idx
  on public.email_webhook_events(received_at desc);
create index if not exists email_webhook_events_message_id_idx
  on public.email_webhook_events(message_id);
create index if not exists email_webhook_events_processing_status_idx
  on public.email_webhook_events(processing_status);

alter table public.email_webhook_events enable row level security;

drop policy if exists "Service role can manage email_webhook_events" on public.email_webhook_events;
create policy "Service role can manage email_webhook_events"
on public.email_webhook_events
for all
to service_role
using (true)
with check (true);
