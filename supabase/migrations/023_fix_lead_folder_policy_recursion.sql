create or replace function public.validate_lead_folder_parent()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.parent_id is not null and not exists (
    select 1
    from public.lead_folders parent
    where parent.id = new.parent_id
      and parent.agent_id = new.agent_id
  ) then
    raise exception 'Parent folder must belong to the same agent';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_lead_folder_parent on public.lead_folders;
create trigger validate_lead_folder_parent
before insert or update of parent_id, agent_id on public.lead_folders
for each row execute function public.validate_lead_folder_parent();

drop policy if exists "Agents can create own lead folders" on public.lead_folders;
create policy "Agents can create own lead folders"
on public.lead_folders for insert to authenticated
with check (exists (
  select 1 from public.agents
  where agents.id = lead_folders.agent_id and agents.user_id = auth.uid()
));

drop policy if exists "Agents can update own lead folders" on public.lead_folders;
create policy "Agents can update own lead folders"
on public.lead_folders for update to authenticated
using (exists (
  select 1 from public.agents
  where agents.id = lead_folders.agent_id and agents.user_id = auth.uid()
))
with check (exists (
  select 1 from public.agents
  where agents.id = lead_folders.agent_id and agents.user_id = auth.uid()
));
