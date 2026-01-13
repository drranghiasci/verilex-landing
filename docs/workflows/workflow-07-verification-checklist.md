# Workflow 7 Verification Checklist

## Manual Steps
1) Open `/myclient/analytics`.
2) Verify firm-scoped data loads (no cross-firm leakage).
3) Validate Funnel Summary counts against known intakes:
   - draft, submitted, review-ready, accepted, rejected.
4) Validate Operational KPIs:
   - median submit→decision
   - median review-ready→decision
   - backlog buckets.
5) Validate Rules section:
   - top WF3 block rule_ids
   - top warning rule_ids.
6) Validate AI Flags:
   - counts by severity and flag_key.
7) Validate Documents:
   - completion %
   - top document types.
8) Validate County breakdown:
   - top counties match intake payload values.

## Expected Behavior
- Empty states render without errors.
- No AI or rules are executed.
- Metrics reflect persisted data only.

