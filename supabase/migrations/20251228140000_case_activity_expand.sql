create table if not exists public.case_activity (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null,
  case_id uuid null references public.cases(id) on delete cascade,
  actor_user_id uuid null,
  event_type text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_case_activity_case_id_created_at on public.case_activity(case_id, created_at desc);
create index if not exists idx_case_activity_firm_id_created_at on public.case_activity(firm_id, created_at desc);

alter table public.case_activity enable row level security;

drop policy if exists case_activity_select_firm_scoped on public.case_activity;
create policy case_activity_select_firm_scoped
on public.case_activity
for select
to authenticated
using (public.is_firm_member(firm_id));

drop policy if exists case_activity_insert_firm_scoped on public.case_activity;
create policy case_activity_insert_firm_scoped
on public.case_activity
for insert
to authenticated
with check (public.is_firm_member(firm_id));
