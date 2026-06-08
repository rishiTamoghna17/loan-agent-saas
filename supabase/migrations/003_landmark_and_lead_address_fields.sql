alter table public.agents
add column if not exists landmark text;

alter table public.leads
add column if not exists district text,
add column if not exists state text,
add column if not exists pincode text,
add column if not exists landmark text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'leads_pincode_format'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads
    add constraint leads_pincode_format check (pincode is null or pincode ~ '^[0-9]{6}$');
  end if;
end;
$$;
