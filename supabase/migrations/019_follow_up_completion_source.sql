alter table public.lead_follow_ups
  add column if not exists completion_source text;

alter table public.lead_follow_ups
  drop constraint if exists lead_follow_ups_completion_source_check;

alter table public.lead_follow_ups
  add constraint lead_follow_ups_completion_source_check
  check (completion_source is null or completion_source in ('manual', 'reminder_email'));
