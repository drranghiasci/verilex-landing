# Workflow 6 Verification Checklist

## Manual Steps
1) Open MyClient intake review: `/myclient/intake/{intake_id}/intake-review`.
2) Confirm structured summary renders from schema.
3) WF3 gating:
   - If blocks exist, show “Not Review-Ready” banner and disable Accept.
   - Missing required fields list is visible.
4) WF4 outputs:
   - Latest ai_run for run_kind='wf4' renders summary and contradictions.
   - AI flags render and can be acknowledged.
5) Documents:
   - Intake documents list renders with metadata.
   - Classification metadata appears if present.
6) Accept:
   - When no blocks, Accept creates a case and inserts intake decision.
   - Intake remains submitted/immutable.
7) Reject:
   - Requires a reason, inserts intake decision, no case created.

## Expected Behavior
- No AI runs or flags should not break the page (shows empty state).
- Missing WF3 outputs should show “Rules output unavailable.”
- Ack updates only ai_flags ack fields.
- Reject is auditable (intake_decisions row).

## Audit Checks
- `public.intake_decisions` contains accept/reject record with actor + timestamp.
- `public.ai_flags` ack fields are set on ack.
- `public.intakes` is unchanged post-submit.

