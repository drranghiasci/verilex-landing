# WF3 Paths and Assumptions (Pinned)

Purpose
Pin the canonical file paths and storage assumptions WF3 must use.

## Canonical file paths
- WF3 rules design spec: `docs/workflow 3/workflow-03-rules-design-spec.md`
- WF3 rule catalog: `docs/workflow 3/workflow-03-rule-catalog.json`
- WF3 interface contract: `docs/workflow 3/workflow-03-interface-contract.md`

- WF1 interface contract: `docs/carryover/workflow-01-interface-contract.md`
- WF1 schema snapshot: `docs/carryover/workflow-01-schema-snapshot.md`
- WF1 data foundation report: `docs/carryover/workflow-01-data-foundation-report.md`
- WF1 DB artifacts: `docs/carryover/workflow1_db_artifacts.zip`

- WF2 dependencies/contracts: `docs/carryover/workflow-02-dependencies-and-contracts.md`
- WF2 design spec: `docs/carryover/workflow-02-design-spec.md`
- WF2 field enums: `docs/carryover/workflow-02-field-enums.md`

- Georgia counties CSV: `docs/ga_counties.csv`
- Georgia Divorce & Custody v1.0 source (markdown): `docs/Georgia–Divorce&Custody-v1.0.md`

## WF1 storage contracts (authoritative)
Source: `docs/carryover/workflow-01-interface-contract.md` and `docs/carryover/workflow-01-schema-snapshot.md`

### Canonical intake storage
- Table: `public.intakes`
- Payload column: `raw_payload` (jsonb)
- Lock boundary: `submitted_at` transitions from NULL -> non-NULL
- Status constraint: `status in ('draft','submitted')`

### Transcript storage
- Table: `public.intake_messages`
- Ordering: unique `(intake_id, seq)`
- Append-only after submission (no UPDATE/DELETE)

### Extraction / derived snapshots
- Table: `public.intake_extractions`
- Columns: `extracted_data` (jsonb), `version` (int)
- Append-only; new versions only

### Documents
- Table: `public.intake_documents`
- Column: `storage_object_path` (text)
- Metadata only; files live in Storage
- Append-only; no UPDATE/DELETE

### AI metadata
- `public.ai_runs` (insert-only)
- `public.ai_flags` (insert; ACK-only updates allowed post-submit)

## WF2 submission + enums
Source: `docs/carryover/workflow-02-dependencies-and-contracts.md`, `docs/carryover/workflow-02-design-spec.md`,
`docs/carryover/workflow-02-field-enums.md`

- Submission is defined by:
  - `public.intakes.submitted_at` set (non-NULL)
  - `public.intakes.status` set to `submitted`
- Post-submit: all intake tables immutable (DB triggers enforce)
- Enum membership must match the canonical lists in `docs/carryover/workflow-02-field-enums.md`
- County fields use canonical values sourced from `docs/ga_counties.csv`

## WF3 interface contract (input/output)
Source: `docs/workflow 3/workflow-03-interface-contract.md`

### Inputs (authoritative)
- `public.intakes` fields:
  - `id`, `firm_id`, `status`, `submitted_at`, `raw_payload`
  - optional: `matter_type`, `urgency_level`, `intake_channel`, `language_preference`
- Optional reads:
  - `public.intake_documents` (metadata only)
- Repo data:
  - `docs/ga_counties.csv` for county normalization/validation

### Output shape (RulesEngineResult)
- Keys include: `ruleset_version`, `evaluated_at`, `required_fields_missing`, `blocks`, `warnings`,
  `normalizations`, `rule_evaluations`
- Each block/warning includes `rule_id`, `field_paths`, `message`, `ruleset_version`, `evaluated_at`

### Storage write (append-only)
- `public.intake_extractions`
  - `intake_id`
  - `version = max(version) + 1`
  - `extracted_data.rules_engine = <RulesEngineResult>`

## Pinned assumptions
- Canonical counties path: `docs/ga_counties.csv`
- Canonical intake payload: `public.intakes.raw_payload`
- Canonical extraction table: `public.intake_extractions.extracted_data`
- Canonical document pointers: `public.intake_documents.storage_object_path`
- Lock boundary: `public.intakes.submitted_at` non-NULL
