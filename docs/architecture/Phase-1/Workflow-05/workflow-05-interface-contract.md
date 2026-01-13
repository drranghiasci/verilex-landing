# Workflow 5 Interface Contract

Version: v0.1  
Status: Design-only (no code)

This contract defines the API surfaces for Phase 1 document uploads and metadata persistence.

---

## 1) Intake (anonymous) endpoints

### 1.1 Create upload URL
**Endpoint:** `POST /api/intake/documents/create-upload`

**Auth:** intake token (Bearer or header).

**Request:**
```
{
  "intakeId": "uuid (optional)",
  "filename": "string (required)",
  "content_type": "string (optional)",
  "size_bytes": "number (optional)"
}
```

**Response:**
```
{
  "ok": true,
  "storage_object_path": "string",
  "signed_url": "string",
  "expires_in": number
}
```

**DB writes:** none  
**Storage:** signed URL only  
**Errors:** 401 missing token, 403 intake mismatch, 409 locked

---

### 1.2 Confirm upload (metadata persist)
**Endpoint:** `POST /api/intake/documents/confirm`

**Auth:** intake token (Bearer or header).

**Request:**
```
{
  "intakeId": "uuid (optional)",
  "storage_object_path": "string (required)",
  "document_type": "string (optional)",
  "content_type": "string (optional)",
  "size_bytes": "number (optional)",
  "classification": "object (optional)"
}
```

**Response:**
```
{
  "storage_object_path": "string",
  "document_type": "string | null",
  "classification": "object",
  "created_at": "timestamp"
}
```

**DB writes:**
- Insert into `public.intake_documents`
- Update `public.intakes.raw_payload` to set `uploaded=true` (draft only)

**Errors:** 401 missing token, 403 intake mismatch, 409 locked

---

## 2) MyClient (firm-auth) endpoints

These endpoints are for firm staff uploads tied to a case. Implementation may use signed URLs or server-side uploads.

### 2.1 Create upload URL (firm)
**Endpoint:** `POST /api/myclient/documents/create-upload`

**Auth:** firm member session (Supabase access token).

**Request:**
```
{
  "caseId": "uuid (required)",
  "filename": "string (required)",
  "content_type": "string (optional)",
  "size_bytes": "number (optional)"
}
```

**Response:**
```
{
  "ok": true,
  "storage_path": "string",
  "signed_url": "string",
  "expires_in": number
}
```

**DB writes:** none  
**Storage:** signed URL only  
**Errors:** 401 unauthenticated, 403 not in firm, 404 case not found

---

### 2.2 Confirm upload (case metadata persist)
**Endpoint:** `POST /api/myclient/documents/confirm`

**Auth:** firm member session (Supabase access token).

**Request:**
```
{
  "caseId": "uuid (required)",
  "storage_path": "string (required)",
  "filename": "string (required)",
  "mime_type": "string (optional)",
  "size_bytes": number (optional),
  "display_name": "string (optional)",
  "doc_type": "string (optional)",
  "tags": ["string"] (optional)
}
```

**Response:**
```
{
  "id": "uuid",
  "case_id": "uuid",
  "storage_path": "string",
  "filename": "string",
  "created_at": "timestamp"
}
```

**DB writes:**
- Insert into `public.case_documents`

**Errors:** 401 unauthenticated, 403 not in firm, 404 case not found

---

## 3) Document type constraints

The Phase 1 canonical document types align with:
`docs/carryover/workflow-02-field-enums.md` under `document_type`.

---

## 4) Classification hooks (WF4)

WF5 does not execute AI. WF4 may write classification metadata:
- `public.intake_documents.classification.wf4` (advisory)
- `public.ai_runs` / `public.ai_flags` for audit and flags

WF5 endpoints must not override WF4 outputs or mutate intake facts.

End of Deliverable 3.
