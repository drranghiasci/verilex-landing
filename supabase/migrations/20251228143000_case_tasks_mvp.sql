create table if not exists public.case_tasks (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null,
  case_id uuid not null references public.cases(id) on delete cascade,
  title text not null,
  status text not null default 'open',
  due_date date null,
  assigned_user_id uuid null,
  created_by uuid null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_case_tasks_case_status_due on public.case_tasks(case_id, status, due_date);
create index if not exists idx_case_tasks_firm_status_due on public.case_tasks(firm_id, status, due_date);

alter table public.case_tasks enable row level security;

drop policy if exists case_tasks_select_firm_scoped on public.case_tasks;
create policy case_tasks_select_firm_scoped
on public.case_tasks
for select
to authenticated
using (public.is_firm_member(firm_id));

drop policy if exists case_tasks_insert_firm_scoped on public.case_tasks;
create policy case_tasks_insert_firm_scoped
on public.case_tasks
for insert
to authenticated
with check (public.is_firm_editor(firm_id));

drop policy if exists case_tasks_update_firm_scoped on public.case_tasks;
create policy case_tasks_update_firm_scoped
on public.case_tasks
for update
to authenticated
using (public.is_firm_editor(firm_id))
with check (public.is_firm_editor(firm_id));
