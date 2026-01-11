# Workflow 03 — Interface Contract (Deterministic Rules Engine)

## Purpose
Defines the strict inputs and outputs for the Phase 1 deterministic rules engine so downstream workflows (WF4, WF6, WF7) can rely on stable, auditable signals.

WF3 is deterministic, explainable, versioned, and produces no legal conclusions.

---

## Inputs

### Required runtime inputs
WF3 evaluates a single intake at a time.

**Database reads (authoritative):**
- `public.intakes`
  - `id` (uuid) as `intake_id`
  - `firm_id` (uuid)
  - `status` (text: `draft` | `submitted`)
  - `submitted_at` (timestamptz; lock boundary)
  - `raw_payload` (jsonb; canonical as-entered intake)
  - optional: `matter_type`, `urgency_level`, `intake_channel`, `language_preference` (may exist as indexed columns but not required for evaluation)

**Optional reads:**
- `public.intake_documents` (metadata only; for warnings; no content inspection)

### Required repository data
- `ga_counties.csv` — canonical county list used for:
  - validation of `client_county`
  - validation of `county_of_filing`
  - normalization to canonical values

**Expected path (default):**
- `docs/ga_counties.csv`

If the repo uses a different path, WF3 must centralize this in one constant/config and document it.

### Canonical enum inputs
- `workflow-02-field-enums.md` provides canonical enum values (WF3 validates membership; does not correct invalid enums).

---

## Outputs

### Output object: `RulesEngineResult`
WF3 returns and stores the following JSON object (shape is guaranteed):

```json
{
  "ruleset_version": "wf3.ga_v1.0.ruleset.1.0.0",
  "evaluated_at": "2026-01-11T00:00:00.000Z",
  "required_fields_missing": [
    "$.client_first_name",
    "$.client_last_name"
  ],
  "blocks": [
    {
      "rule_id": "WF3.REQ.CLIENT_FIRST_NAME",
      "severity": "block",
      "message": "Missing required field: client_first_name.",
      "field_paths": ["$.client_first_name"],
      "evidence": {
        "paths": {"$.client_first_name": null}
      },
      "evaluated_at": "2026-01-11T00:00:00.000Z",
      "ruleset_version": "wf3.ga_v1.0.ruleset.1.0.0"
    }
  ],
  "warnings": [],
  "normalizations": [
    {
      "kind": "county_normalization",
      "field_path": "$.client_county",
      "input_value": "Fulton",
      "normalized_value": "fulton",
      "match_strategy": "slug",
      "source": "ga_counties.csv"
    }
  ],
  "rule_evaluations": [
    {
      "rule_id": "WF3.REQ.CLIENT_FIRST_NAME",
      "severity": "block",
      "passed": false,
      "field_paths": ["$.client_first_name"],
      "evidence": {"paths": {"$.client_first_name": null}},
      "message": "Missing required field: client_first_name.",
      "evaluated_at": "2026-01-11T00:00:00.000Z",
      "ruleset_version": "wf3.ga_v1.0.ruleset.1.0.0"
    }
  ]
}
```

**Guaranteed invariants:**
- `required_fields_missing` is authoritative for required/conditional-required missing fields.
- Every `block`/`warning` has a `rule_id` and `field_paths[]`.
- Every evaluation includes `ruleset_version` and `evaluated_at`.

---

## Storage expectations (WF1-compatible, append-only)

WF3 writes a snapshot to:
- `public.intake_extractions`

**Write pattern:**
- Insert a new row for each WF3 run:
  - `intake_id = <id>`
  - `version = (max(version) for intake_id) + 1`
  - `extracted_data.rules_engine = <RulesEngineResult>`
  - `confidence = null` (or omitted, per WF1 conventions)

WF3 must not update existing extraction rows and must not mutate `intakes.raw_payload`.

---

## Downstream workflow reliance

### WF4 (AI extraction & flags) may rely on:
- `required_fields_missing`
- `blocks`/`warnings` structured findings
- `normalizations` (especially normalized county)

WF4 must not override WF3 deterministic results.

### WF6 (case lifecycle gating) may rely on:
- “No blocks” as a prerequisite for “review-ready” gating (human decision still required).

### WF7 (analytics) may rely on:
- `rule_evaluations` for aggregate reporting by rule_id/ruleset_version
- normalization stats (e.g., county normalization match strategies)
