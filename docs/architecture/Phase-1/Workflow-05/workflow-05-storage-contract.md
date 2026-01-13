# Workflow 5 Storage Contract

Version: v0.1  
Status: Design-only (no code)

## 1) Buckets

- Primary bucket name: `VERILEX_DOCUMENTS_BUCKET`
- Access: private only (no public read).
- Upload method: signed URLs (client) or server-authorized upload (firm).

## 2) Canonical Storage Paths

### 2.1 Intake uploads (client)
```
{firm_id}/intakes/{intake_id}/documents/{document_id}-{safe_filename}
```

### 2.2 Case uploads (firm)
```
{firm_id}/cases/{case_id}/documents/{document_id}-{safe_filename}
```

## 3) Metadata Storage

### 3.1 Intake documents
Table: `public.intake_documents`

Required fields:
- `firm_id` (uuid)
- `intake_id` (uuid)
- `storage_object_path` (text)

Optional fields:
- `document_type` (text)
- `classification` (jsonb; advisory only)
- `mime_type` (text)
- `size_bytes` (bigint)
- `uploaded_by_role` (text; `client` | `firm`)
- `created_by` (uuid)
- `created_at` (timestamptz)

Notes:
- Files are stored in Storage only; DB holds pointers.
- Post-submit updates are restricted by WF1 immutability triggers, except for classification-only updates if allowed by policy.

### 3.2 Case documents
Table: `public.case_documents`

Required fields:
- `firm_id` (uuid)
- `case_id` (uuid)
- `storage_path` (text)
- `filename` (text)

Optional fields:
- `mime_type` (text)
- `size_bytes` (bigint)
- `uploaded_by` (uuid)
- `uploaded_by_role` (text; `firm`)
- `display_name` (text)
- `doc_type` (text, default `other`)
- `tags` (text[])

## 4) Signed URL Issuance Rules

### 4.1 Intake signed URLs (anonymous)
- Require valid intake token.
- Intake must be draft (not submitted/locked).
- Path must match intake scope: `{firm_id}/intakes/{intake_id}/documents/`.
- Signed URL TTL: short-lived (5-15 minutes).

### 4.2 Firm signed URLs (authenticated)
- Require firm member auth session.
- Path must match case scope: `{firm_id}/cases/{case_id}/documents/`.
- Signed URL TTL: short-lived (5-15 minutes).

## 5) Validation Policies

- Filename safety: allow `[a-zA-Z0-9._-]` and collapse unsafe chars.
- Content type allowlist (Phase 1 recommended):
  - `application/pdf`
  - `image/jpeg`, `image/png`, `image/heic`
  - `video/mp4`, `video/quicktime`
  - `text/plain`
- File size (Phase 1 recommended): max 25 MB per file.

## 6) Retention

- Phase 1: no automated deletion policy.
- Deletes are blocked by WF1 triggers; any retention changes require explicit migration and audit plan.

End of Deliverable 2.
