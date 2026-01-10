# Workflow 2 QA Checklist

Purpose: verify the Workflow 2 intake path meets contract requirements before release.

## Pre-flight

- Env vars set: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `INTAKE_TOKEN_SECRET`, `VERILEX_DOCUMENTS_BUCKET`.
- Intake schema source: `docs/Georgia–Divorce&Custody-v1.0.md` and `lib/intake/schema/gaDivorceCustodyV1.ts`.
- Counties source: `docs/ga_counties.csv`.

## Firm Resolution

- `/intake/{firm_slug}` renders without exposing internal IDs.
- `POST /api/intake/resolve-firm` returns `{ firm_id, firm_name }` for valid slug.
- Invalid slug returns 404 with safe error message.

## Draft Lifecycle

- Start: `POST /api/intake/start` returns `{ token, resumePath }`.
- Save: `POST /api/intake/save` persists `raw_payload` patches.
- Resume: `/intake/{firm_slug}/resume/{token}` loads draft without auth.
- Verify `raw_payload` is canonical (no invented keys).

## Transcript (Append-only)

- `public.intake_messages` only inserts; no updates/deletes.
- `seq` ordering preserved; new messages appended at `max(seq)+1`.
- Conflicting `seq` retries handled without data loss.

## Counties

- County dropdowns populated from `docs/ga_counties.csv` (no hardcoding).
- Stored values follow slug-preferred, name-fallback rule.

## Documents

- `POST /api/intake/documents/create-upload` returns signed URL and storage path.
- Upload succeeds directly to Storage (no server file proxy).
- `POST /api/intake/documents/confirm` inserts into `public.intake_documents`.
- Evidence `uploaded` flag in `raw_payload` flips true after confirm.
- No file URLs stored inside `raw_payload`.

## Submission

- Explicit confirmation checkbox required before submit.
- `POST /api/intake/submit` sets `submitted_at` and `status='submitted'`.
- Post-submit `save` returns locked and does not modify data.
- UI shows locked confirmation; inputs disabled.

## Boundary Conditions

- No AI execution in Workflow 2.
- No accept/reject flows.
- No case creation (Pattern B: `public.cases` untouched).

## Error Safety

- API errors include request ID; no stack traces or internal IDs in UI.
- Client error banner shows generic message + reference ID.
