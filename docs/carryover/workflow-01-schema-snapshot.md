# Workflow 01 – Schema Snapshot (Phase 1 / Workflow 1 Scope)

This snapshot is a **reference artifact** for engineers and Codex prompts.  
It reflects the **Workflow 1 Phase 1 data foundation tables** (intake + AI + audit) and the key enforcement surfaces (checks, triggers, RLS helpers).

> Scope note: This snapshot covers the **Workflow 1 tables** introduced for Phase 1 intake defensibility. It does not attempt to restate pre-existing Phase 1 tables (e.g., firms, firm_members, cases, case_tasks, profiles) because those were not created by Workflow 1.

---

## 1) Tables (pseudo `CREATE TABLE` definitions)

### 1.1 `public.intakes`
```sql
create table public.intakes (
  id                  uuid primary key default gen_random_uuid(),
  firm_id              uuid not null,
  created_by           uuid null,                         -- auth user id
  status               text not null default 'draft',      -- constrained (see “Checks / enums”)
  submitted_at         timestamptz null,
  intake_channel       text null,
  matter_type          text null,
  urgency_level        text null,
  language_preference  text null,
  raw_payload          jsonb not null default '{}'::jsonb, -- canonical as-entered data
  client_display_name  text null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
````

**Key indexes / constraints (logical):**

* index on `(firm_id)`
* check constraint (via hardening migration): `status in ('draft','submitted')`

---

### 1.2 `public.intake_messages`

```sql
create table public.intake_messages (
  id                  uuid primary key default gen_random_uuid(),
  firm_id              uuid not null,
  intake_id            uuid not null references public.intakes(id),
  seq                  int not null,
  source               text not null,                      -- constrained (optional check)
  channel              text not null,                      -- constrained (optional check)
  content              text not null,
  content_structured   jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now(),
  unique (intake_id, seq)
);
```

**Key indexes / constraints (logical):**

* unique `(intake_id, seq)`
* index on `(intake_id)`
* (optional hardening checks if enabled): `source in ('client','system','attorney')`, `channel in ('chat','form')`

---

### 1.3 `public.intake_extractions`

```sql
create table public.intake_extractions (
  id               uuid primary key default gen_random_uuid(),
  firm_id           uuid not null,
  intake_id         uuid not null references public.intakes(id),
  version           int not null default 1,
  extracted_data    jsonb not null default '{}'::jsonb,
  schema_version    text not null default 'v1',
  confidence        jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  unique (intake_id, version)
);
```

**Key indexes / constraints (logical):**

* unique `(intake_id, version)`
* index on `(intake_id)`
* index on `(firm_id)`

---

### 1.4 `public.ai_runs`

```sql
create table public.ai_runs (
  id           uuid primary key default gen_random_uuid(),
  firm_id       uuid not null,
  intake_id     uuid null references public.intakes(id),
  run_kind      text not null,                             -- e.g., extraction/flags/classification
  model_name    text null,
  prompt_hash   text null,
  inputs        jsonb not null default '{}'::jsonb,         -- redacted/safe inputs
  outputs       jsonb not null default '{}'::jsonb,         -- assistive outputs
  status        text not null default 'completed',
  created_by    uuid null,
  created_at    timestamptz not null default now()
);
```

**Key indexes / constraints (logical):**

* index on `(firm_id)`
* index on `(intake_id)`

---

### 1.5 `public.ai_flags`

```sql
create table public.ai_flags (
  id               uuid primary key default gen_random_uuid(),
  firm_id           uuid not null,
  intake_id         uuid not null references public.intakes(id),
  ai_run_id         uuid null references public.ai_runs(id),
  flag_key          text not null,
  severity          text not null,                          -- constrained (see “Checks / enums”)
  summary           text not null,
  details           jsonb not null default '{}'::jsonb,
  is_acknowledged   boolean not null default false,
  acknowledged_by   uuid null,
  acknowledged_at   timestamptz null,
  created_at        timestamptz not null default now()
);
```

**Key indexes / constraints (logical):**

* index on `(firm_id)`
* index on `(intake_id)`
* check constraint (via hardening migration): `severity in ('low','medium','high')`

---

### 1.6 `public.intake_documents`

```sql
create table public.intake_documents (
  id                  uuid primary key default gen_random_uuid(),
  firm_id              uuid not null,
  intake_id            uuid not null references public.intakes(id),
  storage_object_path  text not null,                       -- storage pointer (not file bytes)
  document_type        text null,
  classification       jsonb not null default '{}'::jsonb,
  created_by           uuid null,
  created_at           timestamptz not null default now()
);
```

**Key indexes / constraints (logical):**

* index on `(firm_id)`
* index on `(intake_id)`

---

### 1.7 `public.audit_log`

```sql
create table public.audit_log (
  id                uuid primary key default gen_random_uuid(),
  firm_id            uuid not null,
  occurred_at        timestamptz not null default now(),
  actor_user_id      uuid null,
  actor_role         text null,
  actor_type         text not null,                         -- user/service/system
  event_type         text not null,                         -- intake_submitted, ai_run_created, etc.
  entity_table       text not null,
  entity_id          uuid null,
  related_intake_id  uuid null,
  request_id         text null,                             -- current_setting('request.id', true)
  ip                inet null,                              -- current_setting('request.ip', true)
  user_agent         text null,                             -- current_setting('request.ua', true)
  metadata           jsonb not null default '{}'::jsonb,
  before             jsonb null,
  after              jsonb null
);
```

**Key indexes / constraints (logical):**

* index on `(firm_id, occurred_at desc)`
* index on `(entity_table, entity_id)`
* index on `(related_intake_id)`

---

## 2) Enums / Types Used (Phase 1 Workflow 1)

Workflow 1 uses **text columns + check constraints** (not Postgres `ENUM` types).

### Canonical constrained values (enforced via check constraints where applied)

* `public.intakes.status`: `'draft' | 'submitted'`
* `public.ai_flags.severity`: `'low' | 'medium' | 'high'`

### Optional constrained values (if check constraints were enabled in hardening)

* `public.intake_messages.source`: `'client' | 'system' | 'attorney'`
* `public.intake_messages.channel`: `'chat' | 'form'`

---

## 3) Triggers (immutability + append-only) – Summary

### 3.1 Immutability triggers (lock on submission)

Immutability is enforced once:

* `public.intakes.submitted_at` transitions from `NULL` → non-`NULL`

**Trigger function:**

* `public.wf1_enforce_intake_immutability()`

**BEFORE UPDATE/DELETE triggers attached (names):**

* `wf1_intakes_immutability`
* `wf1_intake_messages_immutability`
* `wf1_intake_extractions_immutability`
* `wf1_ai_runs_immutability`
* `wf1_ai_flags_immutability`
* `wf1_intake_documents_immutability`

**Allowed exception:**

* `public.ai_flags` acknowledgement-only updates may be allowed:

  * `is_acknowledged`, `acknowledged_by`, `acknowledged_at`

### 3.2 Delete denial triggers (defense in depth)

Deletes are blocked at DB level (independent of RLS).

**Trigger function:**

* `public.wf1_deny_deletes()`

**BEFORE DELETE triggers attached (names):**

* `wf1_intakes_no_delete`
* `wf1_intake_messages_no_delete`
* `wf1_intake_extractions_no_delete`
* `wf1_ai_runs_no_delete`
* `wf1_ai_flags_no_delete`
* `wf1_intake_documents_no_delete`

> Note: After submission, deletes may fail with `INTAKE_IMMUTABLE` (immutability triggers can raise before delete-deny triggers). Pre-submission deletes should fail with delete-deny.

### 3.3 Audit log append-only enforcement

**Trigger function:**

* `public.wf1_audit_log_block_mutations()`

**Triggers attached on `public.audit_log`:**

* `wf1_audit_log_no_update` (blocks UPDATE)
* `wf1_audit_log_no_delete` (blocks DELETE)

### 3.4 Audit event emission triggers (event writing)

**Trigger function used by triggers:**

* `public.audit_write(...)` (SECURITY DEFINER)

**Triggers attached (names):**

* `wf1_audit_intake_submitted` (after update on `public.intakes` when `submitted_at` set)
* `wf1_audit_ai_runs_insert` (after insert on `public.ai_runs`)
* `wf1_audit_ai_flags_insert` (after insert on `public.ai_flags`)
* (conditional) case creation trigger if `public.cases(intake_id, firm_id)` exists:

  * `wf1_audit_cases_insert`

---

## 4) RLS Helper Functions – Summary

Workflow 1 RLS and triggers rely on these helper functions:

* `public.is_firm_member(firm_id uuid) returns boolean`

  * Used by RLS policies to enforce firm isolation.
  * Assumes a membership mapping (typically `public.firm_members`).

* `public.is_intake_submitted(intake_id uuid) returns boolean`

  * Used by immutability enforcement to determine lock state.

* `public.audit_write(...)`

  * SECURITY DEFINER helper for writing to `public.audit_log` from triggers.

---

## 5) Canonical Lock Boundary (reference)

**An intake is “submitted” if and only if:**

* `public.intakes.submitted_at is not null`

**Lock effects apply immediately:**

* updates/deletes to intake and child tables are blocked (except `ai_flags` acknowledgement updates if allowed)
* deletes are blocked (defense-in-depth)
* `audit_log` records `event_type = 'intake_submitted'`

---

```
```
