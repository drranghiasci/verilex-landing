## Sub-Phase 6 — AI recordkeeping boundaries (assistive-only, Phase 1)

This sub-phase tightens the **schema-level guarantees** so AI outputs are always:

* explicitly **assistive** (never authoritative),
* **reviewable** and attributable,
* **auditable and immutable** once finalized,
* and do not implicitly enable “training on firm data.”

This is not about prompting; it is about **data contracts and invariants**.

---

# 6.1 Assistive-only semantics (hard schema guarantees)

## A) `public.ai_flags` must be review-gated by construction

### Required invariants

1. Every AI flag is **review-required** by default and cannot be “self-authorized.”

   * `requires_human_review boolean not null default true`
2. A flag can only be marked “reviewed” if a firm user is identified.

   * `CHECK (reviewed_at is null OR reviewed_by is not null)`
3. Review disposition is a *human workflow artifact*, not an AI mutation.

   * `review_disposition` values should be bounded (enum/check) to avoid ambiguous “approved by AI” semantics.

**Phase 1 disposition set (suggested):**

* `accepted`
* `dismissed`
* `needs_more_info`

(Do not store “true/false” as an authoritative legal conclusion.)

---

## B) AI-derived structured intake data must be marked and traceable

If AI produces a structured intake version:

* `intake_structured_versions.derived_by = 'ai'`
* `intake_structured_versions.ai_run_id IS NOT NULL`

**Hard constraint:**

* `CHECK (derived_by <> 'ai' OR ai_run_id is not null)`

This ensures every AI-derived structured record is traceable to an immutable `ai_runs` record.

---

## C) “AI outputs” are not allowed to overwrite “client facts”

Phase 1 avoids any design where AI results replace intake facts in place.

**Practical rule in schema:**

* Store “facts” as either:

  * raw payload + transcript (canonical), and
  * structured versions (versioned)
* Store AI outputs **only** in `ai_runs.output` + `ai_flags` and optionally `intake_structured_versions` **as a distinct version**.

You should not add columns like `cases.has_domestic_violence boolean` that are filled by AI in Phase 1, because they become easily misconstrued as authoritative system-of-record facts.

---

# 6.2 Minimal provenance contract for AI runs (Phase 1)

## `public.ai_runs` required fields (already proposed)

* `model_name text not null`
* `prompt_version text not null`
* `run_type ai_run_type not null`
* `input_refs jsonb not null`
* `output jsonb` (nullable until complete)
* `status ai_run_status not null`

### Additional recommended fields (Phase 1 defensibility, still minimal)

* `is_assistive boolean not null default true`

**Why:** It makes “assistive-only” explicit at the data layer and supports compliance review without reading JSON output.

### Constraints

* `CHECK (is_assistive = true)`
  This looks odd, but it is a deliberate Phase 1 guardrail: if future work ever tries to store a non-assistive run in this table, it fails loudly and forces a schema-level decision.

---

# 6.3 Input storage boundaries (no unnecessary duplication)

A key Phase 1 risk is accidentally creating multiple “copies” of sensitive content across tables. The contract should be:

* Canonical content is stored in:

  * `intake_raw_payloads.payload` (raw submission)
  * `intake_transcript_events.content` (conversation text)
  * `intake_documents` (file references; file stored in Storage)
* AI run inputs (`ai_runs.input_refs`) should point to canonical sources:

  * transcript event ids / ranges
  * structured version ids
  * raw payload ids
  * document ids + page ranges (if you later add page extraction)

**Hard acceptance criterion:**

* `ai_runs.input_refs` is references-only; it must not contain large verbatim content blobs.

  * Enforceable by convention, not perfectly by SQL; however you can add a guardrail:

    * limit JSON size via application validation, and/or
    * store `input_size_bytes` and enforce a maximum with a CHECK if you compute it.

Phase 1 recommendation:

* Add `input_size_bytes integer null` and set it in the app; use a CHECK upper bound if you want stronger enforcement.

---

# 6.4 Output storage boundaries (immutability + interpretability)

AI outputs should be:

* stored as JSON for structure (`ai_runs.output`)
* immutable after completion (Sub-Phase 4)
* reviewable with clear linking to evidence (via `ai_flags.evidence_refs`)

### Evidence references

Require `ai_flags.evidence_refs` to exist for medium/high severity findings.

**Phase 1 enforceable approximation:**

* If `severity in ('medium','high')` then `evidence_refs is not null`.

This provides a defensibility anchor: flags must cite where they came from (transcript event ids, raw fields, doc ids).

---

# 6.5 “No training on firm data” (schema posture)

You cannot “prove” downstream vendor behavior via DB schema, but you can ensure your data layer does not blur the boundary:

## A) No “training dataset” tables

* Do not create any tables named/structured as datasets.
* Do not add “label” fields that imply supervised training loops.

## B) Explicit, immutable run records

* `ai_runs` and `ai_flags` become immutable artifacts, capturing provenance and supporting audits.
* This matches your architecture emphasis on auditability and human review boundaries.

## C) Avoid silent reuse

* If you later store embeddings, that is outside Phase 1. Do not include embedding tables in Phase 1.

---

# 6.6 Minimal constraint set (Phase 1) — summary

These are the **hard schema constraints** I recommend you include in Phase 1:

1. `ai_runs.is_assistive` exists and `CHECK (is_assistive = true)`
2. `ai_flags.requires_human_review default true not null`
3. `CHECK (reviewed_at is null OR reviewed_by is not null)`
4. `CHECK (derived_by <> 'ai' OR ai_run_id is not null)` on structured versions
5. `CHECK (intake_id is not null OR intake_document_id is not null)` on ai_runs and ai_flags
6. (Optional but strong) `CHECK (severity not in ('medium','high') OR evidence_refs is not null)`

---

## Proceeding

If you proceed, Sub-Phase 7 will produce the **Codex-ready implementation plan**:

* migration order,
* exact SQL blocks to create enums/tables/indexes/RLS policies,
* exact trigger functions for immutability + audit + firm-consistency,
* storage bucket policies for `intake_documents`,
* and a verification checklist (SQL queries) that proves:

  * cross-firm access is blocked,
  * post-submit changes are rejected,
  * audit rows append correctly,
  * AI outputs are review-gated.
