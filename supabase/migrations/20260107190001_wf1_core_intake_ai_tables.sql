-- Workflow 1 intake + AI tables
create extension if not exists pgcrypto;

create table if not exists public.intakes (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null,
  created_by uuid null,
  status text not null default 'draft',
  submitted_at timestamptz null,
  intake_channel text null,
  matter_type text null,
  urgency_level text null,
  language_preference text null,
  raw_payload jsonb not null default '{}'::jsonb,
  client_display_name text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.intake_messages (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null,
  intake_id uuid not null,
  seq int not null,
  source text not null,
  channel text not null,
  content text not null,
  content_structured jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (intake_id, seq)
);

create table if not exists public.intake_extractions (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null,
  intake_id uuid not null,
  version int not null default 1,
  extracted_data jsonb not null default '{}'::jsonb,
  schema_version text not null default 'v1',
  confidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (intake_id, version)
);

create table if not exists public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null,
  intake_id uuid null,
  run_kind text not null,
  model_name text null,
  prompt_hash text null,
  inputs jsonb not null default '{}'::jsonb,
  outputs jsonb not null default '{}'::jsonb,
  status text not null default 'completed',
  created_by uuid null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_flags (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null,
  intake_id uuid not null,
  ai_run_id uuid null,
  flag_key text not null,
  severity text not null,
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  is_acknowledged boolean not null default false,
  acknowledged_by uuid null,
  acknowledged_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists public.intake_documents (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null,
  intake_id uuid not null,
  storage_object_path text not null,
  document_type text null,
  classification jsonb not null default '{}'::jsonb,
  created_by uuid null,
  created_at timestamptz not null default now()
);

create index if not exists idx_intakes_firm_id on public.intakes(firm_id);
create index if not exists idx_intake_messages_firm_id on public.intake_messages(firm_id);
create index if not exists idx_intake_messages_intake_id on public.intake_messages(intake_id);
create index if not exists idx_intake_extractions_firm_id on public.intake_extractions(firm_id);
create index if not exists idx_intake_extractions_intake_id on public.intake_extractions(intake_id);
create index if not exists idx_ai_runs_firm_id on public.ai_runs(firm_id);
create index if not exists idx_ai_runs_intake_id on public.ai_runs(intake_id);
create index if not exists idx_ai_flags_firm_id on public.ai_flags(firm_id);
create index if not exists idx_ai_flags_intake_id on public.ai_flags(intake_id);
create index if not exists idx_intake_documents_firm_id on public.intake_documents(firm_id);
create index if not exists idx_intake_documents_intake_id on public.intake_documents(intake_id);

-- Foreign keys to public.firms when available
do $$
begin
  if to_regclass('public.firms') is not null then
    if to_regclass('public.intakes') is not null and not exists (select 1 from pg_constraint where conname = 'intakes_firm_id_fkey') then
      alter table public.intakes
        add constraint intakes_firm_id_fkey foreign key (firm_id) references public.firms(id);
    end if;

    if to_regclass('public.intake_messages') is not null and not exists (select 1 from pg_constraint where conname = 'intake_messages_firm_id_fkey') then
      alter table public.intake_messages
        add constraint intake_messages_firm_id_fkey foreign key (firm_id) references public.firms(id);
    end if;

    if to_regclass('public.intake_extractions') is not null and not exists (select 1 from pg_constraint where conname = 'intake_extractions_firm_id_fkey') then
      alter table public.intake_extractions
        add constraint intake_extractions_firm_id_fkey foreign key (firm_id) references public.firms(id);
    end if;

    if to_regclass('public.ai_runs') is not null and not exists (select 1 from pg_constraint where conname = 'ai_runs_firm_id_fkey') then
      alter table public.ai_runs
        add constraint ai_runs_firm_id_fkey foreign key (firm_id) references public.firms(id);
    end if;

    if to_regclass('public.ai_flags') is not null and not exists (select 1 from pg_constraint where conname = 'ai_flags_firm_id_fkey') then
      alter table public.ai_flags
        add constraint ai_flags_firm_id_fkey foreign key (firm_id) references public.firms(id);
    end if;

    if to_regclass('public.intake_documents') is not null and not exists (select 1 from pg_constraint where conname = 'intake_documents_firm_id_fkey') then
      alter table public.intake_documents
        add constraint intake_documents_firm_id_fkey foreign key (firm_id) references public.firms(id);
    end if;
  end if;
end $$;

-- Foreign keys to public.intakes when available
do $$
begin
  if to_regclass('public.intakes') is not null then
    if to_regclass('public.intake_messages') is not null and not exists (select 1 from pg_constraint where conname = 'intake_messages_intake_id_fkey') then
      alter table public.intake_messages
        add constraint intake_messages_intake_id_fkey foreign key (intake_id) references public.intakes(id);
    end if;

    if to_regclass('public.intake_extractions') is not null and not exists (select 1 from pg_constraint where conname = 'intake_extractions_intake_id_fkey') then
      alter table public.intake_extractions
        add constraint intake_extractions_intake_id_fkey foreign key (intake_id) references public.intakes(id);
    end if;

    if to_regclass('public.ai_runs') is not null and not exists (select 1 from pg_constraint where conname = 'ai_runs_intake_id_fkey') then
      alter table public.ai_runs
        add constraint ai_runs_intake_id_fkey foreign key (intake_id) references public.intakes(id);
    end if;

    if to_regclass('public.ai_flags') is not null and not exists (select 1 from pg_constraint where conname = 'ai_flags_intake_id_fkey') then
      alter table public.ai_flags
        add constraint ai_flags_intake_id_fkey foreign key (intake_id) references public.intakes(id);
    end if;

    if to_regclass('public.intake_documents') is not null and not exists (select 1 from pg_constraint where conname = 'intake_documents_intake_id_fkey') then
      alter table public.intake_documents
        add constraint intake_documents_intake_id_fkey foreign key (intake_id) references public.intakes(id);
    end if;
  end if;
end $$;

-- Foreign keys to auth.users when available
do $$
begin
  if to_regclass('auth.users') is not null then
    if to_regclass('public.intakes') is not null and not exists (select 1 from pg_constraint where conname = 'intakes_created_by_fkey') then
      alter table public.intakes
        add constraint intakes_created_by_fkey foreign key (created_by) references auth.users(id);
    end if;

    if to_regclass('public.ai_runs') is not null and not exists (select 1 from pg_constraint where conname = 'ai_runs_created_by_fkey') then
      alter table public.ai_runs
        add constraint ai_runs_created_by_fkey foreign key (created_by) references auth.users(id);
    end if;

    if to_regclass('public.ai_flags') is not null and not exists (select 1 from pg_constraint where conname = 'ai_flags_acknowledged_by_fkey') then
      alter table public.ai_flags
        add constraint ai_flags_acknowledged_by_fkey foreign key (acknowledged_by) references auth.users(id);
    end if;

    if to_regclass('public.intake_documents') is not null and not exists (select 1 from pg_constraint where conname = 'intake_documents_created_by_fkey') then
      alter table public.intake_documents
        add constraint intake_documents_created_by_fkey foreign key (created_by) references auth.users(id);
    end if;
  end if;
end $$;

-- Foreign key from AI flags to AI runs when available
do $$
begin
  if to_regclass('public.ai_runs') is not null and to_regclass('public.ai_flags') is not null then
    if not exists (select 1 from pg_constraint where conname = 'ai_flags_ai_run_id_fkey') then
      alter table public.ai_flags
        add constraint ai_flags_ai_run_id_fkey foreign key (ai_run_id) references public.ai_runs(id);
    end if;
  end if;
end $$;

create or replace function public.wf1_set_intakes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists wf1_set_intakes_updated_at on public.intakes;

create trigger wf1_set_intakes_updated_at
before update on public.intakes
for each row
execute function public.wf1_set_intakes_updated_at();
