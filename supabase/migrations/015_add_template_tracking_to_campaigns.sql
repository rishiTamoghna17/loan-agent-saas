-- Add template tracking to email_campaigns table
alter table public.email_campaigns
  add column if not exists template_id text,
  add column if not exists template_name text;

-- Create index for template_id to improve queries
create index if not exists email_campaigns_template_id_idx on public.email_campaigns(template_id);
