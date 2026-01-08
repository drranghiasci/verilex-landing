-- Workflow 1 audit log (append-only)
create extension if not exists pgcrypto;

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null,
  occurred_at timestamptz not null default now(),
  actor_user_id uuid null,
  actor_role text null,
  actor_type text not null,
  event_type text not null,
  entity_table text not null,
  entity_id uuid null,
  related_intake_id uuid null,
  request_id text null,
  ip inet null,
  user_agent text null,
  metadata jsonb not null default '{}'::jsonb,
  before jsonb null,
  after jsonb null
);

create index if not exists idx_audit_log_firm_id_occurred_at on public.audit_log (firm_id, occurred_at desc);
create index if not exists idx_audit_log_entity_table_entity_id on public.audit_log (entity_table, entity_id);
create index if not exists idx_audit_log_related_intake_id on public.audit_log (related_intake_id);

create or replace function public.wf1_audit_log_block_mutations()
returns trigger
language plpgsql
as $$
begin
  raise exception 'AUDIT_LOG_APPEND_ONLY';
  return null;
end;
$$;

drop trigger if exists wf1_audit_log_no_update on public.audit_log;
drop trigger if exists wf1_audit_log_no_delete on public.audit_log;

create trigger wf1_audit_log_no_update
before update on public.audit_log
for each row
execute function public.wf1_audit_log_block_mutations();

create trigger wf1_audit_log_no_delete
before delete on public.audit_log
for each row
execute function public.wf1_audit_log_block_mutations();
