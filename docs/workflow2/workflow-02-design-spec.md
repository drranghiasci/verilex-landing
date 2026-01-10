# Workflow 02 Design Spec (Intake UX)

Scope
Chat + form hybrid intake flow driven by GA_DIVORCE_CUSTODY_V1, with deterministic guided prompts and progressive disclosure.

## UX layout
- Left: Steps list (sections 1–14 in schema order).
- Middle: Guided chat panel (deterministic prompts).
- Right: Structured form panel (current section fields).
- Review & Submit: final step blocks submission until required fields are complete.

## Guided chat behavior (deterministic, no AI)
- A fixed prompt per section + prompts for text fields in that section.
- Prompts are rule-based (no LLM).
- Each Q/A is appended to `public.intake_messages` with `channel='chat'`.
- If a prompt maps to a text field, the response is also written to `raw_payload`.
- Form and chat are in sync: text answers seed form values and can be edited.

## Structured form behavior
- Fields are generated from `GA_DIVORCE_CUSTODY_V1`.
- Required fields are always visible; conditional fields are shown by rules:
  - `opposing_last_known_address` if `opposing_address_known === true`
  - `protective_order_exists` if `dv_present === true`
  - `date_of_separation` if `currently_cohabitating === false`
- Repeatables for children/assets/debts are supported.
- System-only fields are never editable and do not block submission.

## Progressive disclosure
- Conditional field visibility (see above).
- Matter type gating:
  - Always show: Matter Metadata, Client Identity, Opposing Party, Children & Custody, DV & Safety,
    Jurisdiction & Venue, Prior Legal Actions, Desired Outcomes, Evidence & Documents.
  - Divorce-only: Marriage Details, Separation & Grounds, Assets & Property, Liabilities & Debts.
  - Income & Support: shown for divorce, custody, modification, and legitimation.
- County warnings (informational only):
  - `client_county` != `county_of_filing` warning.
  - `residency_duration_months < 6` warning.
  - `opposing_resides_in_ga === false` warning.
- DV safety escalation (banner):
  - Immediate safety if `immediate_safety_concerns === true`.
  - Safety resources if `dv_present === true`.
  - Optional system transcript message records banner display.

## Validation + gating
- `validate()` enforces required client-editable fields.
- System-only fields are excluded from gating.
- Submit is disabled until required fields are complete.
- Consistency warnings are non-blocking.

## Session + resume
- Start: `/api/intake/start` returns token.
- Resume:
  - `/intake/{firm_slug}` auto-resumes if token exists in `localStorage`.
  - `/intake/{firm_slug}/resume/{token}` loads explicit token.
- Locked intakes render a confirmation and disable edits.

## Data mapping guarantees
- Every prompt/response is stored in `intake_messages`.
- Every structured field write uses canonical keys from the schema.
- No direct client writes to Postgres; all writes are via `/api/intake/*`.
