# Workflow 6 - Lifecycle Design Spec (MyClient Intake Review)

Version: v0.1
Status: Design-first (implementation follows)

## Objective
Provide firm-side intake review in /myclient with deterministic WF3 gating, WF4 AI insights, WF5 documents, and auditable accept/reject decisions. Intake payloads remain immutable post-submit.

## Authoritative Inputs
- System overview: `docs/architecture/Phase-1/phase1_workflow_system_overview.md`
- WF1 contracts: `docs/carryover/workflow-01-interface-contract.md`, `docs/carryover/workflow-01-schema-snapshot.md`, `docs/carryover/workflow-01-data-foundation-report.md`
- WF3 contract: `docs/workflow 3/workflow-03-interface-contract.md`
- WF4 contract: `docs/architecture/Phase-1/Workflow-04/workflow-04-interface-contract.md`
- WF5 contract: `docs/architecture/Phase-1/Workflow-05/workflow-05-interface-contract.md`
- Schema: `docs/Georgia–Divorce&Custody-v1.0.md` (docx not found; using repo md)
- Product intent: `docs/Master-Product-Map.md` (docx not found; using repo md)
- AI Architecture: `docs/AI-Architecture.md`

## Repository Reality (Step 0 Inventory)
- Intake review route exists: `apps/myclient/pages/myclient/intake/[id]/intake-review.tsx`.
- Current data reads: `public.intakes`, `public.ai_flags`, `public.ai_runs` (run_kind=wf4), `public.intake_documents`.
- WF3 outputs are stored in `public.intake_extractions.extracted_data.rules_engine` (append-only).
- Accept uses `/api/myclient/cases/create` and creates a case; reject currently only shows a notice.
- Intake payload is immutable after submission per WF1 triggers.

## UI Layout and Data Sources
1) Header: intake id, client name, intake status, submitted_at.
2) Structured summary: sections/fields from `GA_DIVORCE_CUSTODY_V1`.
3) WF3 panel (authoritative gating): blocks, warnings, missing required fields.
4) WF4 panel: ai_flags with evidence refs + ack, ai_runs output summary (extractions + inconsistencies).
5) Documents panel: intake documents + classification metadata.
6) Actions: Accept / Reject with audit trail; Accept disabled when WF3 blocks exist.

## State Machine (Phase 1)
- Intake status remains `submitted` (immutable).
- Accept: create case (status `open`) and record an intake decision.
- Reject: record an intake decision with reason. No case is created.
- No reopen flow in Phase 1.

## Reads (WF6)
- `public.intakes`: intake details and raw_payload (read-only).
- `public.intake_extractions`: latest WF3 output (`extracted_data.rules_engine`).
- `public.ai_runs`: latest WF4 run for display (`outputs.run_output`).
- `public.ai_flags`: flags + ack status.
- `public.intake_documents`: document metadata and classification.

## Writes (WF6)
- `public.ai_flags`: update ack fields only.
- `public.cases`: insert on accept (via existing API).
- `public.intake_decisions`: insert accept/reject decision with reason and actor.

## Authorization Rules
- MyClient only (firm-auth, firm-scoped by RLS).
- No service role keys used in client; server routes may use service role with explicit membership checks.

## Acceptance Criteria
- WF3 blocks gate Accept.
- AI flags acknowledgement works (audit fields set).
- WF4 outputs are visible but advisory only.
- Documents list renders with classification if present.
- Accept creates a case and records decision.
- Reject records a decision with reason.
- No mutations of intake payload/transcripts.

## Open Questions
- None; docx sources are not present; using repo md equivalents.
