# Workflow 3 (WF3) — Deterministic Rules Engine

## Purpose
WF3 evaluates a submitted intake against a deterministic rule catalog and records an immutable snapshot in `public.intake_extractions`. It produces no legal advice and does not mutate `public.intakes.raw_payload`.

## Invocation
WF3 runs server-side after an intake is submitted.

Current hook:
- `apps/intake/pages/api/intake/submit.ts` calls `runWorkflow3Rules` after setting `submitted_at`.

Entry point:
- `src/workflow3/runWorkflow3Rules.ts`

## Inputs
- Intake payload: `public.intakes.raw_payload`
- Rule catalog: `docs/workflow 3/workflow-03-rule-catalog.json`
- Counties list: `docs/ga_counties.csv`

## Outputs (authoritative)
WF3 writes a snapshot to `public.intake_extractions.extracted_data.rules_engine`.

Downstream workflows may rely on:
- `blocks[]` and `warnings[]` for deterministic findings.
- `required_fields_missing[]` as the authoritative required/conditional-required list.
- `normalizations[]` for canonicalized county values.
- `ruleset_version` and `evaluated_at` for auditability.

## Idempotency
WF3 is idempotent per intake + ruleset version:
- If a rules evaluation already exists for the same `ruleset_version`, WF3 returns that result and does not insert a new row.
- Otherwise, it inserts a new versioned row in `public.intake_extractions`.

## Storage
- Table: `public.intake_extractions`
- JSONB column: `extracted_data`
- Namespace: `extracted_data.rules_engine`

WF3 inserts new rows only (append-only). Existing rows are never updated or deleted.

## Troubleshooting
- **Missing CSV path**: ensure `docs/ga_counties.csv` exists and is readable by the runtime.
- **Catalog validation failure**: check `docs/workflow 3/workflow-03-rule-catalog.json` for shape or duplicate `rule_id` errors.
- **Intake not submitted**: WF3 will refuse to run if `submitted_at` is null.

## Related Files
- Interface contract: `docs/workflow 3/workflow-03-interface-contract.md`
- Rules catalog: `docs/workflow 3/workflow-03-rule-catalog.json`
- Rules design: `docs/workflow 3/workflow-03-rules-design-spec.md`
