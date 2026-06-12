create table if not exists public.prospect_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references public.prospect_folders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prospect_folders_name_check check (char_length(trim(name)) between 1 and 100)
);

alter table public.prospects
  add column if not exists folder_id uuid references public.prospect_folders(id) on delete set null;

create index if not exists prospect_folders_parent_name_idx
  on public.prospect_folders(parent_id, name);
create index if not exists prospects_folder_id_idx
  on public.prospects(folder_id);

drop trigger if exists set_prospect_folders_updated_at on public.prospect_folders;
create trigger set_prospect_folders_updated_at
before update on public.prospect_folders
for each row execute function public.set_updated_at();

alter table public.prospect_folders enable row level security;

drop policy if exists "Service role can manage prospect folders" on public.prospect_folders;
create policy "Service role can manage prospect folders"
on public.prospect_folders
for all
to service_role
using (true)
with check (true);
