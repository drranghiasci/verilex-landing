# Workflow 01 – Interface Contract  
**Phase 1: Data Foundation (STRICT INTERNAL CONTRACT)**

This document defines the **binding interface contract** between Workflow 1 (DB + RLS + Immutability + Audit) and all downstream workflows in Phase 1.

Downstream workflows **must conform exactly** to the rules in this document.  
Violations may break firm isolation, legal defensibility, or audit guarantees.

---

## 1. Scope and Authority

- This contract applies to **Phase 1 only**
- Workflow 1 is the **system of record** for all intake-related data
- All constraints are enforced **at the database layer**
- Application code must assume DB enforcement is authoritative

---

## 2. Tables Other Workflows MAY READ From

### `public.intakes`
**Read for:**
- Intake status (`draft` / `submitted`)
- Client-identifying display fields
- Immutable raw intake payload
- Submission timestamp

**Key read fields:**
- `id`
- `firm_id`
- `status`
- `submitted_at`
- `raw_payload`
- `created_at`

---

### `public.intake_messages`
**Read for:**
- Full intake transcript reconstruction
- Review, summary, or display

**Key read fields:**
- `intake_id`
- `seq`
- `source`
- `channel`
- `content`

---

### `public.intake_extractions`
**Read for:**
- Structured intake data
- AI- or rules-derived fields for downstream workflows

**Key read fields:**
- `intake_id`
- `version`
- `extracted_data`
- `confidence`

---

### `public.intake_documents`
**Read for:**
- Document metadata
- Storage object path resolution

**Key read fields:**
- `intake_id`
- `storage_object_path`
- `document_type`
- `classification`

---

### `public.ai_runs`
**Read for:**
- Audit and explainability of AI usage
- Displaying model outputs or reasoning traces

**Key read fields:**
- `intake_id`
- `run_kind`
- `model_name`
- `outputs`
- `created_at`

---

### `public.ai_flags`
**Read for:**
- Risk review
- Human acknowledgement workflows

**Key read fields:**
- `intake_id`
- `flag_key`
- `severity`
- `summary`
- `is_acknowledged`

---

### `public.audit_log`
**Read for:**
- Compliance review
- Internal audit tooling

**Key read fields:**
- `firm_id`
- `event_type`
- `entity_table`
- `occurred_at`
- `metadata`

---

## 3. Tables Other Workflows MAY WRITE To

### `public.intakes` (PRE-SUBMISSION ONLY)

**Allowed writes:**
- Create draft intake
- Update draft intake fields

**Required columns on INSERT:**
- `firm_id`
- `status` (must be `draft`)
- `raw_payload`

**Optional on INSERT:**
- `created_by`
- `client_display_name`
- `intake_channel`
- `matter_type`
- `urgency_level`
- `language_preference`

**Forbidden after submission:**
- ALL updates and deletes

---

### `public.intake_messages` (PRE-SUBMISSION ONLY)

**Allowed writes:**
- Append transcript messages

**Required columns on INSERT:**
- `firm_id`
- `intake_id`
- `seq`
- `source`
- `channel`
- `content`

**Forbidden after submission:**
- ALL updates and deletes

---

### `public.intake_documents`

**Allowed writes:**
- Insert document metadata (before or after submission)

**Required columns on INSERT:**
- `firm_id`
- `intake_id`
- `storage_object_path`

**Forbidden operations:**
- UPDATE
- DELETE

---

### `public.intake_extractions`

**Allowed writes:**
- Insert new extraction versions

**Required columns on INSERT:**
- `firm_id`
- `intake_id`
- `extracted_data`

**Forbidden operations:**
- UPDATE
- DELETE

---

### `public.ai_runs`

**Allowed writes:**
- Insert AI execution records

**Required columns on INSERT:**
- `firm_id`
- `run_kind`
- `inputs`
- `outputs`

**Optional on INSERT:**
- `intake_id`
- `model_name`
- `prompt_hash`
- `created_by`

**Forbidden operations:**
- UPDATE
- DELETE

---

### `public.ai_flags`

**Allowed writes:**
- Insert new flags
- Acknowledge flags

**Required columns on INSERT:**
- `firm_id`
- `intake_id`
- `flag_key`
- `severity`
- `summary`

**Allowed UPDATE fields (post-submission):**
- `is_acknowledged`
- `acknowledged_by`
- `acknowledged_at`

**Forbidden operations:**
- UPDATE of any other fields
- DELETE

---

## 4. Tables That Are Append-Only

The following tables **must never be updated or deleted**:

- `intake_documents`
- `intake_extractions`
- `ai_runs`
- `audit_log`

Database triggers enforce this.

---

## 5. Canonical Intake Submission Behavior

### Submission is defined by:
- `intakes.submitted_at` transitioning from `NULL` → non-`NULL`

### Submission effects:
- Intake is permanently locked
- All child records become immutable
- Any attempted UPDATE/DELETE raises `INTAKE_IMMUTABLE`
- Audit event `intake_submitted` is written

### Downstream workflows MUST:
- Treat `submitted_at IS NOT NULL` as authoritative
- Never attempt to “reopen” or modify a submitted intake

---

## 6. Columns That Must NEVER Be Updated After Submission

Once `submitted_at` is set:

### `public.intakes`
- All columns (including `raw_payload`, `status`, metadata)

### `public.intake_messages`
- All columns

### `public.intake_extractions`
- All columns

### `public.intake_documents`
- All columns

### `public.ai_runs`
- All columns

### `public.ai_flags`
- All except acknowledgement fields

---

## 7. Required Helper Functions / Assumptions

### Firm Membership
- `public.is_firm_member(firm_id uuid) → boolean`
- Backed by `public.firm_members`
- Used by all RLS policies

### Submission State Check
- `public.is_intake_submitted(intake_id uuid) → boolean`
- Used by immutability triggers

### Audit Writes
- `public.audit_write(...)`
- SECURITY DEFINER
- Used by DB triggers only
- Must not be called directly by application code

---

## 8. Hard “Do Not Do This” Rules

Downstream workflows MUST NOT:

- Use service-role keys to bypass RLS for normal operations
- Update or delete Workflow 1 records post-submission
- Store derived/AI data directly on `intakes`
- Mutate `raw_payload`
- Implement soft deletes or archival flags
- Reconstruct intake state outside DB truth
- Assume deletes are ever allowed

Violations compromise **legal defensibility**.

---

## 9. Contract Status

**This contract is FINAL for Phase 1.**

Any change requires:
- A new migration
- Updated verification
- Explicit contract revision

Downstream workflows must comply as-is.
