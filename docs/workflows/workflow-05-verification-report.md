# Workflow 5 Verification Report (Documents)

Status: PASS

## Section 1 — Location & Ownership
- MyClient owns document management UI and routes: `apps/myclient/pages/myclient/documents.tsx`, `apps/myclient/pages/myclient/cases/[id].tsx`, `apps/myclient/pages/api/myclient/documents/*`.
- Intake uses upload-only endpoints (signed URL + confirm): `apps/intake/pages/api/intake/documents/create-upload.ts`, `apps/intake/pages/api/intake/documents/confirm.ts`.
- No intake document list or delete/edit actions: `apps/intake/components/intake/steps/EvidenceDocumentsStep.tsx`.

## Section 2 — Storage & Security
- Private storage bucket (env-driven): `VERILEX_DOCUMENTS_BUCKET` in server routes; no public reads.
- Canonical paths are firm-scoped and intake/case-scoped:
  - Intake: `{firm_id}/intakes/{intake_id}/documents/{document_id}-{filename}` (`apps/intake/pages/api/intake/documents/create-upload.ts`).
  - Case: `{firm_id}/cases/{case_id}/documents/{document_id}-{filename}` (`apps/myclient/pages/api/myclient/documents/create-upload.ts`, `apps/myclient/pages/api/myclient/documents/upload.ts`).
- Anonymous uploads use signed URLs only: `apps/intake/pages/api/intake/documents/create-upload.ts`, `lib/server/storage.ts`.
- Firm uploads require authenticated MyClient session: `apps/myclient/pages/api/myclient/documents/create-upload.ts`, `apps/myclient/pages/api/myclient/documents/confirm.ts`, `apps/myclient/pages/api/myclient/documents/upload.ts`.

## Section 3 — Database & Audit (WF1)
- Intake document metadata persisted in `public.intake_documents` with required fields + metadata:
  - `storage_object_path`, `document_type`, `mime_type`, `size_bytes`, `uploaded_by_role`, `created_at` via `apps/intake/pages/api/intake/documents/confirm.ts`.
- Case document metadata persisted in `public.case_documents` with required fields + metadata:
  - `storage_path`, `filename`, `mime_type`, `size_bytes`, `uploaded_by`, `uploaded_by_role`, `created_at` via `apps/myclient/pages/api/myclient/documents/confirm.ts` and `apps/myclient/pages/api/myclient/documents/upload.ts`.
- Soft delete only (no destructive deletes): `apps/myclient/pages/api/myclient/documents/delete.ts`.
- Intake tokens cannot read documents after submission: `apps/intake/pages/api/intake/load.ts` (documents suppressed when `submitted_at` is set).

## Section 4 — Validation & Safety
- MIME allowlist + file size limit enforced for intake + firm uploads: `lib/documents/uploadPolicy.ts`, `apps/intake/pages/api/intake/documents/create-upload.ts`, `apps/intake/pages/api/intake/documents/confirm.ts`, `apps/myclient/pages/api/myclient/documents/create-upload.ts`, `apps/myclient/pages/api/myclient/documents/confirm.ts`, `apps/myclient/pages/api/myclient/documents/upload.ts`.
- Filenames sanitized server-side before storage path creation: `apps/intake/pages/api/intake/documents/create-upload.ts`, `apps/myclient/pages/api/myclient/documents/create-upload.ts`, `apps/myclient/pages/api/myclient/documents/upload.ts`.
- Rejected uploads do not write DB rows (DB insert only on confirm): `apps/intake/pages/api/intake/documents/confirm.ts`, `apps/myclient/pages/api/myclient/documents/confirm.ts`.

## Section 5 — WF4 Classification Hooks (Optional)
- WF5 does not call AI directly; classification is stored as advisory metadata:
  - Intake doc classification accepted in `public.intake_documents.classification` (`apps/intake/pages/api/intake/documents/confirm.ts`).
  - WF4 updates classification under `classification.wf4` (server-side only): `src/workflows/wf4/runWf4.ts`.

## Section 6 — Integration Points
- Intake uses create-upload → upload → confirm flow with intake token; no firm auth assumptions: `apps/intake/pages/api/intake/documents/create-upload.ts`, `apps/intake/pages/api/intake/documents/confirm.ts`.
- MyClient lists and manages case documents via server routes and UI pages: `apps/myclient/pages/myclient/documents.tsx`, `apps/myclient/pages/api/myclient/documents/list.ts`.

## Conclusion
Workflow 5 verified as implemented correctly and in-scope.
