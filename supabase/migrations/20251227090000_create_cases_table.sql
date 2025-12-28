-- Create cases table (firm-scoped)
create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id) on delete cascade,
  client_name text not null,
  matter_type text not null default 'divorce',
  status text not null default 'open',
  intake_summary text null,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_cases_firm_id on public.cases(firm_id);
create index if not exists idx_cases_last_activity on public.cases(last_activity_at desc);

alter table public.cases enable row level security;

drop policy if exists cases_select_firm_scoped on public.cases;

create policy cases_select_firm_scoped
on public.cases
for select
to authenticated
using (public.is_firm_member(cases.firm_id));

-- No insert/update/delete policies yet (server-only for now)
