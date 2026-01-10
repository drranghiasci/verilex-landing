## Sub-Phase 7 — Codex-ready implementation plan (migrations, RLS, triggers, verification)

This is the **Phase 1 implementation sequence** you can paste into **separate migrations** (recommended) or one migration (acceptable). I am including **exact SQL blocks** and a **verification checklist**.

> Conventions used below

* New objects are in `public` schema.
* Uses your existing helpers: `public.is_firm_member(uuid)`, `public.is_firm_editor(uuid)`, `public.is_firm_admin(uuid)`.
* Uses **trigger-based immutability + audit** so protections hold even under **service-role writes**.
* Audit “actor/request context” is set via `set_config` using a small RPC.

---

# 7.1 Migration order (recommended as separate files)

1. **01_enums.sql** — create enums
2. **02_tables.sql** — create tables + constraints + indexes
3. **03_rls.sql** — enable RLS + policies
4. **04_audit_context.sql** — audit context RPC + helper functions
5. **05_immutability_triggers.sql** — lock enforcement triggers
6. **06_audit_triggers.sql** — audit log triggers + append-only protection
7. **07_storage_policies.sql** — intake-documents bucket access (if you manage storage policies in SQL)
8. **08_verify.sql** — verification queries / test script (not deployed; run manually)

---

# 7.2 01_enums.sql

```sql
-- =========================================================
-- Phase 1 Enums
-- =========================================================
do $$ begin
  create type public.intake_source as enum ('web_form','chat','import','internal');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.transcript_actor_type as enum ('client','firm_user','system','ai');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ai_run_type as enum ('extract_structured_intake','risk_flags','doc_classify');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ai_run_status as enum ('queued','running','succeeded','failed','partial');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.flag_severity as enum ('low','medium','high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.audit_action as enum ('insert','update','delete','submit','review','classify','deny');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.review_disposition as enum ('accepted','dismissed','needs_more_info');
exception when duplicate_object then null; end $$;
```

---

# 7.3 02_tables.sql (tables + constraints + indexes)

This version uses **composite firm-aware foreign keys** to enforce firm consistency declaratively.

```sql
-- =========================================================
-- public.intakes
-- =========================================================
create table if not exists public.intakes (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id),
  case_id uuid null references public.cases(id),
  created_by uuid null references auth.users(id),
  source public.intake_source not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz null,
  submitted_by uuid null references auth.users(id),
  request_id text null,
  client_user_agent text null,
  client_ip inet null
);

-- Composite firm-aware key for child references
create unique index if not exists intakes_id_firm_id_ux on public.intakes (id, firm_id);

create index if not exists intakes_firm_created_at_idx on public.intakes (firm_id, created_at desc);
create index if not exists intakes_firm_submitted_at_idx on public.intakes (firm_id, submitted_at desc);
create index if not exists intakes_case_id_idx on public.intakes (case_id);

-- =========================================================
-- public.intake_raw_payloads (append-only)
-- =========================================================
create table if not exists public.intake_raw_payloads (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id),
  intake_id uuid not null,
  source public.intake_source not null,
  payload jsonb not null,
  captured_at timestamptz not null default now(),
  captured_by uuid null references auth.users(id),
  request_id text null,
  constraint intake_raw_payloads_intake_fk
    foreign key (intake_id, firm_id) references public.intakes(id, firm_id) on delete cascade
);

create index if not exists intake_raw_intake_captured_at_idx on public.intake_raw_payloads (intake_id, captured_at desc);
create index if not exists intake_raw_firm_captured_at_idx on public.intake_raw_payloads (firm_id, captured_at desc);

-- =========================================================
-- public.intake_structured_versions
-- =========================================================
create table if not exists public.intake_structured_versions (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id),
  intake_id uuid not null,
  schema_version text not null,
  data jsonb not null,
  derived_by public.transcript_actor_type not null,
  ai_run_id uuid null,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id),
  constraint intake_struct_intake_fk
    foreign key (intake_id, firm_id) references public.intakes(id, firm_id) on delete cascade,
  constraint intake_struct_ai_requires_run
    check (derived_by <> 'ai' or ai_run_id is not null)
);

create index if not exists intake_struct_intake_created_at_idx on public.intake_structured_versions (intake_id, created_at desc);
create index if not exists intake_struct_firm_created_at_idx on public.intake_structured_versions (firm_id, created_at desc);

-- =========================================================
-- public.intake_transcript_events (append-only)
-- =========================================================
create table if not exists public.intake_transcript_events (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id),
  intake_id uuid not null,
  occurred_at timestamptz not null default now(),
  sequence_num bigint not null,
  actor_type public.transcript_actor_type not null,
  actor_user_id uuid null references auth.users(id),
  channel text null,
  content text not null,
  content_json jsonb null,
  constraint intake_transcript_intake_fk
    foreign key (intake_id, firm_id) references public.intakes(id, firm_id) on delete cascade,
  constraint intake_transcript_seq_ux unique (intake_id, sequence_num)
);

create index if not exists intake_transcript_intake_seq_idx on public.intake_transcript_events (intake_id, sequence_num);
create index if not exists intake_transcript_firm_occurred_idx on public.intake_transcript_events (firm_id, occurred_at desc);

-- =========================================================
-- public.intake_documents
-- =========================================================
create table if not exists public.intake_documents (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id),
  intake_id uuid not null,
  storage_bucket text not null,
  storage_path text not null,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null,
  sha256 bytea null,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid null references auth.users(id),
  deleted_at timestamptz null,

  -- derived classification (mutable)
  doc_type text null,
  classified_by public.transcript_actor_type null,
  classified_at timestamptz null,
  classification_confidence numeric null,

  constraint intake_docs_intake_fk
    foreign key (intake_id, firm_id) references public.intakes(id, firm_id) on delete cascade,
  constraint intake_docs_storage_ux unique (storage_bucket, storage_path)
);

create index if not exists intake_docs_intake_uploaded_at_idx on public.intake_documents (intake_id, uploaded_at desc);
create index if not exists intake_docs_firm_uploaded_at_idx on public.intake_documents (firm_id, uploaded_at desc);

-- =========================================================
-- public.ai_runs
-- =========================================================
create table if not exists public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id),
  intake_id uuid null,
  intake_document_id uuid null references public.intake_documents(id) on delete set null,
  run_type public.ai_run_type not null,
  status public.ai_run_status not null default 'queued',
  model_name text not null,
  prompt_version text not null,
  parameters jsonb null,
  input_refs jsonb not null,
  output jsonb null,
  error text null,
  is_assistive boolean not null default true,
  created_at timestamptz not null default now(),
  started_at timestamptz null,
  completed_at timestamptz null,

  constraint ai_runs_target_ck check (intake_id is not null or intake_document_id is not null),
  constraint ai_runs_assistive_ck check (is_assistive = true),
  constraint ai_runs_complete_ck check (
    (status in ('succeeded','failed','partial')) = (completed_at is not null)
  ),
  constraint ai_runs_output_ck check (
    (status = 'succeeded') = (output is not null)
  )
);

-- Firm-aware FK when intake_id is present
create index if not exists ai_runs_intake_id_idx on public.ai_runs (intake_id);
create index if not exists ai_runs_intake_doc_id_idx on public.ai_runs (intake_document_id);
create index if not exists ai_runs_firm_created_at_idx on public.ai_runs (firm_id, created_at desc);

-- =========================================================
-- public.ai_flags
-- =========================================================
create table if not exists public.ai_flags (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id),
  ai_run_id uuid not null references public.ai_runs(id) on delete cascade,
  intake_id uuid null,
  intake_document_id uuid null references public.intake_documents(id) on delete set null,
  flag_code text not null,
  severity public.flag_severity not null,
  summary text not null,
  details jsonb null,
  evidence_refs jsonb null,
  confidence numeric null,
  requires_human_review boolean not null default true,
  reviewed_by uuid null references auth.users(id),
  reviewed_at timestamptz null,
  review_disposition public.review_disposition null,
  created_at timestamptz not null default now(),

  constraint ai_flags_target_ck check (intake_id is not null or intake_document_id is not null),
  constraint ai_flags_reviewed_ck check (reviewed_at is null or reviewed_by is not null),
  constraint ai_flags_evidence_ck check (
    (severity not in ('medium','high')) or evidence_refs is not null
  )
);

create index if not exists ai_flags_firm_created_at_idx on public.ai_flags (firm_id, created_at desc);
create index if not exists ai_flags_intake_id_idx on public.ai_flags (intake_id);
create index if not exists ai_flags_ai_run_id_idx on public.ai_flags (ai_run_id);

-- =========================================================
-- public.audit_log (append-only)
-- =========================================================
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id),
  actor_user_id uuid null references auth.users(id),
  actor_role text null,
  action public.audit_action not null,
  entity_table text not null,
  entity_id uuid null,
  occurred_at timestamptz not null default now(),
  request_id text null,
  metadata jsonb null,
  before jsonb null,
  after jsonb null
);

create index if not exists audit_firm_occurred_at_idx on public.audit_log (firm_id, occurred_at desc);
create index if not exists audit_entity_idx on public.audit_log (entity_table, entity_id);
create index if not exists audit_request_id_idx on public.audit_log (request_id);
```

---

# 7.4 03_rls.sql (enable RLS + policies)

This is the policy set from Sub-Phase 3 (audit is admin-readable, trigger-written).

```sql
alter table public.intakes enable row level security;
alter table public.intake_raw_payloads enable row level security;
alter table public.intake_structured_versions enable row level security;
alter table public.intake_transcript_events enable row level security;
alter table public.intake_documents enable row level security;
alter table public.ai_runs enable row level security;
alter table public.ai_flags enable row level security;
alter table public.audit_log enable row level security;

-- intakes
create policy "intakes_select_firm_members"
on public.intakes for select to authenticated
using (public.is_firm_member(firm_id));

create policy "intakes_insert_firm_editors"
on public.intakes for insert to authenticated
with check (public.is_firm_editor(firm_id));

create policy "intakes_update_firm_editors"
on public.intakes for update to authenticated
using (public.is_firm_editor(firm_id))
with check (public.is_firm_editor(firm_id));

create policy "intakes_delete_firm_admins"
on public.intakes for delete to authenticated
using (public.is_firm_admin(firm_id));

-- raw payloads (append-only)
create policy "intake_raw_select_firm_members"
on public.intake_raw_payloads for select to authenticated
using (public.is_firm_member(firm_id));

create policy "intake_raw_insert_firm_editors"
on public.intake_raw_payloads for insert to authenticated
with check (public.is_firm_editor(firm_id));

-- structured versions
create policy "intake_struct_select_firm_members"
on public.intake_structured_versions for select to authenticated
using (public.is_firm_member(firm_id));

create policy "intake_struct_insert_firm_editors"
on public.intake_structured_versions for insert to authenticated
with check (public.is_firm_editor(firm_id));

create policy "intake_struct_update_firm_editors"
on public.intake_structured_versions for update to authenticated
using (public.is_firm_editor(firm_id))
with check (public.is_firm_editor(firm_id));

create policy "intake_struct_delete_firm_admins"
on public.intake_structured_versions for delete to authenticated
using (public.is_firm_admin(firm_id));

-- transcript events (append-only)
create policy "intake_transcript_select_firm_members"
on public.intake_transcript_events for select to authenticated
using (public.is_firm_member(firm_id));

create policy "intake_transcript_insert_firm_editors"
on public.intake_transcript_events for insert to authenticated
with check (public.is_firm_editor(firm_id));

-- intake documents
create policy "intake_docs_select_firm_members"
on public.intake_documents for select to authenticated
using (public.is_firm_member(firm_id));

create policy "intake_docs_insert_firm_editors"
on public.intake_documents for insert to authenticated
with check (public.is_firm_editor(firm_id));

create policy "intake_docs_update_firm_editors"
on public.intake_documents for update to authenticated
using (public.is_firm_editor(firm_id))
with check (public.is_firm_editor(firm_id));

create policy "intake_docs_delete_firm_admins"
on public.intake_documents for delete to authenticated
using (public.is_firm_admin(firm_id));

-- ai runs
create policy "ai_runs_select_firm_members"
on public.ai_runs for select to authenticated
using (public.is_firm_member(firm_id));

create policy "ai_runs_insert_firm_editors"
on public.ai_runs for insert to authenticated
with check (public.is_firm_editor(firm_id));

create policy "ai_runs_update_firm_editors"
on public.ai_runs for update to authenticated
using (public.is_firm_editor(firm_id))
with check (public.is_firm_editor(firm_id));

-- ai flags
create policy "ai_flags_select_firm_members"
on public.ai_flags for select to authenticated
using (public.is_firm_member(firm_id));

create policy "ai_flags_insert_firm_editors"
on public.ai_flags for insert to authenticated
with check (public.is_firm_editor(firm_id));

create policy "ai_flags_update_firm_editors"
on public.ai_flags for update to authenticated
using (public.is_firm_editor(firm_id))
with check (public.is_firm_editor(firm_id));

-- audit log (read by firm admins only; write via triggers)
create policy "audit_select_firm_admins"
on public.audit_log for select to authenticated
using (public.is_firm_admin(firm_id));
```

---

# 7.5 04_audit_context.sql (request/actor correlation)

This is the minimal RPC to set session-local context for triggers. Use this at the start of each request (same DB connection).

```sql
create or replace function public.set_audit_context(
  p_request_id text,
  p_actor_user_id uuid,
  p_actor_role text default null,
  p_user_agent text default null
) returns void
language plpgsql
security definer
as $$
begin
  perform set_config('verilex.request_id', coalesce(p_request_id, ''), true);
  perform set_config('verilex.actor_user_id', coalesce(p_actor_user_id::text, ''), true);
  perform set_config('verilex.actor_role', coalesce(p_actor_role, ''), true);
  perform set_config('verilex.user_agent', coalesce(p_user_agent, ''), true);
end;
$$;

revoke all on function public.set_audit_context(text, uuid, text, text) from public;
grant execute on function public.set_audit_context(text, uuid, text, text) to authenticated;
```

> Phase 1 operational rule: for legally meaningful actions (`submit`, `review`), the app must call `set_audit_context` so actor attribution is not null. We enforce this in the audit trigger below.

---

# 7.6 05_immutability_triggers.sql (post-submit lock + append-only)

## 7.6.1 Generic helper: block update/delete always (append-only tables)

```sql
create or replace function public.tg_deny_update_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Immutable table: % % denied', tg_table_name, tg_op;
end;
$$;
```

Attach to:

* `intake_raw_payloads` (UPDATE/DELETE)
* `intake_transcript_events` (UPDATE/DELETE)
* `audit_log` (UPDATE/DELETE)

## 7.6.2 Intake submission lock helper (table-specific allowlists)

```sql
create or replace function public.tg_enforce_intake_submission_lock()
returns trigger
language plpgsql
as $$
declare
  v_submitted_at timestamptz;
begin
  -- Identify intake id depending on table
  if tg_table_name = 'intakes' then
    select submitted_at into v_submitted_at from public.intakes where id = old.id;
  else
    select submitted_at into v_submitted_at
    from public.intakes
    where id = old.intake_id and firm_id = old.firm_id;
  end if;

  if v_submitted_at is null then
    return new;
  end if;

  -- From here: intake is submitted; only allow narrow changes
  if tg_table_name = 'intakes' then
    -- allow only case_id to change post-submit
    if (new.case_id is distinct from old.case_id)
       and (to_jsonb(new) - 'case_id' - 'updated_at') = (to_jsonb(old) - 'case_id' - 'updated_at') then
      return new;
    end if;
    raise exception 'Intake is submitted and immutable: intakes update denied';
  end if;

  if tg_table_name = 'intake_documents' then
    -- allow only classification fields post-submit
    if (to_jsonb(new) - 'doc_type' - 'classified_by' - 'classified_at' - 'classification_confidence' - 'updated_at')
       = (to_jsonb(old) - 'doc_type' - 'classified_by' - 'classified_at' - 'classification_confidence' - 'updated_at') then
      return new;
    end if;
    raise exception 'Intake is submitted and immutable: intake_documents update denied';
  end if;

  if tg_table_name = 'ai_flags' then
    -- allow only review fields post-submit
    if (to_jsonb(new) - 'reviewed_by' - 'reviewed_at' - 'review_disposition' - 'updated_at')
       = (to_jsonb(old) - 'reviewed_by' - 'reviewed_at' - 'review_disposition' - 'updated_at') then
      return new;
    end if;
    raise exception 'Intake is submitted and immutable: ai_flags update denied';
  end if;

  -- Default: deny updates on submitted intake-linked tables
  raise exception 'Intake is submitted and immutable: % update denied', tg_table_name;
end;
$$;
```

## 7.6.3 AI run completion lock

```sql
create or replace function public.tg_enforce_ai_run_completion_lock()
returns trigger
language plpgsql
as $$
begin
  if old.status in ('succeeded','failed','partial') then
    raise exception 'AI run is completed and immutable: ai_runs update denied';
  end if;
  return new;
end;
$$;
```

## 7.6.4 Attach triggers

```sql
-- Append-only hard locks
drop trigger if exists intake_raw_no_update_delete on public.intake_raw_payloads;
create trigger intake_raw_no_update_delete
before update or delete on public.intake_raw_payloads
for each row execute function public.tg_deny_update_delete();

drop trigger if exists intake_transcript_no_update_delete on public.intake_transcript_events;
create trigger intake_transcript_no_update_delete
before update or delete on public.intake_transcript_events
for each row execute function public.tg_deny_update_delete();

drop trigger if exists audit_log_no_update_delete on public.audit_log;
create trigger audit_log_no_update_delete
before update or delete on public.audit_log
for each row execute function public.tg_deny_update_delete();

-- Submission lock: intakes
drop trigger if exists intakes_lock_after_submit on public.intakes;
create trigger intakes_lock_after_submit
before update on public.intakes
for each row execute function public.tg_enforce_intake_submission_lock();

-- Submission lock: intake_documents (classification-only post-submit)
drop trigger if exists intake_docs_lock_after_submit on public.intake_documents;
create trigger intake_docs_lock_after_submit
before update on public.intake_documents
for each row execute function public.tg_enforce_intake_submission_lock();

-- Submission lock: ai_flags (review-only post-submit)
drop trigger if exists ai_flags_lock_after_submit on public.ai_flags;
create trigger ai_flags_lock_after_submit
before update on public.ai_flags
for each row execute function public.tg_enforce_intake_submission_lock();

-- AI run completion lock
drop trigger if exists ai_runs_lock_after_complete on public.ai_runs;
create trigger ai_runs_lock_after_complete
before update on public.ai_runs
for each row execute function public.tg_enforce_ai_run_completion_lock();

-- Optional: structured versions (recommend append-only always)
drop trigger if exists intake_struct_no_update_delete on public.intake_structured_versions;
create trigger intake_struct_no_update_delete
before update or delete on public.intake_structured_versions
for each row execute function public.tg_deny_update_delete();
```

> Note: The last trigger makes `intake_structured_versions` append-only always. That matches the “cleanest” Phase 1 stance.

---

# 7.7 06_audit_triggers.sql (append-only audit with action overrides)

## 7.7.1 Helper: read audit context

```sql
create or replace function public.audit_actor_user_id()
returns uuid
language plpgsql
as $$
declare v text;
begin
  v := nullif(current_setting('verilex.actor_user_id', true), '');
  if v is not null then
    return v::uuid;
  end if;
  return auth.uid();
end;
$$;

create or replace function public.audit_request_id()
returns text
language sql
as $$ select nullif(current_setting('verilex.request_id', true), ''); $$;

create or replace function public.audit_actor_role()
returns text
language sql
as $$ select nullif(current_setting('verilex.actor_role', true), ''); $$;
```

## 7.7.2 Generic audit trigger function (with per-table exclusions)

```sql
create or replace function public.tg_audit_row_change()
returns trigger
language plpgsql
as $$
declare
  v_firm_id uuid;
  v_actor uuid;
  v_action public.audit_action;
  v_entity_table text;
  v_entity_id uuid;
  v_before jsonb;
  v_after jsonb;
  v_req text;
  v_role text;
  v_meta jsonb := '{}'::jsonb;
begin
  v_entity_table := tg_table_name;
  v_req := public.audit_request_id();
  v_actor := public.audit_actor_user_id();
  v_role := public.audit_actor_role();

  if tg_op = 'INSERT' then
    v_action := 'insert';
    v_after := to_jsonb(new);
    v_before := null;
    v_firm_id := new.firm_id;
    v_entity_id := new.id;
  elsif tg_op = 'UPDATE' then
    v_action := 'update';
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
    v_firm_id := new.firm_id;
    v_entity_id := new.id;
  elsif tg_op = 'DELETE' then
    v_action := 'delete';
    v_before := to_jsonb(old);
    v_after := null;
    v_firm_id := old.firm_id;
    v_entity_id := old.id;
  else
    raise exception 'Unsupported op in audit trigger: %', tg_op;
  end if;

  -- Per-table exclusion: don't duplicate raw payload blob into audit
  if v_entity_table = 'intake_raw_payloads' then
    v_meta := jsonb_build_object(
      'raw_payload_id', coalesce(v_entity_id::text, null),
      'intake_id', coalesce((case when tg_op='DELETE' then old.intake_id else new.intake_id end)::text, null),
      'payload_keys', (case when tg_op='DELETE' then jsonb_object_keys(old.payload) else jsonb_object_keys(new.payload) end)
    );
    -- Remove payload from before/after
    if v_before is not null then v_before := v_before - 'payload'; end if;
    if v_after is not null then v_after := v_after - 'payload'; end if;
  end if;

  insert into public.audit_log(
    firm_id, actor_user_id, actor_role, action,
    entity_table, entity_id, request_id, metadata, before, after
  ) values (
    v_firm_id, v_actor, v_role, v_action,
    v_entity_table, v_entity_id, v_req, v_meta, v_before, v_after
  );

  return null;
end;
$$;
```

## 7.7.3 Action override triggers (submit/classify/review)

### Submit event (intakes: submitted_at NULL → NOT NULL)

```sql
create or replace function public.tg_audit_intake_submit()
returns trigger
language plpgsql
as $$
declare
  v_actor uuid;
  v_req text;
begin
  if old.submitted_at is null and new.submitted_at is not null then
    v_actor := public.audit_actor_user_id();
    v_req := public.audit_request_id();

    -- Enforce actor attribution for submit (Phase 1 defensibility)
    if v_actor is null then
      raise exception 'Audit context missing actor_user_id for submit';
    end if;

    insert into public.audit_log(
      firm_id, actor_user_id, actor_role, action,
      entity_table, entity_id, request_id, metadata, before, after
    ) values (
      new.firm_id, v_actor, public.audit_actor_role(), 'submit',
      'intakes', new.id, v_req,
      jsonb_build_object('submitted_at', new.submitted_at, 'submitted_by', new.submitted_by),
      to_jsonb(old), to_jsonb(new)
    );
  end if;

  return null;
end;
$$;
```

### Classification event (intake_documents)

```sql
create or replace function public.tg_audit_intake_doc_classify()
returns trigger
language plpgsql
as $$
declare
  v_actor uuid;
  v_req text;
  v_changed boolean;
begin
  v_changed :=
    (new.doc_type is distinct from old.doc_type)
    or (new.classified_by is distinct from old.classified_by)
    or (new.classified_at is distinct from old.classified_at)
    or (new.classification_confidence is distinct from old.classification_confidence);

  if v_changed then
    v_actor := public.audit_actor_user_id();
    v_req := public.audit_request_id();

    insert into public.audit_log(
      firm_id, actor_user_id, actor_role, action,
      entity_table, entity_id, request_id, metadata, before, after
    ) values (
      new.firm_id, v_actor, public.audit_actor_role(), 'classify',
      'intake_documents', new.id, v_req,
      jsonb_build_object('intake_id', new.intake_id),
      to_jsonb(old), to_jsonb(new)
    );
  end if;

  return null;
end;
$$;
```

### Review event (ai_flags review fields)

```sql
create or replace function public.tg_audit_ai_flag_review()
returns trigger
language plpgsql
as $$
declare
  v_req text;
begin
  if (new.reviewed_at is distinct from old.reviewed_at)
     or (new.review_disposition is distinct from old.review_disposition)
     or (new.reviewed_by is distinct from old.reviewed_by) then

    -- Enforce actor attribution for review (Phase 1 defensibility)
    if public.audit_actor_user_id() is null then
      raise exception 'Audit context missing actor_user_id for review';
    end if;

    v_req := public.audit_request_id();

    insert into public.audit_log(
      firm_id, actor_user_id, actor_role, action,
      entity_table, entity_id, request_id, metadata, before, after
    ) values (
      new.firm_id, public.audit_actor_user_id(), public.audit_actor_role(), 'review',
      'ai_flags', new.id, v_req,
      jsonb_build_object('intake_id', new.intake_id, 'ai_run_id', new.ai_run_id),
      to_jsonb(old), to_jsonb(new)
    );
  end if;

  return null;
end;
$$;
```

## 7.7.4 Attach audit triggers

```sql
-- Generic row change audit
drop trigger if exists audit_intakes_change on public.intakes;
create trigger audit_intakes_change
after insert or update or delete on public.intakes
for each row execute function public.tg_audit_row_change();

drop trigger if exists audit_raw_payloads_change on public.intake_raw_payloads;
create trigger audit_raw_payloads_change
after insert on public.intake_raw_payloads
for each row execute function public.tg_audit_row_change();

drop trigger if exists audit_struct_versions_change on public.intake_structured_versions;
create trigger audit_struct_versions_change
after insert on public.intake_structured_versions
for each row execute function public.tg_audit_row_change();

drop trigger if exists audit_transcript_events_change on public.intake_transcript_events;
create trigger audit_transcript_events_change
after insert on public.intake_transcript_events
for each row execute function public.tg_audit_row_change();

drop trigger if exists audit_intake_documents_change on public.intake_documents;
create trigger audit_intake_documents_change
after insert or update on public.intake_documents
for each row execute function public.tg_audit_row_change();

drop trigger if exists audit_ai_runs_change on public.ai_runs;
create trigger audit_ai_runs_change
after insert or update on public.ai_runs
for each row execute function public.tg_audit_row_change();

drop trigger if exists audit_ai_flags_change on public.ai_flags;
create trigger audit_ai_flags_change
after insert or update on public.ai_flags
for each row execute function public.tg_audit_row_change();

-- Action overrides
drop trigger if exists audit_intake_submit on public.intakes;
create trigger audit_intake_submit
after update on public.intakes
for each row execute function public.tg_audit_intake_submit();

drop trigger if exists audit_intake_doc_classify on public.intake_documents;
create trigger audit_intake_doc_classify
after update on public.intake_documents
for each row execute function public.tg_audit_intake_doc_classify();

drop trigger if exists audit_ai_flag_review on public.ai_flags;
create trigger audit_ai_flag_review
after update on public.ai_flags
for each row execute function public.tg_audit_ai_flag_review();
```

> Yes, this creates both a generic UPDATE audit row and a `review/classify/submit` audit row. If you want exactly one row per event type, you can refine the generic trigger with table-specific suppression logic; for Phase 1, duplicates are acceptable but noisier. If you want it cleaner now, tell me and I’ll provide the suppression version.

---

# 7.8 07_storage_policies.sql (intake documents bucket)

You already have a pattern that infers `firm_id` from the storage object path prefix. For intake docs, you want the same, keyed to `public.intake_documents.storage_path`.

Assuming a bucket name (example) `intake-documents`, and your existing helper `public.storage_firm_id_from_path(path text)`:

```sql
-- Enable RLS on storage.objects is already standard in Supabase.
-- Policy: allow read if authenticated user is firm member of firm derived from path
drop policy if exists "intake_documents_read_firm_members" on storage.objects;

create policy "intake_documents_read_firm_members"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'intake-documents'
  and public.is_firm_member(public.storage_firm_id_from_path(name))
);

-- Optional: allow upload (insert) only for firm editors, with firm derived from path
drop policy if exists "intake_documents_insert_firm_editors" on storage.objects;

create policy "intake_documents_insert_firm_editors"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'intake-documents'
  and public.is_firm_editor(public.storage_firm_id_from_path(name))
);
```

> If you’re managing storage buckets/policies elsewhere (Supabase dashboard), keep this as a reference and apply there.

---

# 7.9 08_verify.sql (verification checklist)

Below are **manual verification steps** you can run in SQL editor. You’ll need two test users in two different firms.

### V1 — Firm isolation (RLS)

1. As user in Firm A, `select * from public.intakes where firm_id = '<FirmB>';` returns **0 rows** (or permission denied).
2. As user in Firm A, `select * from public.intakes where firm_id = '<FirmA>';` returns rows.

### V2 — Append-only tables

* Attempt `update public.intake_transcript_events set content='x' where id='<event>';` must error `Immutable table...`.
* Attempt `delete from public.intake_raw_payloads where id='<id>';` must error.

### V3 — Submission lock

1. Create an intake (draft). Insert transcript/docs/structured. Update draft allowed.
2. Set audit context and submit:

   ```sql
   select public.set_audit_context('req-123', '<actor-user-uuid>'::uuid, 'attorney', 'UA');
   update public.intakes set submitted_at = now(), submitted_by = '<actor-user-uuid>'::uuid
   where id = '<intake-id>' and firm_id = '<firm-id>';
   ```
3. After submit:

   * Update `intakes` fields other than `case_id` must error.
   * Update `intake_documents.original_filename` must error.
   * Update `intake_documents.doc_type` must succeed.
   * Update `ai_flags.review_disposition` with audit context must succeed.
   * Update `ai_runs` after status is completed must error.

### V4 — Audit append + attribution

* After an INSERT or UPDATE, verify:

  ```sql
  select action, entity_table, entity_id, actor_user_id, request_id, occurred_at
  from public.audit_log
  where firm_id = '<firm-id>'
  order by occurred_at desc
  limit 25;
  ```
* Confirm:

  * `submit` action exists when submission occurred.
  * `review` action exists when a flag review occurred.
  * For `submit`/`review`, `actor_user_id` is **not null** (enforced).

---

# 7.10 Integration requirement for the API layer (single sentence, Phase 1 critical)

For any request that writes to Phase 1 entities, the API must call:

* `public.set_audit_context(request_id, actor_user_id, actor_role, user_agent)`

**before** performing writes, using the **same DB connection**.

---

If you want, I can also provide:

* a **suppressed-duplication** audit trigger variant (so you don’t get both `update` and `review/classify/submit` rows for the same update), and/or
* a minimal “migration file naming + placement” plan tailored to your current repo/migrations layout (Supabase CLI vs custom).
