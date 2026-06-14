-- Alter campaign_templates to support agent templates
alter table public.campaign_templates add column if not exists agent_id uuid references public.agents(id) on delete cascade;

-- Alter email_campaigns to support agent lead campaign tracking
alter table public.email_campaigns add column if not exists agent_id uuid references public.agents(id) on delete cascade;
alter table public.email_campaigns add column if not exists lead_id uuid references public.leads(id) on delete cascade;

-- Allow authenticated users (agents) to select/insert/update/delete campaign_templates if it belongs to them or is builtin (agent_id is null)
drop policy if exists "Agents can manage their own campaign_templates" on public.campaign_templates;
create policy "Agents can manage their own campaign_templates"
on public.campaign_templates
for all
to authenticated
using (agent_id = (select id from public.agents where user_id = auth.uid()) or agent_id is null)
with check (agent_id = (select id from public.agents where user_id = auth.uid()));

-- Allow authenticated users (agents) to select/insert/update/delete email_campaigns if it belongs to them
drop policy if exists "Agents can manage their own email_campaigns" on public.email_campaigns;
create policy "Agents can manage their own email_campaigns"
on public.email_campaigns
for all
to authenticated
using (agent_id = (select id from public.agents where user_id = auth.uid()))
with check (agent_id = (select id from public.agents where user_id = auth.uid()));
