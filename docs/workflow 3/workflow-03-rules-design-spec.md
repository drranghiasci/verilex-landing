# Workflow 03 — Rules Engine Design Spec (Deterministic Validation & Requirements)

## Objective
Workflow 03 implements a deterministic, explainable rules engine for Phase 1 (Georgia divorce & custody intake) that evaluates **schema completeness**, **conditional requirements**, **basic validity**, and **non-legal consistency checks**. The engine produces auditable outputs (missing required fields, blocks, warnings, normalizations, per-rule evaluations) that downstream workflows may rely on.

**Strict boundary:** Workflow 03 performs *no AI*, makes *no accept/reject decisions*, and produces *no legal conclusions*.

---

## Inputs (documents & upstream contracts)

### Authoritative specifications (build-time)
- **Georgia – Divorce & Custody | v1.0** (canonical schema: fields, requiredness, conditional fields)
- **ga_counties.csv** (canonical county list for validation/canonicalization)
- **Workflow 01 contracts** (immutability + audit + storage constraints)
  - `workflow-01-interface-contract.md`
  - `workflow-01-schema-snapshot.md`
  - `workflow-01-data-foundation-report.md`
- **Workflow 02 contracts** (upstream field collection and canonical enum values)
  - `workflow-02-design-spec.md`
  - `workflow-02-dependencies-and-contracts.md`
  - `workflow-02-field-enums.md`

### Runtime inputs (per evaluation)
Minimum inputs required to evaluate rules deterministically:
- `intake_id` (uuid)
- `firm_id` (uuid)
- `intakes.status` (draft|submitted)
- `intakes.submitted_at` (timestamp; establishes immutability boundary)
- `intakes.raw_payload` (jsonb; canonical as-entered intake data)

Optional (used only for document-related warnings):
- `intake_documents[]` metadata (no file content inspection in WF3)

---

## Outputs
Workflow 03 produces a single evaluation object per run:

- `ruleset_version` (string)
- `evaluated_at` (UTC timestamp)
- `required_fields_missing[]` (JSON paths)
- `blocks[]` (blocking findings)
- `warnings[]` (non-blocking findings)
- `normalizations[]` (canonicalization actions; does **not** mutate raw payload)
- `rule_evaluations[]` (per-rule pass/fail + evidence pointers)

Each finding includes:
- `rule_id`
- `severity` (`block`|`warning`)
- `message`
- `field_paths[]` (schema JSON paths)
- `evidence` (explicit values read / missing indicators)
- `evaluated_at` and `ruleset_version`

---

## Rule categories

### 1) Completeness
- Required fields per GA v1.0 schema (excluding system-only fields from blocking)
- Conditional required fields:
  - `opposing_last_known_address` when `opposing_address_known === true`
  - `date_of_separation` when `currently_cohabitating === false`
  - `protective_order_exists` when `dv_present === true`

Repeatable objects:
- Children, assets, debts, documents are treated as arrays.
- WF3 validates required fields **within each item** when items exist.
- WF3 does **not** infer that an array must exist unless schema explicitly defines that requirement.

### 2) Jurisdictional prerequisites (non-legal-conclusion)
- County values must validate against `ga_counties.csv` and normalize to canonical values.
- Residency duration must be present and numeric (type validation) as required by schema.

### 3) Safety / triage (informational flags only)
- Deterministic warnings/blocks based on schema fields such as `dv_present` and `immediate_safety_concerns`.
- WF3 does not provide emergency guidance or legal advice; it only flags completeness/triage signals for reviewers.

### 4) Consistency
Deterministic contradiction checks that do not require probabilistic reasoning:
- If both dates are present, `date_of_separation` should not be earlier than `date_of_marriage` (warning).

---

## Rule severity model

### Block
A finding is a **block** when:
- A schema-required (or conditional-required) **client-provided** field is missing/null, or
- A value is invalid in a way that breaks downstream reliability (e.g., county not in canonical list, enum not in canonical values, invalid type).

### Warning
A finding is a **warning** when:
- It is system-derived/missing (should be populated elsewhere) and does not block review readiness, or
- It is a non-blocking consistency/triage signal.

### Deterministic gating semantics
- `required_fields_missing.length > 0` MUST imply at least one `block`.
- WF6 may rely on “no blocks” as a prerequisite for “review-ready” gating, but WF3 does not decide accept/reject.

---

## Canonicalization model

### Non-negotiable: do not mutate raw_payload
WF3 must **never** alter `public.intakes.raw_payload`. Canonicalizations are recorded as `normalizations[]` and may be used by downstream workflows.

### County canonicalization (required)
For `client_county` and `county_of_filing`:
- Validate against `ga_counties.csv` by `slug` (preferred) or `name` (case-insensitive).
- Record:
  - `input_value`
  - `normalized_value`
  - `match_strategy` (slug|name)
  - `source` (ga_counties.csv)

Invalid county values produce a **block**.

### Enum validation
- Validate enum values against `workflow-02-field-enums.md` canonical values.
- Do not “correct” invalid enum values; emit a **block**.

### Minimal string normalization (optional)
If implemented, must be purely formatting (trim) and recorded in `normalizations[]`.

---

## Data contracts (storage, paths, versioning)

### Where results are stored
WF3 results are stored as an append-only snapshot row in:
- `public.intake_extractions`

Storage pattern:
- Insert a new extraction row with incremented `version` per `intake_id`
- Store WF3 output under:
  - `extracted_data.rules_engine`

WF3 must not update existing extraction rows.

### Path conventions
WF3 uses stable JSON paths. Default conventions:
- Top-level: `$.<field>`
- Repeatables:
  - children: `$.children[].<field>`
  - assets: `$.assets[].<field>`
  - debts: `$.debts[].<field>`
  - documents: `$.documents[].<field>`
- Children custody fields (single object): `$.children_custody.<field>`

### Versioning
- `ruleset_version` is included in every evaluation and stored snapshot.
- Each `rule_evaluations[]` item references `rule_id` (and may optionally include `rule_version`).

---

## Acceptance criteria
- Deterministic: same input -> same output
- Explainable: every finding references `rule_id` + `field_paths[]` + evidence
- Auditable: results stored as immutable snapshot tied to `intake_id` and `ruleset_version`
- County-safe: county values validated against `ga_counties.csv` with explicit normalization record
- No legal advice and no decisions beyond deterministic completeness/consistency validation

---

## Dependencies / open questions
- **Dependency:** `ga_counties.csv` must exist in the repo at a stable path (configured for WF3; see interface contract).
- **Open question (deferred):** whether WF3 runs pre-submit as well as post-submit. Phase 1 baseline assumes post-submit evaluation is authoritative; WF2 UX gating remains separate.
