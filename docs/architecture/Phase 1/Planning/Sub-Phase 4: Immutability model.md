## Sub-Phase 4 — Immutability model (post-submission lock)

This sub-phase defines the **DB-enforced immutability rules** once an intake is submitted, including (a) what becomes immutable, (b) what—if anything—may still change, and (c) the **trigger strategy** to enforce it even when application code uses the Supabase service role.

### Phase 1 posture (explicit)

* **“Submitted” is the lock boundary.** We treat `public.intakes.submitted_at IS NOT NULL` as finalization.
* After submission, the system must support **review workflows** (attorney review of AI flags; possibly marking classification as reviewed) without rewriting the underlying intake facts.
* Any allowed post-submit edits must be:

  1. narrowly scoped to “review metadata,” and
  2. comprehensively auditable (Sub-Phase 5).

---

# 4.1 Immutable vs mutable surface area (table-by-table)

## A) `public.intakes` (envelope)

### Immutable after submit

* Everything except a *very small* allowlist.

### Allowed after submit (Phase 1)

* **None** (strongest defensibility), OR at most:

  * `case_id` linkage (if you want to attach the created case after submission), and
  * internal-only operational metadata like `updated_at` (trigger-managed).

**Recommendation:** Allow **only `case_id`** to be set after submission, because “intake → case creation” is a core flow and you may want to create a case asynchronously after intake is submitted.

**Rule:** If `submitted_at IS NOT NULL`, UPDATE is rejected unless the only changed column is `case_id` (and perhaps `updated_at`).

---

## B) `public.intake_raw_payloads` (raw snapshot)

### Immutable always

* INSERT-only. No updates/deletes ever.

---

## C) `public.intake_transcript_events` (append-only log)

### Immutable always

* INSERT-only. No updates/deletes ever.

---

## D) `public.intake_structured_versions` (structured)

### Pre-submit

* INSERT multiple versions.
* UPDATE permitted only if you use `is_current` toggling; otherwise keep append-only.

### Post-submit

Two acceptable Phase 1 patterns:

**Pattern 1 (recommended): append-only structured versions**

* After submission: allow INSERT of new versions only if marked as “correction”/“review” and clearly attributable (e.g., `derived_by='firm_user'`).
* Disallow UPDATE of existing versions (including `is_current` flips), and instead designate “current” via a view or by inserting a new version with `is_current=true` while triggers automatically unset prior current. (This still mutates old rows unless implemented carefully.)

**Pattern 2 (simpler but slightly weaker): allow limited updates**

* After submission: allow UPDATE only for `is_current` and review metadata fields (if any), while **blocking changes to `data` and provenance fields**.

**Recommendation for Phase 1:** Pattern 2 is operationally simpler, but for legal defensibility Pattern 1 is cleaner. If you want MVP simplicity without over-engineering:

* keep `intake_structured_versions` **append-only after submission**, and
* do not store `is_current` at all; instead the “current structured intake” is defined as the latest `created_at` (or latest version by monotonic id).

That removes the need for post-submit UPDATE entirely.

---

## E) `public.intake_documents` (doc metadata)

Split the columns into:

1. **file-facts** (immutable): bucket/path/name/mime/size/hash/uploaded_at/uploaded_by/intake_id/firm_id
2. **derived review/classification** (mutable): doc_type, classified_by, classified_at, classification_confidence

### After submission

* Block any changes to file-facts.
* Allow changes to classification/review fields (because attorneys may correct classification).

---

## F) `public.ai_runs` (AI execution record)

### Pre-completion

* Allow status progression fields to update:

  * `status`, `started_at`, `completed_at`, `output`, `error`

### After completion (`status in ('succeeded','failed','partial')`)

* The row becomes immutable (no UPDATE/DELETE).

**Rationale:** Ensures a completed run is an immutable record.

---

## G) `public.ai_flags` (assistive findings)

* Findings rows should be immutable as findings, but allow review workflow.

### After submission

* Allow UPDATE only to review fields:

  * `reviewed_by`, `reviewed_at`, `review_disposition`
* Block changes to:

  * `flag_code`, `severity`, `summary`, `details`, `evidence_refs`, `confidence`, `requires_human_review`, linkages

---

## H) `public.audit_log`

* INSERT-only always. No updates/deletes.

---

# 4.2 Enforcement strategy (DB-level, service-role safe)

RLS does **not** protect against service-role writes. Therefore, immutability must be enforced with **triggers** (or rules) that execute regardless of the role used by the application.

### Core mechanism

* A `BEFORE UPDATE OR DELETE` trigger on each protected table that:

  1. determines the intake lock state (by joining to `public.intakes`), and
  2. rejects disallowed mutations with `RAISE EXCEPTION`.

### Trigger function design (Phase 1)

Create two reusable trigger functions (conceptually; naming can follow your conventions):

1. **`enforce_intake_lock()`**

   * For tables that are directly linked to `intake_id` (`raw_payloads`, `structured_versions`, `transcript_events`, `intake_documents`, `ai_runs`, `ai_flags`).
   * It checks:

     * If the referenced intake has `submitted_at IS NOT NULL`, then:

       * allowlist-based update (per table), else deny
     * If DELETE attempt and intake submitted: deny (almost always)

2. **`enforce_ai_run_completion_lock()`**

   * For `ai_runs` specifically: if NEW/OLD indicates completion, deny subsequent updates.

You can implement as one function with table-specific behavior, but Phase 1 maintainability is better with either:

* one function per table (clear and explicit), or
* one shared function with `TG_TABLE_NAME` allowlists (still manageable in MVP).

**Phase 1 recommendation:** Shared function with table-specific allowlists using `TG_TABLE_NAME`. It avoids boilerplate while remaining explicit.

---

# 4.3 Exact allowlists (column-level rules)

Below are the **column-level allowlists** for post-submit updates.

## `public.intakes`

* Allow UPDATE only if changed columns ⊆ `{case_id, updated_at}`
* Deny all DELETE once submitted.

## `public.intake_raw_payloads`

* Deny all UPDATE and DELETE always.

## `public.intake_transcript_events`

* Deny all UPDATE and DELETE always.

## `public.intake_structured_versions`

Choose one:

### Option A (cleanest): append-only post-submit

* Deny all UPDATE/DELETE always (or at least post-submit).
* Allow INSERT always (RLS controls who can insert).
* “Current structured intake” is selected by query (latest version).

### Option B (if you keep `is_current`)

* After submit allow UPDATE only for: `{is_current, updated_at}`
* Deny changes to `data`, `schema_version`, `derived_by`, `ai_run_id`, `created_by`, `created_at`, etc.

## `public.intake_documents`

* After submit allow UPDATE only for:

  * `{doc_type, classified_by, classified_at, classification_confidence, updated_at}`
* Deny updates to file-facts and linkage columns.

## `public.ai_runs`

* While not completed: allow UPDATE only for:

  * `{status, started_at, completed_at, output, error, updated_at}`
* After completion: deny all UPDATE/DELETE.

## `public.ai_flags`

* Allow UPDATE only for:

  * `{reviewed_by, reviewed_at, review_disposition, updated_at}`
* Deny all DELETE.

## `public.audit_log`

* Deny UPDATE/DELETE always.

---

# 4.4 “Firm consistency” invariants (belongs here operationally)

Immutability alone is insufficient if rows can be created with mismatched firm references. In Phase 1, enforce one of the following:

### Preferred (declarative): composite firm-aware foreign keys

For each parent, add a unique constraint on `(id, firm_id)` and have children reference both:

* `intakes`: `UNIQUE (id, firm_id)`
* `intake_*` child tables: store both `intake_id` and `intake_firm_id` (or just `firm_id` but reference `(intake_id, firm_id)`)

This makes “child.firm_id must equal parent.firm_id” a **real FK**.

### Alternate (trigger-based): firm match checks

A `BEFORE INSERT OR UPDATE` trigger verifies:

* child.firm_id equals parent.firm_id

**Phase 1 recommendation:** Use **composite FK** for new tables. It reduces trigger complexity and makes invariants auditable and clear.

If you adopt composite FK, the schema in Sub-Phase 2 needs a small adjustment: each child table’s FK to `intakes` becomes `(intake_id, firm_id) -> (intakes.id, intakes.firm_id)`.

---

# 4.5 Deny semantics (what the DB returns)

When rejecting a mutation due to submission lock, use a consistent error signature so the app can handle it deterministically:

* SQLSTATE: `P0001` (default for RAISE EXCEPTION) is fine.
* Message pattern (example):

  * `Intake is submitted and immutable: <table>.<operation> denied`

This is important because it becomes part of operational audit and supportability.

---

## Proceeding

If you proceed, Sub-Phase 5 will define **append-only audit logging** in a court-defensible manner, including:

* the exact audit table semantics (before/after vs diff),
* which tables/actions are audited,
* trigger placement and SECURITY DEFINER strategy,
* and how to correlate changes with `request_id` / actor identity in Supabase contexts.
