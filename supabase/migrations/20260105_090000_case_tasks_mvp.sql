-- Case tasks (MVP)
create table if not exists public.case_tasks (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  title text not null,
  description text null,
  due_date date not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz null,
  created_by uuid null
);

create index if not exists idx_case_tasks_firm_id on public.case_tasks (firm_id);
create index if not exists idx_case_tasks_due_date on public.case_tasks (due_date);
create index if not exists idx_case_tasks_case_id on public.case_tasks (case_id);

-- Update updated_at on change
create or replace function public.set_case_tasks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'case_tasks_set_updated_at'
  ) then
    create trigger case_tasks_set_updated_at
    before update on public.case_tasks
    for each row
    execute function public.set_case_tasks_updated_at();
  end if;
end $$;

alter table public.case_tasks enable row level security;

drop policy if exists case_tasks_select_firm_member on public.case_tasks;
drop policy if exists case_tasks_insert_firm_editor on public.case_tasks;
drop policy if exists case_tasks_update_firm_editor on public.case_tasks;

create policy case_tasks_select_firm_member
on public.case_tasks
for select
to authenticated
using (public.is_firm_member(case_tasks.firm_id));

create policy case_tasks_insert_firm_editor
on public.case_tasks
for insert
to authenticated
with check (public.is_firm_editor(case_tasks.firm_id));

create policy case_tasks_update_firm_editor
on public.case_tasks
for update
to authenticated
using (public.is_firm_editor(case_tasks.firm_id))
with check (public.is_firm_editor(case_tasks.firm_id));

revoke insert, update, delete on public.case_tasks from anon;
revoke insert, update, delete on public.case_tasks from authenticated;
grant select on public.case_tasks to authenticated;
