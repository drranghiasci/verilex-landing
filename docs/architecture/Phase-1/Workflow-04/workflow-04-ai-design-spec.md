# workflow-04-ai-design-spec.md
VeriLex Phase 1 - Workflow 4: AI Extraction, Flags, & Supervision (Design Spec)

Version: v0.1 (Draft)
Status: Design-only (NO CODE)
Scope: Georgia Divorce & Custody Intake (Phase 1)

---

## 0) Understanding and Scope Confirmation

Workflow 4 runs post-submit and post-WF3. It produces advisory-only AI outputs to assist firm reviewers. Workflow 4:

- Extracts structured data from intake content into the existing Phase 1 schema
- Detects risks, inconsistencies, and complexity signals
- Produces explainable, evidence-backed, auditable outputs
- Enforces strict Human-in-the-Loop (HITL) constraints
- Does not make decisions, does not take actions, and does not communicate with clients
- Never overrides WF3 deterministic results

---

## 1) Authoritative Documents by Section

Because Workflow 4 is supervision- and audit-critical, authority order matters. The following documents are authoritative for the sections indicated:

### 1.1 Workflow ordering, boundaries, lifecycle integration
Authoritative:
- A. VeriLex Phase 1 - Workflow System Overview.md
Governs: workflow lifecycle ordering, when WF4 runs, how WF4 outputs are consumed.

### 1.2 AI safety, supervision, logging, prompt governance, HITL
Authoritative:
- B. AI Architecture.docx
Governs: model access rules, prompt structure, evidence citation standards, run logging, prompt versioning, HITL enforcement, failure behavior, and any restrictions on data handling.

### 1.3 Schema semantics (what to extract; field names/enums; allowed values)
Authoritative:
- C. Georgia - Divorce & Custody | v1.0.docx
Governs: canonical schema fields, enums, semantics, definitions of derived concepts allowed (if any), and what is out of scope.

### 1.4 County normalization reference
Authoritative:
- D. ga_counties.csv
Governs: canonical county list for reference/normalization suggestions only; WF4 must defer to WF3 canonicalization where present.

### 1.5 Upstream artifacts, immutability constraints, storage conventions
Authoritative:
- E. Workflow 1-3 artifacts
Governs: where to store WF4 outputs, immutability/audit constraints, what has already been validated/normalized, and how to avoid duplicating WF3 logic.

---

## 2) WF3 Outputs Treated as WF4 Inputs

Workflow 4 is determinism-aware. It consumes WF3 outputs as "ground truth for validation/canonicalization," and uses them to focus AI on the remaining ambiguity.

WF4 will treat these WF3 artifacts as inputs (names may vary in the repo; these are conceptual artifacts that must map to existing WF3 outputs):

1. WF3 Validation Summary
   - Overall validation status (e.g., review-ready vs not, if that exists)
   - Field-level validation results (missing, invalid format, inconsistent enum, etc.)
   - Rule IDs triggered and their outcomes

2. WF3 Canonicalized / Normalized Fields (if produced)
   - Canonical county (if WF3 does county canonicalization)
   - Normalized state / location values
   - Any standardized enum mappings WF3 applies

3. WF3 Evidence / Provenance (if produced)
   - If WF3 stores evidence pointers (e.g., "field X came from question Y"), WF4 will reuse those pointers rather than re-derive them.

4. WF3 Requirements / Completeness Indicators
   - Which required fields are complete vs incomplete
   - "Blocking" items for review-ready (WF3-authoritative)

WF4 will use WF3 results to:
- Avoid re-checking deterministic rules
- Prioritize AI attention to free-text fields and cross-field consistency
- Report inconsistencies as advisory flags without changing WF3 outcomes

---

## 3) What Workflow 4 Will Not Infer, Decide, or Produce

Workflow 4 is explicitly constrained. It will not attempt to:

1. Make legal determinations
   - No eligibility decisions (e.g., "meets residency requirement" as a conclusion)
   - No predictions of outcomes
   - No "should file in X county" recommendations

2. Provide legal advice
   - No strategy suggestions
   - No "what to do next" guidance
   - No drafting of legal filings for the client

3. Override or "correct" intake data
   - No modification of submitted intake answers
   - No rewriting client statements as "facts"
   - No auto-filling missing required fields

4. Override WF3
   - WF3 validation and canonicalization remain authoritative
   - WF4 can surface discrepancies but cannot change WF3 results

5. Communicate externally
   - No client-facing messaging
   - No notifications, submissions, or workflow state transitions

6. Auto-act
   - No automatic escalation, rejection, acceptance, or routing
   - No writing into operational case fields used as the system of record without explicit review gates (details below)

---

## 4) Objective

Per intake submission, Workflow 4 will produce a versioned, immutable "AI Run Output" consisting of:

1. Schema-bound structured extraction
   - Extract from free text into existing Phase 1 schema fields where the schema allows derived values
   - Mark extraction confidence per field
   - Attach evidence pointers for each extracted value

2. Risk / complexity flagging
   - Domestic violence indicators
   - Jurisdictional complexity signals (multi-state, relocation, military, etc. only if schema/policy allows these categories)
   - Custody conflict signals
   - Inconsistency signals across answers
   - Any other defined "review attention" flags

3. Explainability and auditability
   - Evidence-backed outputs (field and flag level)
   - Traceability: model, prompt versions, timestamps, input hashes/IDs, and deterministic context references

4. HITL enforcement
   - Outputs must be reviewed and explicitly accepted/rejected by a human before influencing downstream workflow steps (WF6/WF7 consumption rules defined in Deliverable 4 later)

---

## 5) Inputs

Workflow 4 inputs are read-only snapshots of:

### 5.1 Intake content (WF2/WF1 system-of-record)
- Structured answers (form fields)
- Free-text narrative fields
- Any uploaded text documents (if Phase 1 allows)
- Submission metadata (timestamps, submitter role, etc.)

### 5.2 WF3 outputs (deterministic validation & canonicalization)
- Rule outcomes
- Canonicalized values
- Missing/invalid indicators

### 5.3 Reference data
- County list (ga_counties.csv) as a reference for suggested normalization only
- Schema definitions (Georgia Divorce & Custody v1.0)

---

## 6) AI Task Taxonomy

Workflow 4 decomposes AI into small, explicit tasks rather than monolithic "do everything" prompts. Each task produces a bounded output with consistent evidence and confidence patterns.

### 6.1 Extraction tasks (schema-bound)
- Extract key facts from free-text into specified schema fields
- Standardize entity mentions (names, locations) only when schema expects it
- County mention normalization suggestions (advisory; WF3 remains canonical if present)

### 6.2 Flagging tasks (risk & complexity)
- Domestic violence indicators (strictly evidence-backed; careful handling)
- Custody conflict signals (e.g., disagreement, safety concerns, withholding access)
- Jurisdictional complexity signals (multi-county, out-of-state, relocation; only as "signals")

### 6.3 Consistency tasks
- Cross-field contradictions (e.g., marital status vs narrative; residence dates vs residency claims)
- Conflicting statements across multiple narrative answers

### 6.4 Quality tasks
- Ambiguity detection (insufficient detail, unclear timeline)
- "Reviewer attention" summarization: short, neutral, evidence-cited checklist of what to review

---

## 7) Prompting Strategy

### 7.1 Prompt governance
All prompts are:
- Versioned (e.g., "wf4.prompt.<task_id>.v1")
- Stored as immutable artifacts
- Referenced by hash/version in every run log
- Designed to be deterministic-friendly (explicit instructions, explicit output schema)

### 7.2 System vs task instructions
Each task prompt uses a clear split:
- System instructions: safety, non-negotiables, schema-bound behavior, evidence requirements, "do not" constraints
- Task instructions: narrow extraction/flagging objective, input fields, output schema
- Output format: strict JSON with no free-form prose outside fields defined

### 7.3 Determinism-aware behavior
Prompts instruct the model to:
- Treat WF3 canonical fields as authoritative
- If WF3 says "invalid" or "missing," the model may:
  - Explain likely reason (if evidence exists)
  - Suggest clarifying questions for the reviewer (not the client)
  - But never "fix" the record

### 7.4 Evidence-first prompting
Prompts require:
- Every extracted field and flag must include:
  - Evidence pointers to intake sources (field IDs, message IDs, document IDs, and span offsets when available)
  - A short evidence quote/snippet (bounded length) or a reference to a span object
- If evidence is not present, output must be null plus a reason code (e.g., INSUFFICIENT_EVIDENCE)

---

## 8) Evidence Model

Workflow 4 uses an auditable evidence structure:

### 8.1 Evidence pointer types
- Intake field pointer: (field_id, value_path) for structured answers
- Message pointer: (message_id, char_start, char_end) for chat-style intake
- Document pointer: (document_id, page/section, char_start, char_end) if text extraction exists
- WF3 pointer: (wf3_artifact_id, rule_id, field_id) for deterministic context references (not "evidence," but provenance)

### 8.2 Evidence constraints
- Evidence snippets are limited in length (to avoid overexposure and maintain privacy posture)
- Evidence must be directly supportive; no speculative reasoning

---

## 9) Confidence Model

### 9.1 Field-level confidence
Each extracted field includes:
- confidence_score (0.0-1.0)
- confidence_level (e.g., LOW/MED/HIGH)
- confidence_rationale_code (controlled vocabulary; e.g., DIRECT_STATEMENT, IMPLIED, MULTI_SOURCE_SUPPORT, AMBIGUOUS)

### 9.2 Flag-level confidence
Each flag includes:
- flag_present (boolean)
- confidence_score
- evidence (one or more pointers)
- why_it_matters_for_review (neutral, reviewer-facing, non-advisory)

### 9.3 Calibration rule
Confidence is not allowed to "upgrade" determinism:
- Even HIGH confidence does not authorize automation
- Confidence only affects reviewer prioritization and UI presentation (downstream)

---

## 10) Storage & Logging Model

Workflow 4 produces immutable AI run artifacts. The system must support reproducibility and audit.

### 10.1 Storage objects (conceptual)
1. AI Run Log (metadata)
   - run_id
   - case_id / intake_id
   - workflow_stage = WF4
   - created_at
   - model_provider, model_name, model_version (if available)
   - prompt_bundle_version and per-task prompt version IDs/hashes
   - input_snapshot_ids (links to immutable intake/WF3 snapshots)
   - status (SUCCESS / PARTIAL / FAIL)
   - failure_reason (if any)

2. AI Run Output (immutable JSON)
   - Structured extractions (schema-mapped)
   - Flags
   - Consistency findings
   - Evidence objects
   - Confidence fields
   - Task-level outputs keyed by task_id

3. AI Evidence Index (optional but recommended)
   - Normalized evidence spans to support UI rendering without duplicating text

### 10.2 Immutability and versioning
- WF4 writes new immutable artifacts per run; it never overwrites.
- Re-runs create new run_id with linkage to previous runs.

### 10.3 Data minimization
- Store references to source text via pointers where possible
- If snippets are stored, keep them short and necessary for explainability

---

## 11) HITL Enforcement

Workflow 4 must enforce that AI is advisory:

### 11.1 Review gates
- WF4 outputs are marked "UNREVIEWED" by default.
- Downstream workflows (WF6/WF7) must treat WF4 outputs as:
  - Displayable to firm users
  - Not operationally effective until a reviewer takes an explicit action (e.g., "accept extraction," "dismiss flag," "confirm")

### 11.2 Reviewer action model (conceptual)
- Reviewers can:
  - Accept/dismiss individual flags
  - Accept AI-suggested values as "reviewer-confirmed" (stored as a separate human-authored artifact, not overwriting original intake)
- WF4 itself does not implement reviewer UX; it only produces data to support it.

### 11.3 Safety posture for sensitive flags
For domestic violence and safety-related indicators:
- Require strong evidence linkage
- Avoid conclusory labels; use "indicator present" with evidence and "needs review"
- No recommendations (e.g., "seek protective order") - strictly prohibited

---

## 12) Fail-Safe Behavior

WF4 failure must not break intake/review flow.

### 12.1 Failure modes
- Model call failure
- Output JSON schema mismatch
- Partial task failures
- Evidence extraction failure

### 12.2 Required fail-safe handling
- If WF4 fails entirely:
  - Store a run log with FAIL and a reason
  - Do not block review; the case remains reviewable using WF2/WF3 data alone
- If partial failure:
  - Store partial outputs with PARTIAL
  - Include task-level statuses so the UI can reflect missing AI components

---

## 13) Acceptance Criteria

Workflow 4 is considered complete (design + implementation later) when:

1. Schema-bound outputs
   - All extractions map strictly to Phase 1 schema fields/enums (no invented fields)
2. Evidence-backed
   - Every extracted value and flag includes evidence pointers; no evidence -> null or flag_present=false with reason codes
3. Determinism-aware
   - WF3 outputs are ingested and treated as authoritative for deterministic validations/canonicalizations
4. Immutable, versioned, auditable
   - Every run stores: model+prompt versioning, inputs references, outputs, status, timestamps
5. HITL enforced
   - Outputs are labeled advisory and unreviewed by default; no downstream automation is enabled by WF4 outputs
6. Fail-safe
   - WF4 failures do not block submission, review, or WF3 outcomes

---

## 14) Dependencies / Open Questions (To Resolve via Repo + WF1-WF3 Artifacts)

These must be resolved against the actual repo artifacts and the authoritative documents before implementation:

1. Exact schema field names and enums
   - Must be taken from "Georgia - Divorce & Custody | v1.0.docx"
2. Existing storage conventions
   - Where WF1-WF3 store immutable artifacts, IDs, snapshot references, and audit metadata
3. WF3 output format
   - Exact structure of rule outputs and canonical fields to ingest
4. Document handling in Phase 1
   - Whether WF4 receives OCR/text-extracted docs or only metadata; evidence pointer strategy depends on this
5. Approved model/provider configuration
   - Must match AI Architecture.docx (provider, model family, allowed data handling)
6. Security posture for sensitive content
   - Redaction rules for stored snippets; role-based access expectations for rendering evidence in firm UI

---

## 15) Summary

Workflow 4 is a supervised, auditable AI assistant layer that:
- Runs after WF3
- Produces schema-bound extractions and evidence-backed flags
- Logs every run with prompt/model attribution
- Enforces HITL and fail-safe operation
- Never makes decisions or alters the system of record

End of Deliverable 1.
