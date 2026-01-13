# Workflow 7 Analytics Design Spec

Version: v0.1
Status: Design-first

## Objective
Provide firm-scoped analytics in /myclient for intake funnel, operational KPIs, risk/complexity signals, documents, and county distribution. WF7 is read-only and must not modify WF1–WF6 data.

## Authoritative Inputs
- System overview: `docs/architecture/Phase-1/phase1_workflow_system_overview.md`
- Product intent: `docs/Master-Product-Map.md` (docx not found; using md)
- WF1 contracts: `docs/carryover/workflow-01-interface-contract.md`, `docs/carryover/workflow-01-schema-snapshot.md`
- WF3 contract: `docs/workflow 3/workflow-03-interface-contract.md`
- WF4 contract: `docs/architecture/Phase-1/Workflow-04/workflow-04-interface-contract.md`
- WF5 contract: `docs/architecture/Phase-1/Workflow-05/workflow-05-interface-contract.md`
- WF6 contract: `docs/workflows/workflow-06-interface-contract.md`
- County list: `docs/ga_counties.csv`

## Repository Reality (Step 0 Inventory)
- MyClient pages live under `apps/myclient/pages/myclient/*`.
- Intake queue uses `public.intakes` with `status = 'submitted'` and reads WF4 run status from `public.ai_runs`.
- Accept/Reject decisions are stored in `public.intake_decisions` (WF6).
- WF3 outputs are stored in `public.intake_extractions.extracted_data.rules_engine` (latest version).
- WF4 outputs are stored in `public.ai_runs.outputs.run_output` and flags in `public.ai_flags`.
- Intake documents live in `public.intake_documents` (WF5).
- Cases live in `public.cases` with `status` values `open|paused|closed` (Phase 1).

## KPI Definitions

### Funnel Counts
- Draft Started: count of `public.intakes` where `status = 'draft'`.
- Submitted: count of `public.intakes` where `status = 'submitted'`.
- Review-Ready: submitted intakes with WF3 output present and `blocks.length === 0`.
- Accepted: count of `public.intake_decisions` where `decision = 'accepted'`.
- Rejected: count of `public.intake_decisions` where `decision = 'rejected'`.

### Operational KPIs
- Median submit → decision: median of `(decided_at - submitted_at)` for accepted/rejected.
- Median review-ready → decision: median of `(decided_at - wf3_created_at)` for review-ready intakes.
- Backlog:
  - submitted + blocked
  - submitted + review-ready (no decision)
  - accepted
  - rejected

### Quality & Complexity Signals
- WF3 blocks: counts by `rule_id` from `rules_engine.blocks`.
- WF3 warnings: counts by `rule_id` from `rules_engine.warnings`.
- AI flags: counts by `severity` and `flag_key` from `public.ai_flags`.

### Document Completion
- % intakes with >= 1 document: unique intake_ids in `public.intake_documents` / total submitted intakes.
- Document types: from `document_type` or `classification.wf4.document_type` if present.

### Geography (GA)
- Intake volume by county: use `raw_payload.county_of_filing` else `raw_payload.client_county`.
- County values are assumed canonical (WF3 normalizations). No enrichment beyond display.

## Query Plan (Firm-Scoped)
- `public.intakes`: select `id`, `status`, `submitted_at`, `created_at`, `raw_payload`.
- `public.intake_decisions`: select `intake_id`, `decision`, `decided_at`.
- `public.intake_extractions`: select `intake_id`, `version`, `extracted_data`, `created_at`.
- `public.ai_flags`: select `intake_id`, `flag_key`, `severity`.
- `public.intake_documents`: select `intake_id`, `document_type`, `classification`.
- Optional: `public.ai_runs` for WF4 run status if displayed.

## Performance Notes
- Aggregate in memory with bounded intake set (e.g., last 180 days) to avoid heavy joins.
- Use indexed columns: `firm_id`, `intake_id`, `created_at`.

## Acceptance Criteria
- Analytics page loads without errors for empty data.
- Metrics match persisted data for sample intakes (submitted/blocked, accepted, rejected).
- Firm isolation enforced by RLS.
- No writes or mutations from WF7.
