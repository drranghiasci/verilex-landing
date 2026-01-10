Proceeding with **Sub-Phase 0: Artifact intake and current-state inventory (As-Is)**.

## 0A. What’s in the current database (tables that matter for Workflow 1)

### Firm / identity core

* `public.firms` — firm record (`plan`, `practice_focus`, office fields).
* `public.firm_members` — join table (`firm_id`, `user_id`, `role`, `is_active`).
* `public.firm_invites` — invite-by-email flow (`firm_id`, `email`, `role`, `status`).
* `public.profiles` — user profile row keyed by `id` (matches `auth.users.id`).

### “Case” core (current operational wedge)

* `public.cases` — already includes `firm_id` and basic client/matter metadata plus `intake_summary` (free-text).
* `public.case_documents` — firm-scoped docs metadata with `storage_path`; supports soft delete via `deleted_at`.
* `public.case_tasks` — firm-scoped tasks; due date/time fields present.
* `public.case_activity` — firm-scoped event stream (“timeline”) with `event_type`, `message`, `metadata`.

### “Intake” currently present (but not client intake)

* `public.firm_intakes` — appears to be **firm onboarding intake** (sales/admin funnel), not matter/client intake (fields: firm name, admin email, CMS, notes, approval fields).

## 0B. Current RLS model (as implemented)

### Helper functions (SECURITY DEFINER)

* `public.is_firm_member(check_firm_id uuid)`
* `public.is_firm_admin(check_firm_id uuid)`
* `public.is_firm_editor(check_firm_id uuid)` — role in (`admin`, `attorney`)
* `public.storage_firm_id_from_path(path text)` — parses a leading UUID segment from storage object path

### RLS policies currently defined (high level)

* `cases`:

  * SELECT: firm members
  * INSERT/UPDATE: firm editors (`admin`, `attorney`)
* `case_documents`:

  * SELECT: firm members
  * INSERT/UPDATE: firm editors
* `case_tasks`:

  * SELECT: firm members
  * INSERT/UPDATE: firm editors (policy list shows duplicates—functionally redundant, but should be cleaned)
* `case_activity`:

  * SELECT: firm members
  * INSERT: firm members
* `profiles`:

  * SELECT/UPDATE: own row only
* `firm_members`:

  * SELECT: own row OR firm admins (admin can view firm roster)
* `firms`:

  * SELECT: firm members; UPDATE: firm admin only
* `firm_intakes`:

  * INSERT: allowed to `anon` and `authenticated` with `true` check (i.e., public submission); no corresponding SELECT/UPDATE policies observed in the exported policy list.

### Storage policy (case-documents bucket)

* SELECT on `storage.objects` is constrained to authenticated users who are members of the firm associated with the `case_documents.storage_path`.

## 0C. Current triggers and “immutability” posture (as-is)

* Triggers present are **only** “updated_at” convenience triggers on: `cases`, `case_tasks`, `firm_intakes`, `firm_members`, `firms`.
* There is **no** DB-level immutability mechanism presently (no “submitted lock,” no UPDATE/DELETE blocking, no append-only enforcement).

## 0D. Current audit posture (as-is)

* There is no dedicated `public.*` append-only audit log table in the current schema.
* `public.case_activity` is an application event/timeline stream, but it is not a comprehensive audit mechanism (it is selectively written, “best-effort” in the API routes, and not DB-enforced).
* `auth.audit_log_entries` exists (Supabase auth schema), but it is auth-focused and not sufficient to satisfy “all meaningful state changes auditable” for domain data.

## 0E. Observed data access pattern (important for defensibility)

* Server-side Next.js API routes commonly use the **service role key** to perform data reads/writes (bypassing RLS), then enforce permissions in code by:

  1. validating bearer token via anon client,
  2. loading `firm_members` membership via admin client,
  3. checking role in application logic, then
  4. writing rows via admin client (and sometimes writing `case_activity` as “best-effort logging”).

This is not “wrong,” but it means DB-enforced guarantees (immutability, append-only audit) become critical, because RLS alone is not protecting service-role writes.

## 0F. Security / correctness issues detected in the export (as-is risks)

1. `public.call_confirmation_email()` trigger function contains a hard-coded bearer token and hard-coded Edge Function URL in the SQL definition. This is a material security concern and should not live in schema exports.
2. `public.redeem_invite()` references `profiles.access_code` / `profiles.beta_access` / `profiles.code`—columns that do not exist on the current `public.profiles` table definition. This function is either stale or incomplete and should be reconciled before relying on it.

## 0G. Gap list against Phase 1 requirements (no design yet; purely delta)

### Court-defensible client intake

* **Gap:** No Phase 1 client intake “envelope” or raw/structured intake storage exists yet (current “intake” appears to be case creation plus optional `intake_summary` text). The Georgia Family Law structured intake schema you provided implies a much richer structured dataset than current `cases` supports. 

### Firm-isolated access

* **Partially present:** firm scoping is already implemented with `firm_id` on core tables + RLS helpers/policies.
* **Gap:** Any new intake/AI/audit tables must follow the same firm-scoped pattern without exception.

### Immutable intake records after submission

* **Gap:** No submission-state model and no DB-enforced immutability exists today.

### Append-only audit logging

* **Gap:** No append-only audit log exists; `case_activity` is not comprehensive or immutable.

### AI outputs assistive, never authoritative

* **Gap:** No AI run/flag tables exist yet; no schema-level constraints ensuring “assistive-only” semantics (e.g., review-required, confidence, provenance). This needs to align with the AI Architecture principles (human-in-the-loop, immutable audit logs, zero training on firm data). 
* Phase 1 product map also explicitly expects structured extraction, risk flags, doc classification, and immutable intake → case creation, which is not fully represented in the current schema. 

---

If you want me to continue immediately (still within Workflow 1), the next deliverable is **Sub-Phase 1: Phase 1 data requirements (hard requirements only)**, expressed as acceptance criteria that map directly to database constructs. 
