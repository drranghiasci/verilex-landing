# Workflow 01 – Data Foundation Report  
**Phase 1: DB + RLS + Immutability + Audit**

---

## 1. Purpose of Workflow 1 in the Phase 1 System

Workflow 1 establishes the **legally defensible data foundation** for VeriLex Phase 1.  
Its purpose is to guarantee that all client intake and AI-derived data is:

- **Firm-isolated** (no cross-firm visibility at the database level)
- **Immutable after submission** (court-defensible record integrity)
- **Fully auditable** (append-only event history)
- **AI-assistive, never authoritative** (AI outputs stored separately from raw intake)
- **Safe by default** (no deletes, constrained updates, enforced via DB not application logic)

All downstream workflows **must treat this layer as authoritative and restrictive**.  
Business logic, UI, and automation must conform to the guarantees enforced here.

---

## 2. Tables Created / Modified in Workflow 1

### Core Intake & AI Tables (new)
- `public.intakes`
- `public.intake_messages`
- `public.intake_extractions`
- `public.intake_documents`
- `public.ai_runs`
- `public.ai_flags`
- `public.audit_log`

### Existing Tables Touched (behaviorally)
- None structurally altered; existing tables are only referenced for FKs or audit triggers where present (e.g., `cases`).

---

## 3. Table-by-Table Specification

### 3.1 `public.intakes`
**Purpose:**  
Canonical, immutable record of a client intake. This is the **source of truth**.

- **Primary Key:** `id uuid`
- **Required Columns:**
  - `firm_id uuid`
  - `status text` (`draft` | `submitted`)
  - `raw_payload jsonb`
  - `created_at timestamptz`
- **Firm Scoping:** `firm_id` + RLS via `is_firm_member(firm_id)`
- **Key Indexes:**
  - `firm_id`
- **Notes:**  
  - Becomes immutable once `submitted_at` is set.

---

### 3.2 `public.intake_messages`
**Purpose:**  
Ordered transcript of intake interaction (chat/form hybrid).

- **Primary Key:** `id uuid`
- **Required Columns:**
  - `firm_id uuid`
  - `intake_id uuid`
  - `seq int`
  - `source text`
  - `channel text`
  - `content text`
- **Firm Scoping:** `firm_id`
- **Key Indexes / Constraints:**
  - Unique `(intake_id, seq)`
  - Index on `intake_id`
- **Notes:**  
  - Treated as part of the immutable intake record post-submission.

---

### 3.3 `public.intake_extractions`
**Purpose:**  
Structured, derived data produced from intake (AI or rules).

- **Primary Key:** `id uuid`
- **Required Columns:**
  - `firm_id uuid`
  - `intake_id uuid`
  - `version int`
  - `extracted_data jsonb`
- **Firm Scoping:** `firm_id`
- **Key Indexes / Constraints:**
  - Unique `(intake_id, version)`
- **Notes:**  
  - Explicitly **derived** data; never overwrites raw intake.

---

### 3.4 `public.intake_documents`
**Purpose:**  
Metadata for documents uploaded during intake.

- **Primary Key:** `id uuid`
- **Required Columns:**
  - `firm_id uuid`
  - `intake_id uuid`
  - `storage_object_path text`
- **Firm Scoping:** `firm_id`
- **Key Indexes:**
  - `intake_id`
- **Notes:**  
  - Files themselves live in Supabase Storage; DB only tracks pointers.

---

### 3.5 `public.ai_runs`
**Purpose:**  
Immutable record of AI executions (extraction, classification, flagging).

- **Primary Key:** `id uuid`
- **Required Columns:**
  - `firm_id uuid`
  - `run_kind text`
  - `inputs jsonb`
  - `outputs jsonb`
- **Firm Scoping:** `firm_id`
- **Key Indexes:**
  - `firm_id`
  - `intake_id`
- **Notes:**  
  - AI outputs are **assistive only**.
  - Never treated as authoritative state.

---

### 3.6 `public.ai_flags`
**Purpose:**  
Human-reviewable risk or attention flags produced by AI.

- **Primary Key:** `id uuid`
- **Required Columns:**
  - `firm_id uuid`
  - `intake_id uuid`
  - `flag_key text`
  - `severity text` (`low` | `medium` | `high`)
  - `summary text`
- **Firm Scoping:** `firm_id`
- **Key Indexes:**
  - `intake_id`
- **Notes:**  
  - Post-submission updates limited strictly to acknowledgement fields.

---

### 3.7 `public.audit_log`
**Purpose:**  
Append-only, court-defensible event log.

- **Primary Key:** `id uuid`
- **Required Columns:**
  - `firm_id uuid`
  - `event_type text`
  - `entity_table text`
  - `occurred_at timestamptz`
- **Firm Scoping:** `firm_id`
- **Key Indexes:**
  - `(firm_id, occurred_at desc)`
  - `(entity_table, entity_id)`
- **Notes:**  
  - No updates or deletes allowed at DB level.

---

## 4. Immutability Boundaries

### What becomes immutable
Once `intakes.submitted_at` is set (non-null):

- `intakes`
- `intake_messages`
- `intake_extractions`
- `intake_documents`
- `ai_runs` (existing rows)
- `ai_flags` (except acknowledgement fields)

### What is still allowed
- **Inserts** of:
  - `ai_runs`
  - `ai_flags`
  - `intake_documents`
- **Acknowledgement-only updates** to `ai_flags`

### How enforced
- Database-level **BEFORE UPDATE / DELETE triggers**
- Enforcement does **not rely on application code**
- Violations raise `INTAKE_IMMUTABLE`

---

## 5. Row Level Security (RLS) Summary

All Workflow 1 tables:
- `RLS ENABLED`
- `FORCE RLS = true`

### Membership Model
- Access determined by `public.is_firm_member(firm_id)`
- Backed by `public.firm_members`

### Policy Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|------|--------|--------|--------|--------|
| intakes | firm members | firm members | firm members (pre-submit only) | denied |
| intake_* | firm members | firm members | firm members (pre-submit only) | denied |
| ai_runs | firm members | firm members | firm members (pre-submit only) | denied |
| ai_flags | firm members | firm members | ack-only post-submit | denied |
| audit_log | firm members | denied | denied | denied |

---

## 6. Implied API / Data Contracts for Downstream Workflows

Downstream workflows **may**:
- Create draft intakes
- Append messages/documents before submission
- Submit an intake exactly once
- Insert AI runs and flags
- Read all firm-scoped data

Downstream workflows **must not**:
- Modify any intake-related data after submission
- Delete any Workflow 1 records
- Overwrite raw intake payloads
- Treat AI outputs as authoritative facts

---

## 7. “Do Not Do This” Rules (Critical)

Downstream code **must never**:
- Bypass RLS using service role except for tightly audited admin operations
- Update or delete intake records post-submission
- Mutate `raw_payload`
- Store AI-derived conclusions directly on `intakes`
- Implement “soft deletes” or archival flags on Workflow 1 tables
- Reconstruct intake state outside of the DB record

Violating these rules breaks **legal defensibility**.

---

## 8. Testing & Verification Notes

### Structural Verification (Prompt 7A)
- Confirm tables exist
- Confirm RLS enabled & forced
- Confirm WF1 policies and triggers attached

### Behavioral Verification (Prompt 7B)
- Draft intake creation succeeds
- Submission succeeds
- Post-submission UPDATE fails (`INTAKE_IMMUTABLE`)
- DELETE fails (`INTAKE_IMMUTABLE` or `DELETE_NOT_ALLOWED`)
- Audit log records `intake_submitted`
- AI flag acknowledgement-only update succeeds

All tests passed in Phase 1 validation.

---

## 9. Status

**Workflow 1: COMPLETE**  
This data foundation is stable, enforced at the database layer, and ready to support all downstream Phase 1 workflows.

Downstream teams should treat this document as **binding contract**, not guidance.
