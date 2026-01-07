alter table public.case_tasks
  add column if not exists due_at timestamptz null;

update public.case_tasks
set due_at = (
  (due_date::timestamp + coalesce(due_time, time '12:00')) at time zone 'America/New_York'
)
where due_at is null
  and due_date is not null;

create index if not exists idx_case_tasks_firm_due_at on public.case_tasks(firm_id, due_at);

alter table public.profiles
  add column if not exists timezone text;

update public.profiles
set timezone = 'America/New_York'
where timezone is null;
