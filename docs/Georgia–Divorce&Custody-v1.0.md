VERILEX FAMILY LAW INTAKE SCHEMA
(Georgia – Divorce & Custody | v1.0)
 
DESIGN PRINCIPLES (NON-NEGOTIABLE)
1.	Structured first, narrative second
Every free-text answer must map to structured fields.
2.	Progressive disclosure
Do not overwhelm clients—fields unlock based on relevance.
3.	Contradiction detection
Intake must surface inconsistencies automatically.
4.	Jurisdiction-aware by default
County selection alters required fields and warnings.
5.	Court-ready output
Intake data must be usable for pleadings without re-entry.
 
SCHEMA OVERVIEW (TOP LEVEL)
Intake
├── Matter Metadata
├── Client Identity
├── Opposing Party
├── Marriage Details
├── Separation Status
├── Children & Custody
├── Assets & Property
├── Income & Support
├── Liabilities & Debts
├── Domestic Violence / Risk
├── Jurisdiction & Venue
├── Prior Legal Actions
├── Desired Outcomes
├── Evidence & Documents
├── AI Risk & Flags (System Generated)
 
1. MATTER METADATA (SYSTEM + CLIENT)
Field	Type	Required	Notes
matter_type	enum	yes	divorce, custody, legitimation, modification
urgency_level	enum	yes	routine, urgent, emergency
intake_channel	enum	yes	web, referral, phone
language_preference	enum	no	future multilingual support
date_of_intake	date	yes	system generated
 
2. CLIENT IDENTITY
Field	Type	Required
client_first_name	string	yes
client_last_name	string	yes
client_dob	date	yes
client_phone	string	yes
client_email	string	yes
client_address	structured	yes
client_county	enum (GA counties)	yes
citizenship_status	enum	no
military_status	boolean	no
AI Checks
•	Age consistency
•	Residency duration validation (jurisdiction rules)
 
3. OPPOSING PARTY (SPOUSE / OTHER PARENT)
Field	Type	Required
opposing_name	string	yes
opposing_address_known	boolean	yes
opposing_last_known_address	structured	conditional
service_concerns	boolean	no
opposing_employment_status	enum	no
 
4. MARRIAGE DETAILS
Field	Type	Required
date_of_marriage	date	yes
place_of_marriage	string	yes
marriage_certificate_available	boolean	no
date_of_separation	date	conditional
currently_cohabitating	boolean	yes
AI Flags
•	Separation date after filing date
•	Inconsistent cohabitation answers
 
5. SEPARATION & GROUNDS (GEORGIA)
Field	Type	Required
grounds_for_divorce	enum	yes
fault_allegations	multiselect	no
reconciliation_attempted	boolean	no
AI Use
•	Map grounds → pleading language
•	Warn if fault allegations lack evidence
 
6. CHILDREN & CUSTODY (CRITICAL)
Child Object (Repeatable)
Field	Type	Required
child_full_name	string	yes
child_dob	date	yes
child_current_residence	enum	yes
biological_relation	enum	yes
special_needs	boolean	no
Custody Preferences
Field	Type	Required
custody_type_requested	enum	yes
parenting_plan_exists	boolean	yes
current_parenting_schedule	text	no
school_district	string	no
AI Flags
•	UCCJEA jurisdiction risk
•	Missing parenting plan requirement
•	School district mismatch
 
7. ASSETS & PROPERTY (MARITAL ESTATE)
Asset Object (Repeatable)
Field	Type	Required
asset_type	enum	yes
ownership	enum	yes
estimated_value	number	yes
title_holder	enum	yes
acquired_pre_marriage	boolean	yes
Asset Types:
•	Real estate
•	Bank accounts
•	Retirement accounts
•	Vehicles
•	Businesses
•	Personal property
AI Flags
•	High-value assets missing documentation
•	Business interest detected → complexity alert
 
8. INCOME & SUPPORT
Field	Type	Required
client_income_monthly	number	yes
opposing_income_known	boolean	yes
support_requested	enum	yes
child_support_estimate	number	system
alimony_requested	boolean	no
AI Use
•	Georgia Child Support Calculator integration
•	Flag income imbalance cases
 
9. LIABILITIES & DEBTS
Field	Type	Required
debt_type	enum	yes
amount	number	yes
responsible_party	enum	yes
incurred_during_marriage	boolean	yes
 
10. DOMESTIC VIOLENCE & SAFETY (HIGH PRIORITY)
Field	Type	Required
dv_present	boolean	yes
protective_order_exists	boolean	conditional
immediate_safety_concerns	boolean	yes
children_exposed	boolean	no
System Behavior
•	Emergency intake escalation
•	Attorney-only visibility flags
•	Special filing path enabled
 
11. JURISDICTION & VENUE (AUTOMATED)
Field	Type	Required
county_of_filing	enum	yes
residency_duration_months	number	yes
venue_confirmed	boolean	system
AI Logic
•	Validate Georgia residency rules
•	Flag improper venue automatically
 
12. PRIOR LEGAL ACTIONS
Field	Type	Required
prior_divorce_filings	boolean	yes
prior_custody_orders	boolean	yes
case_numbers	string	no
existing_attorney	boolean	yes
 
13. DESIRED OUTCOMES (CLIENT GOALS)
Field	Type	Required
primary_goal	enum	yes
settlement_preference	enum	yes
litigation_tolerance	enum	yes
non_negotiables	text	no
AI Use
•	Strategy alignment warnings
•	Expectation management prompts
 
14. EVIDENCE & DOCUMENTS
Field	Type	Required
document_type	enum	no
uploaded	boolean	no
missing_required_docs	list	system
Auto-classification:
•	IDs
•	Financials
•	Court orders
•	Communications
•	Evidence exhibits
 
15. AI RISK & FLAGS (SYSTEM GENERATED)
Flag	Trigger
jurisdiction_risk	Residency / venue mismatch
custody_complexity	Multi-state children
financial_complexity	Business assets detected
dv_emergency	Safety indicators
inconsistency_detected	Conflicting answers
malpractice_risk	Missing mandatory disclosures

