## Sub-Phase 2 — Canonical Phase 1 schema proposal (minimum viable, DB-first)

This is the **Phase 1 “to-be” schema**, expressed as **explicit tables/columns/constraints/indexes**, but **not** as full migration SQL (per your instruction: design, not implementation). It is intentionally minimal and aligned to the existing firm model and RLS helper approach already present.

---

# 2.1 Design principles (Phase 1)

1. **Firm-id on every row** (no inference-only scoping).
2. **Raw ≠ Structured ≠ Transcript ≠ AI** are **separate artifacts** tied to a single intake envelope.
3. **Immutability is state-driven** via `submitted_at` on the intake envelope.
4. **Derived data is explicitly marked** (assistive, review-required).
5. **Audit is first-class** and append-only.

---

# 2.2 New enums (bounded values, Phase 1)

You can implement these as Postgres enums or CHECK constraints; Phase 1 preference is enums for policy readability.

### `intake_status`

* `draft`
* `submitted`

(You can derive this from `submitted_at` alone; if you keep `status`, enforce consistency with a constraint.)

### `intake_source`

* `web_form`
* `chat`
* `import`
* `internal`

### `transcript_actor_type`

* `client`
* `firm_user`
* `system`
* `ai`

### `ai_run_type`

* `extract_structured_intake`
* `risk_flags`
* `doc_classify`

### `ai_run_status`

* `queued`
* `running`
* `succeeded`
* `failed`
* `partial`

### `flag_severity`

* `low`
* `medium`
* `high`

### `audit_action`

* `insert`
* `update`
* `delete`
* `submit`
* `review`
* `classify`
* `deny`  (optional but useful for “blocked by immutability” logging)

---

# 2.3 Tables

## A) Intake envelope (authoritative lifecycle)

### `public.intakes`

**Purpose:** The single authoritative record representing an intake instance.

**Columns**

* `id uuid pk default gen_random_uuid()`
* `firm_id uuid not null references public.firms(id)`
* `case_id uuid null references public.cases(id)`

  * Phase 1: optional linkage once a case is created from intake.
* `created_by uuid null references auth.users(id)`

  * Nullable to support anonymous/public intakes if needed.
* `source intake_source not null`
* `status intake_status not null default 'draft'` *(optional; see note below)*
* `created_at timestamptz not null default now()`
* `updated_at timestamptz not null default now()`
* `submitted_at timestamptz null`
* `submitted_by uuid null references auth.users(id)`
* **Defensibility metadata (Phase 1 minimal)**

  * `request_id text null` (correlation id)
  * `client_user_agent text null`
  * `client_ip inet null` *(only if you already capture; otherwise omit for privacy)*

**Constraints**

* If you keep `status`: `CHECK ((status='submitted') = (submitted_at is not null))`
* If `submitted_at is not null` then `submitted_by` should usually be not null (can be CHECK, but keep nullable if anon submission is allowed).

**Indexes**

* `(firm_id, created_at desc)`
* `(firm_id, submitted_at desc)`
* `(case_id)` (if case linkage is used)

**Note:** You can omit `status` entirely and treat `submitted_at` as the sole lifecycle indicator; that is acceptable and often cleaner. If you omit `status`, drop the enum.

---

## B) Raw intake payload (append-only snapshot)

### `public.intake_raw_payloads`

**Purpose:** Store the exact raw submission payload(s) for an intake.

**Columns**

* `id uuid pk default gen_random_uuid()`
* `firm_id uuid not null references public.firms(id)`
* `intake_id uuid not null references public.intakes(id) on delete cascade`
* `source intake_source not null`
* `payload jsonb not null`
* `captured_at timestamptz not null default now()`
* `captured_by uuid null references auth.users(id)`
* `request_id text null`

**Constraints**

* Enforce firm consistency: `firm_id` must match `intakes.firm_id` (implemented later via trigger or via composite FK pattern; Phase 1 we’ll specify the mechanism in Sub-Phase 4/5).

**Indexes**

* `(intake_id, captured_at desc)`
* `(firm_id, captured_at desc)`

---

## C) Structured intake representation (human or AI-derived)

### `public.intake_structured_versions`

**Purpose:** Store structured intake data with schema versioning and provenance. Supports multiple versions pre-submit.

**Columns**

* `id uuid pk default gen_random_uuid()`
* `firm_id uuid not null references public.firms(id)`
* `intake_id uuid not null references public.intakes(id) on delete cascade`
* `schema_version text not null`

  * Example: `ga_divorce_custody_v1` (aligned to your GA intake doc)
* `data jsonb not null`
* `derived_by transcript_actor_type not null`

  * Use `firm_user` for human-entered, `ai` for AI-generated, `system` for deterministic transforms.
* `ai_run_id uuid null` *(if derived_by='ai')*
* `created_at timestamptz not null default now()`
* `created_by uuid null references auth.users(id)`
* `is_current boolean not null default false`

**Constraints**

* At most one current version per intake: unique partial index on `(intake_id)` where `is_current = true`.
* If `derived_by='ai'`, then `ai_run_id is not null` (CHECK).

**Indexes**

* `(intake_id, created_at desc)`
* `(firm_id, created_at desc)`

---

## D) Transcript events (append-only ordered log)

### `public.intake_transcript_events`

**Purpose:** Canonical log of intake transcript messages and form “events”.

**Columns**

* `id uuid pk default gen_random_uuid()`
* `firm_id uuid not null references public.firms(id)`
* `intake_id uuid not null references public.intakes(id) on delete cascade`
* `occurred_at timestamptz not null default now()`
* `sequence_num bigint not null`
* `actor_type transcript_actor_type not null`
* `actor_user_id uuid null references auth.users(id)`

  * set for `firm_user`; null for `client`/`system`/`ai`
* `channel text null`

  * Phase 1: free text `'chat'|'form'` or make it enum later.
* `content text not null`
* `content_json jsonb null` *(optional; only if you truly need richer structure)*

**Constraints**

* Unique `(intake_id, sequence_num)`
* `CHECK ((actor_type='firm_user') = (actor_user_id is not null))` *(optional if you want strictness)*

**Indexes**

* `(intake_id, sequence_num)`
* `(firm_id, occurred_at desc)`

---

## E) Intake documents (metadata; file stored in Supabase Storage)

You already have `public.case_documents`. Phase 1 requires intake-time docs before a case exists. Do **not** overload `case_documents` with nullable `case_id` unless you accept confusion.

### `public.intake_documents`

**Purpose:** Metadata for documents uploaded during intake.

**Columns**

* `id uuid pk default gen_random_uuid()`
* `firm_id uuid not null references public.firms(id)`
* `intake_id uuid not null references public.intakes(id) on delete cascade`
* `storage_bucket text not null`
* `storage_path text not null`  *(ensure it includes firm UUID prefix if you keep your current storage model)*
* `original_filename text not null`
* `mime_type text not null`
* `size_bytes bigint not null`
* `sha256 bytea null` *(optional; strong defensibility if you can compute it server-side)*
* `uploaded_at timestamptz not null default now()`
* `uploaded_by uuid null references auth.users(id)`
* `deleted_at timestamptz null` *(optional; but note: post-submit immutability may forbid “deletes”)*

**Derived classification (assistive)**

* `doc_type text null`
* `classified_by transcript_actor_type null` *(ai/system/firm_user)*
* `classified_at timestamptz null`
* `classification_confidence numeric null`

**Constraints**

* `(storage_bucket, storage_path)` unique
* Firm consistency with intake (enforced later)

**Indexes**

* `(intake_id, uploaded_at desc)`
* `(firm_id, uploaded_at desc)`

---

## F) AI runs (first-class, auditable)

### `public.ai_runs`

**Purpose:** Record AI executions, inputs (by reference), outputs, and status.

**Columns**

* `id uuid pk default gen_random_uuid()`
* `firm_id uuid not null references public.firms(id)`
* `intake_id uuid null references public.intakes(id) on delete cascade`
* `intake_document_id uuid null references public.intake_documents(id) on delete set null`
* `run_type ai_run_type not null`
* `status ai_run_status not null default 'queued'`
* `model_name text not null`
* `prompt_version text not null`
* `parameters jsonb null`
* `input_refs jsonb not null`

  * Must be references/ids; avoid duplicating raw intake text where feasible.
* `output jsonb null`

  * Null until complete.
* `error text null`
* `created_at timestamptz not null default now()`
* `started_at timestamptz null`
* `completed_at timestamptz null`

**Constraints**

* At least one scope target: `CHECK (intake_id is not null OR intake_document_id is not null)`
* If `status IN ('succeeded','failed','partial')` then `completed_at is not null`
* If `status='succeeded'` then `output is not null`

**Indexes**

* `(firm_id, created_at desc)`
* `(intake_id, created_at desc)`
* `(intake_document_id, created_at desc)`

---

## G) AI flags/findings (assistive-only, review-required)

### `public.ai_flags`

**Purpose:** Store risk flags/findings with explicit non-authoritative semantics.

**Columns**

* `id uuid pk default gen_random_uuid()`

* `firm_id uuid not null references public.firms(id)`

* `ai_run_id uuid not null references public.ai_runs(id) on delete cascade`

* `intake_id uuid null references public.intakes(id) on delete cascade`

* `intake_document_id uuid null references public.intake_documents(id) on delete set null`

* `flag_code text not null`

* `severity flag_severity not null`

* `summary text not null`

* `details jsonb null`

* `evidence_refs jsonb null`

* `confidence numeric null`

* `requires_human_review boolean not null default true`  **(mandatory)**

* `reviewed_by uuid null references auth.users(id)`

* `reviewed_at timestamptz null`

* `review_disposition text null` *(or enum: accept/reject/needs-more-info)*

* `created_at timestamptz not null default now()`

**Constraints**

* At least one target: `CHECK (intake_id is not null OR intake_document_id is not null)`
* If `reviewed_at is not null` then `reviewed_by is not null` (CHECK)

**Indexes**

* `(firm_id, created_at desc)`
* `(intake_id, created_at desc)`
* `(ai_run_id)`

---

## H) Append-only audit log (domain-level)

### `public.audit_log`

**Purpose:** Court-defensible, append-only record of meaningful state changes.

**Columns**

* `id uuid pk default gen_random_uuid()` *(or `bigserial`; uuid is fine in Supabase)*
* `firm_id uuid not null references public.firms(id)`
* `actor_user_id uuid null references auth.users(id)`
* `actor_role text null` *(denormalized for convenience; optional)*
* `action audit_action not null`
* `entity_table text not null`
* `entity_id uuid null` *(some actions may not map cleanly; prefer to fill when possible)*
* `occurred_at timestamptz not null default now()`
* `request_id text null`
* `metadata jsonb null` *(free-form: IP, user agent, API route, etc.)*
* `before jsonb null`
* `after jsonb null`

**Constraints**

* None beyond non-null core fields; keep Phase 1 flexible.

**Indexes**

* `(firm_id, occurred_at desc)`
* `(entity_table, entity_id)`
* `(request_id)`

---

# 2.4 Relationships and “firm consistency” enforcement

Phase 1 requires a clear rule:

* If `child.firm_id` exists, it **must equal** `parent.firm_id`.

Because Postgres cannot express “firm_id must equal referenced row’s firm_id” with a simple FK alone (unless you use composite keys everywhere), we will enforce this in Sub-Phase 4/5 with either:

1. **BEFORE INSERT/UPDATE triggers** that validate firm consistency, or
2. a **composite FK pattern** (`(id, firm_id)` composite unique on parent; child references both).

For defensibility and simplicity, I recommend the **composite FK pattern** for all new Phase 1 tables (it reduces trigger surface area and makes invariants declarative). We will decide formally in the immutability/audit sub-phases, but the schema above is compatible with either approach.

---

# 2.5 Minimal reuse/interaction with existing tables

* `public.firms`, `public.firm_members`, `public.profiles` remain unchanged.
* `public.cases` remains the matter container; Phase 1 can optionally map an intake to a case via `intakes.case_id`.
* Existing `public.case_documents` remains for post-case docs; Phase 1 uses `public.intake_documents` for pre-case docs.
* `public.case_activity` is not used as the audit log; it may remain as a UI timeline stream, but audit is DB-enforced in `public.audit_log`.

---

# 2.6 What this schema enables (Phase 1) — strictly by construction

* A defensible intake record is a **bundle**:

  * `intakes` (lifecycle) +
  * `intake_raw_payloads` (raw, append-only snapshot) +
  * `intake_transcript_events` (append-only transcript) +
  * `intake_structured_versions` (structured, versioned) +
  * `intake_documents` (doc metadata) +
  * `ai_runs`/`ai_flags` (assistive outputs, review-required) +
  * `audit_log` (append-only changes)
* Immutability is enforceable centrally by checking `intakes.submitted_at`.

---

## Proceeding

If you proceed, I will execute **Sub-Phase 3: Firm scoping model and RLS policy set**, producing:

1. a **policy matrix** (table × operation × role), and
2. the **exact RLS policy definitions** (Codex-ready SQL) aligned with your existing helper functions and service-role realities.
