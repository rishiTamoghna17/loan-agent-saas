-- Alter campaign_templates to support template channel (email vs whatsapp)
alter table public.campaign_templates add column if not exists channel text not null default 'email';

-- Create whatsapp_campaigns table
create table if not exists public.whatsapp_campaigns (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.agents(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  campaign_name text not null,
  template_id text references public.campaign_templates(id) on delete set null,
  template_name text,
  message_content text not null,
  status text not null default 'sent', -- 'sent', 'delivered', 'clicked', 'failed'
  sent_at timestamptz default now(),
  delivered_at timestamptz,
  clicked_at timestamptz,
  event_history jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS on whatsapp_campaigns
alter table public.whatsapp_campaigns enable row level security;

-- Allow authenticated users (agents) to select/insert/update/delete whatsapp_campaigns if it belongs to them
drop policy if exists "Agents can manage their own whatsapp_campaigns" on public.whatsapp_campaigns;
create policy "Agents can manage their own whatsapp_campaigns"
on public.whatsapp_campaigns
for all
to authenticated
using (agent_id = (select id from public.agents where user_id = auth.uid()))
with check (agent_id = (select id from public.agents where user_id = auth.uid()));

-- Service role policy for tracking webhooks/clicks
drop policy if exists "Service role can manage whatsapp_campaigns" on public.whatsapp_campaigns;
create policy "Service role can manage whatsapp_campaigns"
on public.whatsapp_campaigns
for all
to service_role
using (true)
with check (true);

-- Add indexes for performance
create index if not exists whatsapp_campaigns_agent_id_idx on public.whatsapp_campaigns(agent_id);
create index if not exists whatsapp_campaigns_lead_id_idx on public.whatsapp_campaigns(lead_id);
create index if not exists whatsapp_campaigns_status_idx on public.whatsapp_campaigns(status);
create index if not exists whatsapp_campaigns_created_at_idx on public.whatsapp_campaigns(created_at desc);

-- Insert built-in WhatsApp templates
insert into public.campaign_templates (id, name, subject, content, description, brochure_attached, pdf_urls, channel)
values
  ('wa-intro', 'WhatsApp Introduction', 'Introduction', 'Hi {{name}}, I work with loan agents who want to manage enquiries more professionally. LeadHub gives you a website, lead capture forms, and follow-up tools. Check the demo: {{demo_url}} - {{sender_name}}', 'First outreach text message for WhatsApp.', false, '{}', 'whatsapp'),
  ('wa-demo', 'WhatsApp Demo', 'Demo Invite', 'Hi {{name}}, here is the quick demo of LeadHub: {{demo_url}} Let me know if you would like to test the trial. - {{sender_name}}', 'Invite a warm lead to check out the demo.', false, '{}', 'whatsapp'),
  ('wa-followup', 'WhatsApp Follow-up', 'Follow-up', 'Hi {{name}}, just following up on our previous chat about loan assistance. Let me know if you have any questions or want to see the demo again: {{demo_url}} - {{sender_name}}', 'Gentle follow-up message on WhatsApp.', false, '{}', 'whatsapp')
on conflict (id) do nothing;
