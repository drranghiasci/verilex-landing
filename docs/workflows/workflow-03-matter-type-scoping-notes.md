# Workflow 03 Matter Type Scoping Notes

## Repo Reality & Rule Engine Discovery

**Rule Catalog**: `docs/workflow 3/workflow-03-rule-catalog.json`
**Evaluator Entrypoint**: `src/workflow3/runWorkflow3Rules.ts` -> `src/workflow3/evaluator/evaluateRules.ts`
**Intake JSON Schema Path for Matter Type**: `$.matter_type` (Enum: `divorce`, `custody`, `legitimation`, `modification`)
**Repeatable Objects**: 
- `$.assets`
- `$.debts`
- `$.children`

### Current Behavior (The Bug)
Currently, most "Required field" rules in the catalog have an `applies_when` condition that simply checks if the root (`$`) exists:
```json
"applies_when": {
  "all": [
    {
      "path": "$",
      "exists": true
    }
  ]
}
```
This causes divorce-specific fields (Marriage Details, Grounds) to be required for ALL matter types (Custody, etc).

Additionally, repeatable object rules (e.g., `WF3.REQ.ASSET_TYPE`) target paths like `$.assets[].asset_type`.
The evaluator's `findMissingPaths` logic flags these as missing if the array is empty because `getFieldValues` returns an empty array, which is treated as "values not found" or "missing".
If `$.assets` is `[]`, `$.assets[].asset_type` yields `[]`, which triggers the missing field block.

## Plan
1. **Matter Type Scoping**: Updating `applies_when` to filter by `$.matter_type`.
2. **Array Gating**: Updating `applies_when` to check if the array has items (e.g., `$.assets[0]` exists) before requiring per-item fields.
