create table if not exists public.intake_decisions (
  id uuid default gen_random_uuid() not null,
  firm_id uuid not null,
  intake_id uuid not null,
  case_id uuid,
  decision text not null,
  reason text,
  decided_by uuid,
  decided_at timestamp with time zone default now() not null,
  created_at timestamp with time zone default now() not null,
  constraint intake_decisions_pkey primary key (id),
  constraint intake_decisions_decision_check check (decision in ('accepted', 'rejected'))
);

alter table public.intake_decisions enable row level security;

create policy intake_decisions_select_firm_scoped
on public.intake_decisions
for select
using (public.is_firm_member(firm_id));

create policy intake_decisions_insert_firm_scoped
on public.intake_decisions
for insert
with check (public.is_firm_member(firm_id));

create index if not exists idx_intake_decisions_firm_id on public.intake_decisions(firm_id);
create index if not exists idx_intake_decisions_intake_id on public.intake_decisions(intake_id);
