-- Add show_header column to campaign_templates
alter table public.campaign_templates add column if not exists show_header boolean default true;
