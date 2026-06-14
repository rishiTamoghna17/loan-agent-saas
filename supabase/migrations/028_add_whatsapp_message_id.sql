-- Alter whatsapp_campaigns to add message_id support for tracking
alter table public.whatsapp_campaigns add column if not exists message_id text;
create index if not exists whatsapp_campaigns_message_id_idx on public.whatsapp_campaigns(message_id);
