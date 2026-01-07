alter table public.case_tasks
  add column if not exists due_time time;

create index if not exists idx_case_tasks_due_date_time
  on public.case_tasks(due_date, due_time);
