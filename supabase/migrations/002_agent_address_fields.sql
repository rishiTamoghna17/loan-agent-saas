alter table public.agents
add column if not exists district text,
add column if not exists pincode text;

update public.agents
set district = city
where district is null or district = '';

update public.agents
set pincode = '000000'
where pincode is null or pincode = '';

alter table public.agents
alter column district set not null,
alter column pincode set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agents_pincode_format'
      and conrelid = 'public.agents'::regclass
  ) then
    alter table public.agents
    add constraint agents_pincode_format check (pincode ~ '^[0-9]{6}$');
  end if;
end;
$$;
