Prompt 0 — Materialize the canonical Georgia – Divorce & Custody v1.0 schema into repo files (DO THIS FIRST)

Goal
Create a repo-local canonical schema artifact containing every field from Georgia – Divorce & Custody v1.0, plus the non-negotiable design principles, so the intake UI, validation, and payload shape are driven from this local truth—not external documents.

Design Principles (Non-Negotiable)

Structured first, narrative second — Every free-text answer must map to structured fields.

Progressive disclosure — Do not overwhelm clients; fields unlock based on relevance.

Contradiction detection — Intake must surface inconsistencies automatically.

Jurisdiction-aware by default — County selection alters required fields and warnings.

Court-ready output — Intake data must be usable for pleadings without re-entry.

1. MATTER METADATA (SYSTEM + CLIENT)
Field	Type	Required	Notes
matter_type	enum	yes	divorce, custody, legitimation, modification
urgency_level	enum	yes	routine, urgent, emergency
intake_channel	enum	yes	web, referral, phone
language_preference	enum	no	future multilingual support
date_of_intake	date	yes	system generated
2. CLIENT IDENTITY
Field	Type	Required	Notes
client_first_name	string	yes
client_last_name	string	yes
client_dob	date	yes
client_phone	string	yes
client_email	string	yes
client_address	object	yes	structured address
client_county	enum	yes
citizenship_status	enum	no
military_status	boolean	no

AI Checks (deterministic consistency prompts only; Workflow 2 must not execute AI):

Age consistency

Residency duration validation (jurisdiction rules)

3. OPPOSING PARTY (SPOUSE / OTHER PARENT)
Field	Type	Required	Notes
opposing_name	string	yes
opposing_address_known	boolean	yes
opposing_last_known_address	object	no	required if opposing_address_known
service_concerns	boolean	no
opposing_employment_status	enum	no
4. MARRIAGE DETAILS
Field	Type	Required
date_of_marriage	date	yes
place_of_marriage	string	yes
date_of_separation	date	no
currently_cohabitating	boolean	yes
marriage_certificate_available	boolean	no

AI Flags (system-generated downstream; Workflow 2 must not show flags to clients):

Separation date after filing date

Inconsistent cohabitation answers

5. SEPARATION & GROUNDS (GEORGIA)
Field	Type	Required
grounds_for_divorce	enum	yes
fault_allegations	multiselect	no
reconciliation_attempted	boolean	no
6. CHILD OBJECT (REPEATABLE)
Field	Type	Required
child_full_name	string	yes
child_dob	date	yes
child_current_residence	enum	yes
biological_relation	enum	yes
special_needs	boolean	no
6B. CHILDREN & CUSTODY (CUSTODY SETTINGS)
Field	Type	Required
custody_type_requested	enum	yes
parenting_plan_exists	boolean	yes
modification_existing_order	boolean	no
current_parenting_schedule	string	no
school_district	string	no

AI Flags (system-generated downstream; not shown to clients):

Missing parenting plan requirement

School district mismatch

7. ASSET OBJECT (REPEATABLE)
Field	Type	Required
asset_type	enum	yes
ownership	enum	yes
estimated_value	number	yes
title_holder	enum	yes
acquired_pre_marriage	boolean	yes

AI Flags (system-generated downstream):

High-value assets missing documentation

Business interest detected → complexity alert

8. INCOME & SUPPORT
Field	Type	Required	Notes
client_income_monthly	number	yes
opposing_income_known	boolean	yes
support_requested	enum	yes
child_support_estimate	number	no	system-only
alimony_requested	boolean	no

AI Use (downstream):

Infer support complexity level (Workflow 4; do not run in Workflow 2)

9. DEBT OBJECT (REPEATABLE)
Field	Type	Required
debt_type	enum	yes
amount	number	yes
responsible_party	enum	yes
incurred_during_marriage	boolean	yes
10. DOMESTIC VIOLENCE / RISK
Field	Type	Required	Notes
dv_present	boolean	yes
protective_order_exists	boolean	no	required if dv_present
immediate_safety_concerns	boolean	yes
children_exposed	boolean	no
11. JURISDICTION & VENUE
Field	Type	Required	Notes
county_of_filing	enum	yes
residency_duration_months	number	yes
opposing_resides_in_ga	boolean	no
venue_confirmed	boolean	no	system-only

AI Flags (system-generated downstream):

Residency not sufficient

Filing county mismatch

12. PRIOR LEGAL ACTIONS
Field	Type	Required
prior_divorce_filings	boolean	yes
prior_custody_orders	boolean	yes
case_numbers	string	no
existing_attorney	boolean	yes
13. DESIRED OUTCOMES
Field	Type	Required
primary_goal	enum	yes
settlement_preference	enum	yes
litigation_tolerance	enum	yes
non_negotiables	string	no
14. EVIDENCE & DOCUMENTS
Field	Type	Required	Notes
document_type	enum	no
uploaded	boolean	no
missing_required_docs	list	no	system-only
15. AI RISK & FLAGS (SYSTEM GENERATED)
Flag	Trigger
jurisdiction_risk	Residency / venue mismatch
dv_risk	DV indicated + weapons present
custody_complexity	Multiple children + special needs
asset_complexity	Business / high-value assets detected
support_complexity	Support requested + income disparity
missing_required	Required fields missing at submission
