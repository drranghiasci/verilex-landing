# Workflow 02 Field Enums (Canonical Values)

Source of truth: `lib/intake/schema/gaDivorceCustodyV1.ts`

Notes
- Store these values exactly.
- UI labels may differ; storage must use these enums.
- County enums are sourced from `docs/ga_counties.csv` (slug preferred; else name).

## Matter metadata
- matter_type: `divorce`, `custody`, `legitimation`, `modification`
- urgency_level: `routine`, `urgent`, `emergency`
- intake_channel: `web`, `referral`, `phone`
- language_preference: `english`, `spanish`, `other`, `unknown`, `prefer_not_to_say`

## Client identity
- citizenship_status:
  - `us_citizen`
  - `lawful_permanent_resident`
  - `nonimmigrant_visa_holder`
  - `undocumented`
  - `dual_citizen`
  - `unknown`
  - `prefer_not_to_say`

## Opposing party
- opposing_employment_status:
  - `employed_full_time`
  - `employed_part_time`
  - `self_employed`
  - `unemployed`
  - `student`
  - `retired`
  - `disabled`
  - `unknown`

## Separation & grounds
- grounds_for_divorce:
  - `no_fault`
  - `adultery`
  - `desertion`
  - `cruel_treatment`
  - `habitual_drug_use`
  - `mental_incapacity`
  - `impotence`
  - `pregnancy_by_another`
  - `incest`
  - `conviction_of_felony`
- fault_allegations (multiselect):
  - `adultery`
  - `desertion`
  - `cruel_treatment`
  - `habitual_drug_use`
  - `mental_incapacity`
  - `impotence`
  - `pregnancy_by_another`
  - `incest`
  - `conviction_of_felony`

## Child object
- child_current_residence: `with_client`, `with_opposing`, `shared`, `third_party`, `other`, `unknown`
- biological_relation: `client`, `opposing`, `both`, `neither`, `unknown`

## Custody settings
- custody_type_requested: `legal_custody`, `physical_custody`, `joint_custody`, `sole_custody`

## Assets
- asset_type:
  - `real_estate`
  - `vehicle`
  - `bank_account`
  - `retirement_account`
  - `investment_account`
  - `business_interest`
  - `personal_property`
  - `other`
- ownership: `sole_client`, `sole_opposing`, `joint`, `third_party`, `unknown`
- title_holder: `client`, `opposing`, `both`, `third_party`, `unknown`

## Income & support
- support_requested: `child_support`, `spousal_support`, `both`

## Debts
- debt_type:
  - `credit_card`
  - `student_loan`
  - `auto_loan`
  - `mortgage`
  - `medical_debt`
  - `tax_debt`
  - `personal_loan`
  - `other`
- responsible_party: `client`, `opposing`, `both`, `third_party`, `unknown`

## Desired outcomes
- primary_goal:
  - `divorce_finalization`
  - `custody_determination`
  - `custody_modification`
  - `support_establishment`
  - `support_modification`
  - `property_division`
  - `protective_relief`
  - `legal_guidance`
  - `other`
- settlement_preference:
  - `strongly_prefer_settlement`
  - `prefer_settlement`
  - `open_to_either`
  - `prefer_litigation`
  - `strongly_prefer_litigation`
  - `unsure`
- litigation_tolerance: `low`, `moderate`, `high`, `unknown`

## Evidence & documents
- document_type:
  - `pay_stub`
  - `tax_return`
  - `bank_statement`
  - `financial_statement`
  - `real_estate_document`
  - `vehicle_title`
  - `retirement_statement`
  - `business_record`
  - `text_message`
  - `email`
  - `photo`
  - `video`
  - `police_report`
  - `court_order`
  - `protective_order`
  - `medical_record`
  - `school_record`
  - `other`
