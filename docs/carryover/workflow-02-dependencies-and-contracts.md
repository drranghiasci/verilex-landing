# Workflow 02 Dependencies and Contracts

Purpose
Capture the WF2 contracts that WF3 depends on (firm resolution, anonymous session model, and submit semantics).

## Firm resolution
- Endpoint: `POST /api/intake/resolve-firm`
- Input: `{ firm_slug }`
- Output (minimal, safe):
  - `firm_id` (server use only)
  - `firm_name`
  - `branding` (optional): `{ logo_url?, accent_color? }`
- Firm slug format matches DB constraint; no other firm fields are exposed.

## Anonymous session model (stateless token)
- Token is a signed, stateless session for a single intake.
- Payload: `{ firm_id, intake_id, exp, v }`
- Signing secret: `INTAKE_TOKEN_SECRET` (server-only).
- Token is required for `load`, `save`, `submit`, and document upload endpoints.
- Client storage: `localStorage` key `intake:token:{firm_slug}` for auto-resume.
- Resume route: `/intake/{firm_slug}/resume/{token}`

## Submit semantics (immutability)
- Canonical record is `public.intakes.raw_payload` (jsonb).
- `public.intakes.submitted_at` transitions `null -> timestamp` on submit.
- When submitted:
  - `status` is set to `submitted`.
  - further `save` attempts return `409 { locked: true }`.
  - no UPDATE/DELETE is allowed post-submit (DB triggers enforce immutability).
- Deletes are denied everywhere.

## Persistence contracts (WF1)
- Transcript: `public.intake_messages` is append-only with `(intake_id, seq)` uniqueness.
- Documents: `public.intake_documents` stores metadata only; files are in Storage.

## Load-time normalization
- `GET/POST /api/intake/load` normalizes legacy drafts to GA_DIVORCE_CUSTODY_V1.
- Unknown legacy keys are preserved under `_legacy` (no silent data loss).

## Human input needed (WF3)
- None for WF2 intake gating; rules and copy are implemented in `lib/intake/gating.ts` and `lib/intake/copy.ts`.
