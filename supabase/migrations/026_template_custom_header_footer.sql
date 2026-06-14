-- Add custom header and footer branding columns to campaign_templates
alter table public.campaign_templates add column if not exists header_content text;
alter table public.campaign_templates add column if not exists header_bg_color text default '#0f63ff';
alter table public.campaign_templates add column if not exists header_text_color text default '#ffffff';
alter table public.campaign_templates add column if not exists footer_content text;
alter table public.campaign_templates add column if not exists footer_bg_color text default '#f8fafc';
alter table public.campaign_templates add column if not exists footer_text_color text default '#64748b';
