# workflow-04-interface-contract.md
WF4 Interface Contract - AI Extraction, Flags, & Supervision
Version: v0.1

This contract defines what WF4 requires from WF2/WF3 and what WF4 guarantees downstream (WF6/WF7).
WF4 is advisory-only and produces immutable artifacts.

---

## 1) WF4 Execution Preconditions
WF4 may run only when:
- Intake is submitted (post-submit snapshot exists)
- WF3 has executed and produced its deterministic artifacts (validation and canonicalization where applicable)

WF4 must not block any flow if these are missing; it should fail-safe and log.

---

## 2) Required Inputs to WF4

### 2.1 Intake Snapshot (read-only)
WF4 expects an immutable intake snapshot object with:
- intake_id (string)
- case_id or submission_id (string)
- structured_fields: object (key/value, stable keys)
- free_text_fields: object (key/value)
- messages: array (message_id, role/type, content, created_at)
- documents: array optional (document_id, filename, mimetype, text_extract optional, created_at)
- created_at timestamp
- source_version identifiers (optional)

Stability guarantee:
- WF4 treats these as immutable inputs; any re-run references a new snapshot id if the intake changed (but intake should be immutable post-submit by design).

### 2.2 WF3 Snapshot (read-only)
WF4 expects:
- wf3_run_id
- validation_summary: object
  - rule_results (rule_id, pass/fail, affected_fields, message optional)
  - completeness markers (missing required fields)
- canonical_fields: object (normalized/canonical values if WF3 produces them)
- created_at timestamp

WF3 authority rule:
- WF3 outputs are authoritative for deterministic checks and canonicalized values.

### 2.3 Reference Data
- ga_counties reference list (from ga_counties.csv)
- schema_allowlist (Phase 1): list of schema field keys WF4 is permitted to extract into
  - This allowlist MUST be derived from "Georgia - Divorce & Custody | v1.0" and enforced by implementation.

---

## 3) WF4 Outputs (Guaranteed)

WF4 guarantees creation of:
1) AI Run Log (immutable)
2) AI Run Output (immutable JSON)

### 3.1 AI Run Log (metadata)
Minimum fields:
- wf4_run_id
- intake_id, wf3_run_id
- started_at, completed_at
- status: SUCCESS | PARTIAL | FAIL
- model_provider, model_name, model_version (if available)
- prompt_bundle_version (e.g., v0.1)
- per_task: task_id -> prompt_id/version/hash, status
- input_refs: pointers to snapshot ids / hashes

### 3.2 AI Run Output (content)
WF4 output JSON must be structured as:
- extractions (from wf4.extract.schema_fields.v1)
- flags
  - dv_indicators
  - jurisdiction_complexity
  - custody_conflict
- inconsistencies
- county_mentions (advisory)
- review_attention summary
- evidence objects embedded per item (or referenced by id if the storage model externalizes evidence)

All items must include:
- confidence_score and confidence_level (where applicable)
- evidence pointers for any non-null/true outputs

---

## 4) Consumption Rules for WF6/WF7

### 4.1 Advisory-only
WF6/WF7 must treat WF4 outputs as:
- non-decisional
- non-authoritative vs WF3 for deterministic correctness
- requiring human review to be operationally meaningful

### 4.2 HITL state (required)
WF4 outputs are "UNREVIEWED" by default.
Downstream systems may display them to firm reviewers but must not auto-trigger lifecycle transitions or analytics decisions that imply case acceptance/rejection.

### 4.3 Fail-safe
If WF4 is FAIL or PARTIAL:
- WF6/WF7 proceed using WF2/WF3 only.
- WF4 status is visible for diagnostics, but does not block.

---

## 5) Backwards Compatibility / Stability Guarantees

WF4 guarantees:
- Task IDs are stable once released.
- Output top-level keys remain stable for the prompt bundle version.
- Additive changes only within a minor version (v0.1 -> v0.2 may add new optional keys, not remove or rename existing keys).
- Breaking changes require a major bump (v1.0) and parallel support if needed.

---

## 6) Explicit Non-Guarantees
WF4 does not guarantee:
- Completeness of extraction (only what evidence supports)
- Legal correctness of interpretations (it produces signals, not determinations)
- Any automation or decision outcomes

End.
