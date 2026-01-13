# Workflow 03 Matter Type Matrix

**Source of Truth**: `docs/carryover/workflow-02-field-enums.md` and `docs/Georgia–Divorce&Custody-v1.0.md`

## Matter Types
- `divorce`
- `custody`
- `legitimation`
- `modification`

## Applicability Matrix

| Section | Fields (Examples) | Applicable Matter Types | Notes |
| :--- | :--- | :--- | :--- |
| **1. Matter Metadata** | `matter_type`, `urgency_level` | **ALL** | Always required |
| **2. Client Identity** | `client_first_name`, `client_county` | **ALL** | Always required |
| **3. Opposing Party** | `opposing_name` | **ALL** | Always required |
| **4. Marriage Details** | `date_of_marriage`, `date_of_separation` | **divorce** | Specific to marriage |
| **5. Grounds** | `grounds_for_divorce` | **divorce** | Specific to divorce |
| **6. Children** | `child_full_name`, `child_dob` | **ALL** (Conditional) | Required if children exist in array |
| **Children Custody** | `custody_type_requested` | **ALL** (Conditional) | Required if children exist |
| **7. Assets** | `asset_type`, `ownership` | **divorce** | Marital estate division |
| **8. Income & Support** | `client_income_monthly` | **ALL** | Support relevant for all |
| **9. Debts** | `debt_type` | **divorce** | Marital debt division |
| **10. DV & Safety** | `dv_present` | **ALL** | Safety is universal |
| **11. Jurisdiction** | `county_of_filing` | **ALL** | Filing location universal |
| **12. Prior Actions** | `prior_divorce_filings` | **ALL** | Context universal |
| **13. Outcomes** | `primary_goal` | **ALL** | Client goals universal |

## Rule Gating Logic

### Global Rules
Apply when `$.matter_type` exists (effectively always).

### Divorce-Specific Rules
Apply when `$.matter_type` equals `divorce`.
- `WF3.REQ.DATE_OF_MARRIAGE`
- `WF3.REQ.PLACE_OF_MARRIAGE`
- `WF3.REQ.DATE_OF_SEPARATION`
- `WF3.REQ.CURRENTLY_COHABITATING`
- `WF3.REQ.GROUNDS_FOR_DIVORCE`
- `WF3.REQ.ASSET_TYPE` (plus array gating)
- `WF3.REQ.DEBT_TYPE` (plus array gating)

### Array Scoping (Repeatable Objects)
Rules for fields inside arrays must only apply if the array is populated.
- **Children**: `applies_when` `$.children[0]` exists.
- **Assets**: `applies_when` `$.assets[0]` exists AND `matter_type == divorce`.
- **Debts**: `applies_when` `$.debts[0]` exists AND `matter_type == divorce`.

### Conditional Sections
- **Children Custody**: `applies_when` `$.children[0]` exists. (Assumes custody details match children presence).

