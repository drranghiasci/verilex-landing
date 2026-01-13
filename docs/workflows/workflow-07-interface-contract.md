# Workflow 7 Interface Contract (Analytics)

Version: v0.1
Status: Implementation-facing

## Reads
- `public.intakes`: `id`, `status`, `submitted_at`, `created_at`, `raw_payload`
- `public.intake_decisions`: `intake_id`, `decision`, `decided_at`
- `public.intake_extractions`: `intake_id`, `version`, `extracted_data`, `created_at`
- `public.ai_flags`: `intake_id`, `flag_key`, `severity`
- `public.intake_documents`: `intake_id`, `document_type`, `classification`

## Writes
- None. WF7 is read-only.

## Invariants
- Firm-scoped queries only (RLS enforced).
- No mutations of intake payloads or AI outputs.
- No AI calls or predictions.

## Output Metrics
- Funnel counts (draft, submitted, review-ready, accepted, rejected)
- Operational KPIs (median submit→decision, median review-ready→decision, backlog)
- WF3 blocks/warnings counts by rule_id
- AI flags counts by severity + flag_key
- Document completion % and top doc types
- County breakdown by intake volume

