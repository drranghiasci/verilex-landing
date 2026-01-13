# Workflow 6 Interface Contract (MyClient Intake Review)

Version: v0.1
Status: Implementation-facing

## Reads
- `public.intakes` (read-only):
  - `id`, `firm_id`, `status`, `submitted_at`, `raw_payload`, metadata fields
- `public.intake_extractions` (WF3 outputs):
  - latest `extracted_data.rules_engine`
- `public.ai_runs` (WF4 outputs):
  - latest run where `run_kind = 'wf4'`, `outputs.run_output`
- `public.ai_flags`:
  - `flag_key`, `severity`, `summary`, `details`, `is_acknowledged`, ack fields
- `public.intake_documents`:
  - `storage_object_path`, `document_type`, `classification`, `mime_type`, `size_bytes`, `uploaded_by_role`, `created_at`

## Writes
- `public.ai_flags`:
  - allowed update fields only: `is_acknowledged`, `acknowledged_by`, `acknowledged_at`
- `public.cases`:
  - insert on accept (via `/api/myclient/cases/create`)
- `public.intake_decisions`:
  - insert `decision` = `accepted` or `rejected`, `reason` optional, `decided_by`, `decided_at`, `case_id` optional

## Invariants
- Intake payloads (`public.intakes.raw_payload`) are immutable post-submit.
- WF3 blocks are authoritative for review-ready gating.
- WF4 outputs are advisory only; do not override WF3.
- WF6 runs only in /myclient.

## Error Handling
- Missing WF3 or WF4 outputs should render non-blocking “unavailable” messages.
- Accept action must be disabled when WF3 blocks exist.

