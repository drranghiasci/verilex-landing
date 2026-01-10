## Sub-Phase 1 — Phase 1 data requirements (hard requirements only)

Below are the **Phase 1 data requirements expressed as DB-verifiable acceptance criteria**. This is intentionally **implementation-facing** (tables, constraints, triggers, RLS outcomes), and avoids future-phase abstractions.

---

# 1) Firm scoping and isolation

### R1.1 — Every domain row is firm-scoped

**Requirement:** All Phase 1 domain tables (intakes, intake artifacts, transcripts, AI runs/flags, documents, audit) must include a `firm_id uuid not null`.

**Acceptance criteria (DB-verifiable):**

* For each Phase 1 table `T`, `T.firm_id` exists and is `NOT NULL`.
* Foreign keys to firm-owned entities enforce firm consistency either by:

  * direct firm_id on child row + RLS scoped by that firm_id, and/or
  * a constraint/trigger preventing cross-firm references (Phase 1 preference: direct firm_id on every row).

### R1.2 — RLS denies cross-firm access by default

**Requirement:** Authenticated users can only `SELECT` rows for firms where they are active members; writes are role-limited.

**Acceptance criteria:**

* With RLS enabled on each Phase 1 table:

  * A user who is **not** a member of `firm A` cannot `SELECT` any rows where `firm_id = firm A`.
  * A user who **is** a member of `firm A` can `SELECT` firm A rows (unless further restricted by role/sensitivity; see Section 6).
* Write access:

  * Baseline: only `admin` / `attorney` can mutate operational objects (intake creation may be broader; see Section 2).
  * The effective permissions are enforced in Postgres policies (not only application code).

---

# 2) Court-defensible client intake capture

### R2.1 — Intake “envelope” exists and is the authoritative lifecycle record

**Requirement:** There is a single authoritative intake record representing a client intake instance.

**Acceptance criteria:**

* A table exists for intake envelopes (e.g., `intakes`) with:

  * `id uuid pk`
  * `firm_id uuid not null`
  * lifecycle timestamps: `created_at`, `submitted_at` (nullable pre-submit), and optionally `superseded_at` (only if you allow a “replace intake” pattern in Phase 1; otherwise omit)
  * `created_by uuid null` (nullable to allow anonymous/public intake submission if required)
* `submitted_at IS NULL` indicates “draft / in-progress”; `submitted_at IS NOT NULL` indicates “final / immutable”.

### R2.2 — Raw intake payload is stored immutably and is queryable

**Requirement:** The raw intake submission must be stored in a form that is defensible, attributable, and non-lossy.

**Acceptance criteria:**

* There exists a raw payload table (e.g., `intake_raw_payloads`) with:

  * `intake_id uuid fk`
  * `firm_id uuid not null`
  * `payload jsonb not null` (the exact received submission)
  * `captured_at timestamptz not null`
  * provenance metadata sufficient to defend how/when it was captured (minimum viable):

    * `source` (e.g., `'web_form' | 'chat' | 'import'`)
    * `client_user_agent text null`
    * `client_ip inet null` (only if you are already collecting; otherwise omit for privacy—do not invent)
    * `request_id uuid/text null` (correlation id)
* Raw payload rows are **append-only** (no UPDATE/DELETE permitted via RLS and/or triggers).

### R2.3 — Structured intake representation exists (assistive extraction compatible)

**Requirement:** The intake’s structured representation is stored separately from raw, suitable for downstream workflows.

**Acceptance criteria:**

* There exists a structured store (choose one Phase 1 approach):

  1. **Single JSONB structured record** per intake (recommended for MVP) with stable schema versioning, OR
  2. **Field/value rows** (more rigid but heavier)
* Must include:

  * `intake_id`, `firm_id`
  * `schema_version text not null`
  * `data jsonb not null` (or equivalent)
  * `derived_by` metadata: `'human' | 'ai' | 'system'` (Phase 1 minimum)
  * `created_at`
* If AI produces the structured version, it must be marked **assistive** (see Section 5/6).

---

# 3) Intake transcript storage (chat + form hybrid)

### R3.1 — Transcript events are stored as an ordered, append-only log

**Requirement:** The intake conversation/transcript must be preserved as a sequence of events.

**Acceptance criteria:**

* There exists an `intake_transcript_events` table with:

  * `intake_id`, `firm_id`
  * `event_id uuid pk`
  * `occurred_at timestamptz not null`
  * `sequence_num bigint not null` (monotonic per intake; unique `(intake_id, sequence_num)`)
  * `actor_type` (`'client' | 'firm_user' | 'system' | 'ai'`)
  * `content text` (or `content jsonb` if you need richer multi-modal)
  * optional `channel` (`'chat' | 'form'`)
* Events are **append-only** (no UPDATE/DELETE).
* If redaction is needed, it must be implemented as **new append-only events** (e.g., `event_type='redaction_notice'`) rather than mutation.

---

# 4) Document metadata and classification support

### R4.1 — Intake/case documents are represented with immutable metadata references

**Requirement:** Uploaded documents associated with an intake (and/or later case) must be tracked with firm scoping and provenance.

**Acceptance criteria:**

* A document metadata table exists for intake documents (you may reuse/extend `case_documents` only if it remains Phase 1 minimal and firm-scoped).
* Must include:

  * `firm_id not null`
  * association: either `intake_id` or `case_id` (or both, but avoid future-phase complexity—pick what Phase 1 needs)
  * `storage_bucket`, `storage_path` (or existing storage pattern)
  * `original_filename`, `mime_type`, `size_bytes`
  * `uploaded_at`, `uploaded_by`
* Classification support:

  * columns to store *assistive* classification output:

    * `doc_type` (enum/text), `confidence`, `classified_by` (`'human'|'ai'`), `classified_at`
  * classification does not overwrite immutable file facts; it is either separate columns clearly marked as derived, or a separate derived table.

---

# 5) AI execution records (runs, flags, metadata)

### R5.1 — AI runs are stored as first-class, auditable records

**Requirement:** Every AI-assisted operation that produces outputs used by the firm must be recorded.

**Acceptance criteria:**

* An `ai_runs` table exists with:

  * `id uuid pk`
  * `firm_id not null`
  * linkage: `intake_id` and/or `document_id` (whichever the run applies to)
  * `run_type` (e.g., `'extract_structured' | 'risk_flags' | 'doc_classify'`)
  * `model_name` (text), `prompt_version` (text), `parameters jsonb null` (Phase 1 minimal)
  * `input_refs jsonb not null` (references/ids; avoid duplicating sensitive raw input unless required)
  * `output jsonb not null`
  * `status` (`'succeeded'|'failed'|'partial'`)
  * `created_at`, `completed_at`
* AI run rows are **append-only** after creation (if status updates are needed, either:

  * allow UPDATE only for status fields until completion, then lock, or
  * store status transitions as append-only events; pick one and enforce it).

### R5.2 — AI flags are stored separately and are explicitly non-authoritative

**Requirement:** Risk flags and extracted findings must be stored as assistive outputs, never as authoritative determinations.

**Acceptance criteria:**

* An `ai_flags` (or `ai_findings`) table exists with:

  * `firm_id`, `intake_id` (and/or `document_id`)
  * `ai_run_id fk`
  * `flag_code` (stable identifier), `severity` (bounded enum), `summary`
  * `evidence_refs jsonb` (references to transcript events / raw fields / doc pages)
  * `confidence numeric` (bounded 0–1 or 0–100; choose one)
  * **mandatory**: `requires_human_review boolean not null default true`
  * optional: `reviewed_by uuid null`, `reviewed_at timestamptz null`, `review_disposition` (enum/text)
* Flags can be “resolved” only via:

  * updating review fields (allowed mutation) OR
  * append-only review event table (preferred for defensibility; but Phase 1 can be minimal if audit logging captures review updates).

---

# 6) Immutability rules after intake submission

### R6.1 — Submission locks the intake and all associated core artifacts

**Requirement:** Once an intake is submitted, it becomes immutable.

**Acceptance criteria:**

* After `intakes.submitted_at` is set (non-null):

  * The following cannot be UPDATED or DELETED:

    * the intake envelope row (except possibly a very narrow set of “non-substantive” fields, if any—Phase 1 preference: none)
    * raw payload rows
    * transcript event rows
    * AI run output rows
    * document metadata rows that represent the received file facts (storage path, mime, size, hash if present)
* Any post-submit “corrections” must be captured as:

  * new append-only rows (preferred), or
  * narrowly-permitted fields with comprehensive audit triggers.

### R6.2 — Draft mutation is allowed but auditable

**Requirement:** Pre-submission edits are allowed to support intake completion, but must be auditable.

**Acceptance criteria:**

* While `submitted_at IS NULL`, updates/inserts to draft-relevant tables are permitted per role model.
* Every meaningful pre-submit change generates audit entries (see Section 7).

---

# 7) Append-only audit logging (meaningful state changes)

### R7.1 — Dedicated audit log table exists and is append-only

**Requirement:** A domain audit log exists independent of application logging.

**Acceptance criteria:**

* An `audit_log` table exists with:

  * `id` (uuid/bigserial), `firm_id not null`
  * `actor_user_id uuid null`
  * `action` (enum/text; e.g., `'INSERT'|'UPDATE'|'DELETE'|'SUBMIT'|'REVIEW'`)
  * `entity_table`, `entity_id`
  * `occurred_at timestamptz not null default now()`
  * `request_id` / `correlation_id` (text/uuid null)
  * `before jsonb null`, `after jsonb null` (or a diff strategy)
* Audit log rows are append-only (no UPDATE/DELETE allowed).

### R7.2 — Audit coverage includes all meaningful state changes

**Requirement:** Any meaningful state change in Phase 1 entities is captured.

**Acceptance criteria:**
At minimum, audit entries are produced for:

* intake envelope creation and submission
* raw payload creation
* structured intake creation/updates (pre-submit only)
* transcript event insertion
* document metadata insertion and classification changes
* AI run creation/completion
* AI flag creation and review disposition changes
* any attempted mutation blocked by immutability triggers (optional but recommended; if included, record as `action='DENY_UPDATE_AFTER_SUBMIT'` etc.)

---

# 8) “No training on firm data” (data-layer posture)

### R8.1 — AI tables store provenance and prevent ambiguous reuse

**Requirement:** The database design must not imply training usage and must support strict provenance.

**Acceptance criteria:**

* AI outputs include:

  * `model_name`, `prompt_version`, and `input_refs`
  * explicit fields like `is_assistive boolean not null default true` (or equivalent semantics via `requires_human_review`)
* No table/column is designed for “training dataset export” as a feature; any export would be an explicit admin operation outside Phase 1 scope.

---

## Immediate next step (Sub-Phase 2)

If you proceed, I will translate these requirements into a **Phase 1 canonical schema proposal** (tables, columns, constraints, indexes) that:

* reuses existing firm/role/RLS helper patterns where appropriate,
* adds only what Phase 1 needs,
* and is structured to make **immutability + audit** DB-enforceable even when service-role writes exist.
