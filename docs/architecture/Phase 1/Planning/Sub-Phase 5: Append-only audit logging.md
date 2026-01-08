## Sub-Phase 5 — Append-only audit logging (court-defensible, DB-enforced)

This sub-phase defines a **domain audit log** that is:

* **append-only** (no UPDATE/DELETE)
* **DB-enforced** (trigger-driven; not “best-effort” application logging)
* **firm-scoped**
* usable even when your API writes via **service role** (RLS-bypassing)

It includes: (1) audit semantics, (2) audit coverage, (3) trigger strategy, and (4) request/actor correlation in Supabase.

---

# 5.1 Audit semantics (what is recorded)

### 5.1.1 Canonical table

Use the `public.audit_log` table defined in Sub-Phase 2, with these semantics:

* **One row per meaningful change** (not per SQL statement if bulk operations exist; but Phase 1 expects low volume and simple writes)
* `action` is **domain-oriented**, not just `INSERT/UPDATE/DELETE`:

  * `insert`, `update`, `delete`
  * `submit` (explicitly when `submitted_at` is set)
  * `review` (AI flag review disposition)
  * `classify` (document classification changes)
  * `deny` (optional: record blocked mutation attempts)

### 5.1.2 Before/after payload strategy (Phase 1)

Phase 1 should default to **before + after JSONB** for UPDATE, and **after** for INSERT, **before** for DELETE.

However, to avoid duplicating sensitive or huge blobs, define a **per-table redaction/exclusion policy**:

* For `intake_raw_payloads.payload`: do **not** store the full payload again in `audit_log.before/after`. Instead:

  * store a minimal descriptor in `audit_log.metadata` (e.g., payload byte length, schema_version if present, and the `intake_raw_payloads.id`)
  * if you add hashing (recommended), store `sha256` of the payload (computed in app or DB).
* For `ai_runs.output`: store full output JSONB **is acceptable** in Phase 1 *if it is not massive*; otherwise store a summary and keep the canonical output in `ai_runs.output` (which is immutable after completion).

**Result:** the audit log remains defensible without becoming an uncontrolled copy of all sensitive content.

---

# 5.2 What counts as “meaningful” (audit coverage)

Minimum Phase 1 coverage (must be trigger-enforced):

## Intake lifecycle

* `intakes`:

  * INSERT → `action='insert'`
  * UPDATE (draft changes) → `action='update'`
  * SUBMIT event (when `submitted_at` transitions NULL → NOT NULL) → `action='submit'` (separate audit row; see below)

## Intake artifacts

* `intake_raw_payloads`: INSERT → `action='insert'` (metadata-only in audit)
* `intake_transcript_events`: INSERT → `action='insert'`
* `intake_structured_versions`: INSERT → `action='insert'`; UPDATE (if allowed pre-submit) → `action='update'`

## Documents

* `intake_documents`: INSERT → `action='insert'`
* Classification changes (doc_type/classified_by/classified_at/classification_confidence):

  * UPDATE where only classification fields change → `action='classify'`

## AI

* `ai_runs`:

  * INSERT → `action='insert'`
  * UPDATE status progression → `action='update'`
  * When status transitions to completed (succeeded/failed/partial) → optional separate `action='update'` is fine; you may also record `action='complete'` but that’s not required Phase 1.
* `ai_flags`:

  * INSERT → `action='insert'`
  * Review disposition changes → `action='review'`

## Immutability enforcement (optional but recommended)

* Any update/delete blocked post-submit (from Sub-Phase 4 triggers) can write an `audit_log` row with:

  * `action='deny'`
  * `metadata` including the table/operation and attempted columns
    This is useful for operational defensibility, but not strictly required.

---

# 5.3 Trigger strategy (DB-enforced)

## 5.3.1 Central helper: audit context

Because your API commonly writes via **service role** (so `auth.uid()` will often be NULL), you need a DB-supported way to correlate:

* **who** (actor_user_id)
* **which firm**
* **which request** (request_id / correlation id)

### Required mechanism (Phase 1, minimal)

Define a convention that each request (API route / edge function) sets session-local values before doing writes:

* `verilex.request_id`
* `verilex.actor_user_id`
* `verilex.actor_role` (optional)
* `verilex.user_agent` (optional)

In Postgres, triggers can read these via `current_setting('verilex.request_id', true)`.

**How you set them from the app:** add a small SQL RPC function (SECURITY DEFINER) such as:

* `public.set_audit_context(request_id text, actor_user_id uuid, actor_role text, user_agent text) returns void`

Your API calls this once at the start of each request using the same DB connection, then all subsequent writes inherit the settings via `set_config(..., true)`.

This is the cleanest Phase 1 approach because it works whether writes are made with anon JWT context or service role.

## 5.3.2 Audit trigger function (generic)

Create a single generic trigger function conceptually like:

* `public.audit_row_change() returns trigger`

Behavior:

* Determine `firm_id`:

  * Prefer `NEW.firm_id` on INSERT/UPDATE
  * Else `OLD.firm_id` on DELETE
* Determine actor:

  * First: `current_setting('verilex.actor_user_id', true)::uuid`
  * Else: `auth.uid()` (covers direct user-session writes)
  * Else: NULL
* Determine request_id:

  * `current_setting('verilex.request_id', true)`
* Determine action:

  * default to `insert/update/delete`
  * allow table-specific “action override” via wrapper triggers (see below)
* Determine before/after:

  * INSERT: after = `to_jsonb(NEW)`
  * DELETE: before = `to_jsonb(OLD)`
  * UPDATE: both before+after, but apply per-table exclusions

Insert into `public.audit_log`.

### Append-only protection

Add a trigger on `public.audit_log` that raises on UPDATE/DELETE unconditionally, ensuring append-only even for service role.

## 5.3.3 Table-specific audit triggers

Attach triggers as follows:

### `public.intakes`

* AFTER INSERT → audit `insert`
* AFTER UPDATE → audit `update`
* Additional AFTER UPDATE trigger that fires only when `submitted_at` changes NULL → NOT NULL:

  * write `action='submit'`
  * metadata includes `submitted_by`, and optionally a submission “bundle” summary (counts of transcript events/docs/raw payloads)

### `public.intake_documents`

* AFTER UPDATE trigger with WHEN clause detecting classification-field-only changes:

  * write `action='classify'`
* Otherwise normal UPDATE audit is acceptable (Phase 1).

### `public.ai_flags`

* AFTER UPDATE trigger with WHEN clause detecting review-field changes:

  * write `action='review'`

### `public.intake_raw_payloads`

* AFTER INSERT audit but **exclude payload** from after/before (store metadata/hashes only)

---

# 5.4 RLS posture for audit_log (Phase 1)

Because audit rows are written by triggers (SECURITY DEFINER context possible), Phase 1 should treat audit log as **trigger-only writable**:

* RLS:

  * SELECT: **firm admin only** (recommended default)
  * INSERT/UPDATE/DELETE: **none** (deny by default)
* DB triggers insert regardless of RLS if implemented with appropriate definer permissions; even without SECURITY DEFINER, triggers run as the table owner.

This ensures:

* app code cannot “forge” audit rows directly,
* audit integrity is centrally controlled.

---

# 5.5 Explicit per-table redaction/exclusion policy (Phase 1)

To keep this precise and court-defensible:

| Table                        | Audit on INSERT     | Audit on UPDATE       | Audit on DELETE | Exclusions                                                                                 |
| ---------------------------- | ------------------- | --------------------- | --------------- | ------------------------------------------------------------------------------------------ |
| `intakes`                    | yes (full after)    | yes (before/after)    | optional        | none                                                                                       |
| `intake_raw_payloads`        | yes (metadata only) | no                    | no              | exclude `payload`                                                                          |
| `intake_transcript_events`   | yes (full after)    | no                    | no              | none                                                                                       |
| `intake_structured_versions` | yes (after)         | only if allowed       | optional        | none (unless data is massive)                                                              |
| `intake_documents`           | yes                 | yes                   | optional        | none; classification has action override                                                   |
| `ai_runs`                    | yes                 | yes                   | no              | optionally exclude `input_refs` if you consider it too sensitive; prefer keeping refs only |
| `ai_flags`                   | yes                 | yes (review override) | no              | none                                                                                       |
| `audit_log`                  | n/a                 | **blocked**           | **blocked**     | n/a                                                                                        |

---

# 5.6 Phase 1 “actor identity” reality (service role) and how we handle it

Because your current API pattern often executes writes using the **service role key**, **`auth.uid()` will not reliably identify the actor**. Therefore:

* The database must support **explicit actor context** (session settings) set by the API at runtime.
* If the API fails to set audit context, `actor_user_id` may be NULL; this is acceptable but should be operationally discouraged.

**Phase 1 recommendation (non-negotiable for defensibility):**

* Require the API to call `set_audit_context(...)` before any intake-related mutation.
* Add a DB check in the audit trigger: if `actor_user_id` is NULL for certain actions (e.g., `submit`, `review`), raise an exception (or at least populate metadata `actor_missing=true`). I recommend **enforcement on submit/review** because those are legally meaningful.

---

## Proceeding

If you proceed, Sub-Phase 6 will finalize the **AI recordkeeping boundaries (assistive-only)** at the schema and constraint level, including:

* mandatory “requires human review” semantics,
* what is stored as references vs raw content,
* and the minimal constraints that prevent ambiguous “authoritative AI” data from creeping into Phase 1.
