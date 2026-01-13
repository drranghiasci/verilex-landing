# VeriLex Phase 1 — Workflow 5: Documents (Design Spec)

Version: v0.1  
Status: Design-only (no code)  
Scope: Phase 1 document uploads, storage, metadata, and classification hooks

## Authoritative Sources by Section

- Objective + scope boundaries: `docs/architecture/Phase-1/phase1_workflow_system_overview.md`
- Product value + must-have features: `docs/Master-Product-Map.md`
- Intake document fields + doc-type enum basis: `docs/Georgia–Divorce&Custody-v1.0.md` and `docs/carryover/workflow-02-field-enums.md`
- AI safety + classification posture: `docs/AI-Architecture.md` and `docs/architecture/Phase-1/Workflow-04/workflow-04-interface-contract.md`
- DB contracts + immutability: `docs/carryover/workflow-01-schema-snapshot.md`, `docs/carryover/workflow-01-interface-contract.md`, `docs/carryover/workflow-01-data-foundation-report.md`
- Anonymous upload model + intake endpoints: `docs/carryover/workflow-02-dependencies-and-contracts.md` and `docs/carryover/workflow-02-design-spec.md`

If a referenced docx is not present, the markdown version in this repo is treated as the authoritative source for Phase 1.

---

## 1) Objective

Implement the Phase 1 documents subsystem to support:

- Secure client uploads in `/intake` (anonymous, token-gated).
- Secure firm uploads in `/myclient` (authenticated, firm-scoped).
- Private storage with canonical path conventions.
- Durable metadata records consistent with WF1.
- Optional, minimal classification hooks aligned to WF4 and AI Architecture.

Documents are **assistive** for review and never modify intake facts.

---

## 2) Inputs (Contracts and Upstream Dependencies)

**WF1 (Data Foundation):**
- `public.intake_documents` for intake uploads (metadata only).
- `public.case_documents` for firm uploads (case-level docs).
- Immutability triggers on intake-related tables (append-only).

**WF2 (Intake):**
- Anonymous session token for upload endpoints.
- Evidence & Documents step in the intake flow.
- Document endpoints: `/api/intake/documents/create-upload` and `/api/intake/documents/confirm`.

**WF4 (AI Classification):**
- WF4 outputs are advisory, evidence-backed, and stored in `ai_runs` and `ai_flags`.
- Document classification is optional and must not overwrite facts.

**Schema + Enums:**
- Evidence section fields: `document_type`, `uploaded`, `missing_required_docs`.
- Canonical `document_type` enum list from `docs/carryover/workflow-02-field-enums.md`.

---

## 3) Outputs (Phase 1 Artifacts)

### 3.1 Intake Documents
- `public.intake_documents` rows with:
  - `firm_id`, `intake_id`, `storage_object_path`
  - optional `document_type`
  - `classification` JSONB (advisory, optional)
  - timestamps

### 3.2 Case Documents (Firm Uploads)
- `public.case_documents` rows with:
  - `firm_id`, `case_id`, `storage_path`
  - `filename`, optional `mime_type`, `size_bytes`
  - `doc_type`, `tags`, `display_name`

### 3.3 AI Classification Hooks (Optional)
- `intake_documents.classification.wf4` populated by WF4 (not WF5).
- `ai_runs` stores WF4 artifacts and evidence pointers.

---

## 4) Buckets and Path Conventions

### 4.1 Buckets
- Single private bucket for Phase 1 documents.
- Bucket name is configured by `VERILEX_DOCUMENTS_BUCKET`.
- No public access; signed URLs only for uploads.

### 4.2 Path Templates

**Client intake uploads (canonical):**
```
{firm_id}/intakes/{intake_id}/documents/{document_id}-{safe_filename}
```

**Firm uploads (case docs):**
```
{firm_id}/cases/{case_id}/documents/{document_id}-{safe_filename}
```

Paths are firm-scoped, deterministic, and stored as metadata (no file bytes in DB).

---

## 5) Authorization Model

### 5.1 Anonymous Client Uploads (/intake)
- Token-gated via `INTAKE_TOKEN_SECRET`.
- Signed upload URLs only (no direct storage credentials).
- Server must validate:
  - token → `firm_id`, `intake_id`
  - intake is not submitted/locked
  - storage path prefix matches `{firm_id}/intakes/{intake_id}/documents/`

### 5.2 Firm Auth Uploads (/myclient)
- Auth via Supabase session (firm member only).
- Upload path must include firm_id and case_id.
- Writes to `case_documents` only.

---

## 6) Upload Flow

### 6.1 Client Intake Upload (Anonymous)
1) **Create upload**  
`POST /api/intake/documents/create-upload`
  - Inputs: `token`, `intakeId`, `filename`, `content_type`
  - Validates token + intake lock + filename safety.
  - Generates storage path and signed URL.

2) **Direct upload to Storage**  
Client uploads via signed URL (PUT).

3) **Confirm upload**  
`POST /api/intake/documents/confirm`
  - Inputs: `token`, `intakeId`, `storage_object_path`, `document_type?`
  - Validates prefix and intake lock.
  - Inserts `intake_documents` row.
  - Sets `evidence.uploaded=true` in `intakes.raw_payload` (pre-submit only).

### 6.2 Firm Upload (Authenticated)
1) **Create upload** (server-authorized)  
Signed URL or server-side upload.  
2) **Confirm metadata**  
Insert into `case_documents`.

---

## 7) Validation Policies

**Filename safety (required):**
- Strip directory traversal.
- Allow `[a-zA-Z0-9._-]` only.
- Collapse repeated separators.

**Mime allowlist (Phase 1 recommendation):**
- `application/pdf`
- `image/jpeg`, `image/png`, `image/heic`
- `video/mp4`, `video/quicktime`
- `text/plain`

**Size limits (Phase 1 recommendation):**
- Per-file max: 25 MB (configurable).
- Reject oversized files before creating signed URL.

**Storage TTL for signed URLs:**
- Short-lived (5–15 minutes).

If final policies differ, they must be documented in `workflow-05-storage-contract.md`.

---

## 8) Classification Hooks (WF4-Aligned)

WF5 does not run AI. It only defines safe, auditable storage for classification results.

- WF4 may write to:
  - `intake_documents.classification.wf4` with evidence pointers
  - `ai_runs` (run log) and `ai_flags` (risk flags)
- Classification is advisory only and must not overwrite intake facts or case data.

Document categories (from GA v1.0 design):
- IDs
- Financials
- Court orders
- Communications
- Evidence exhibits

Mapping to `document_type` enum uses `docs/carryover/workflow-02-field-enums.md`.

---

## 9) Acceptance Criteria

- Client uploads use signed URLs and are token-gated.
- Firm uploads are authenticated and firm-scoped.
- Paths are canonical and include firm scope.
- Metadata stored in `intake_documents` and `case_documents`.
- No public access to document files.
- Classification hooks are safe and auditable (WF4-only).
- Errors do not corrupt intakes or case records.

---

## 10) Dependencies / Open Questions

1) **Bucket name**: Confirm the canonical value for `VERILEX_DOCUMENTS_BUCKET`.
2) **Mime allowlist + size limits**: Confirm Phase 1 policy and default limits.
3) **Classification updates**: Confirm immutability trigger allows classification-only updates on `intake_documents`.
4) **Firm upload flow**: Decide whether firm uploads use the same signed URL pattern or direct server upload.
5) **Retention policy**: Define Phase 1 retention/cleanup expectations (if any).

End of Deliverable 1.
