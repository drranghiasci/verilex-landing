alter table public.case_tasks
  add column if not exists description text;
