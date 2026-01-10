# VeriLex Phase 1 — Workflow System Overview

**Version:** 1.0
**Status:** Canonical / Read-Only
**Audience:** Engineering, Product, AI, Architecture (internal)

---

## 1. Phase 1 Product Objective

VeriLex Phase 1 is a **sellable legal SaaS product** whose primary value proposition is:

> **High-quality, court-defensible client intake that converts prospects into structured, review-ready cases with AI-assisted insight for firms.**

Phase 1 is designed to:

* Reduce intake friction for clients
* Improve intake quality and completeness for firms
* Surface risks and complexity early
* Create clean, auditable case records
* Establish VeriLex as the system of record from first contact

Phase 1 is **not** an internal-only tool.
It is **client-facing + firm-facing**, with clear separation of concerns.

---

## 2. Surface Model (Non-Negotiable)

VeriLex Phase 1 operates across **three distinct surfaces**.
Each surface has a single job and strict boundaries.

### 2.1 Landing Surface (`/landing`)

**Purpose:** Sell VeriLex.

* Marketing content
* Product explanation
* Pricing / waitlist / demos
* Firm login entry point

**Must NOT:**

* Collect client legal data
* Run intake
* Display firm dashboards

---

### 2.2 Intake Surface (`/intake`) — Client-Facing

**Purpose:** Sell the firm to prospective clients.

* Public or semi-public
* Linked or embedded from firm websites
* No firm authentication required
* Minimal friction, high trust

Clients use this surface to:

* Complete guided legal intake
* Upload documents
* Submit information for review

**Must NOT:**

* Expose firm internal data
* Show AI risk flags
* Make legal determinations
* Accept or reject cases

---

### 2.3 MyClient Surface (`/myclient`) — Firm-Facing

**Purpose:** Run the firm.

* Authenticated
* Firm-scoped
* Attorney and staff workflows

Firms use this surface to:

* Review submitted intakes
* See AI-assisted summaries and flags
* Accept / reject cases
* Manage active cases
* View analytics

**Must NOT:**

* Be client-accessible
* Collect raw client intake directly (except manual/internal mode)

---

## 3. Workflow System Overview

Phase 1 is implemented through **seven discrete workflows**.
Each workflow owns a specific responsibility and produces artifacts consumed by others.

### 3.1 Workflow Responsibility Map

| Workflow | Name            | Primary Responsibility                  | Produces                      | Consumed By |
| -------- | --------------- | --------------------------------------- | ----------------------------- | ----------- |
| 1        | Data Foundation | DB schema, RLS, immutability, audit     | Tables, guarantees, contracts | 2–7         |
| 2        | Client Intake   | Client-facing intake UX                 | Drafts, submissions           | 3,4,6,7     |
| 3        | Rules Engine    | Deterministic validation & requirements | Warnings, blocks              | 4,6         |
| 4        | AI System       | Extraction, flags, supervision          | ai_runs, ai_flags             | 6,7         |
| 5        | Documents       | Upload, storage, classification         | documents                     | 4,6         |
| 6        | Case Lifecycle  | Accept/reject, state transitions        | active cases                  | 7           |
| 7        | Analytics       | Metrics and insights                    | reports                       | Firms       |

---

## 4. End-to-End Phase 1 Data & Control Flow

This flow is **canonical**.

1. Client navigates to
   `/intake/{firm_slug}` (or equivalent firm-resolved entry)
2. **Workflow 2** collects intake data (draft state)
3. Client submits intake
4. **Workflow 1** locks intake (immutability enforced)
5. **Workflow 3** runs deterministic rules
6. **Workflow 4** runs AI extraction and risk analysis
7. Intake appears in firm Intake Queue (`/myclient`)
8. Firm reviews intake + AI insights
9. **Workflow 6** transitions intake → accepted case (or rejection)
10. **Workflow 7** records analytics and performance metrics

At no point does AI auto-act or override human decisions.

---

## 5. Workflow Ownership Rules (Critical)

These rules prevent system drift and integration failure.

### 5.1 Ownership

* Each workflow **owns its outputs**
* Other workflows may **consume but not modify** those outputs
* Once a workflow is finalized, its interface is treated as a contract

### 5.2 Immutability

* Submitted intakes are immutable
* Intake transcripts are immutable
* AI runs are append-only
* Audit logs are append-only

### 5.3 AI Constraints

* AI is assistive only
* AI never makes binding decisions
* AI outputs must be explainable and traceable
* AI outputs are never shown to clients

---

## 6. Inter-Workflow Communication Model

Workflows **do not share conversational memory**.

They communicate via:

* **Published artifacts** (markdown contracts, reports)
* **Database contracts**
* **Explicit interface assumptions**

Each completed workflow produces:

1. A **Workflow Report** (what was built)
2. A **Workflow Interface Contract** (how others interact with it)

These artifacts are imported into downstream workflows as read-only files.

---

## 7. Change Management Rules

* Completed workflows are not silently changed
* Any change to a workflow’s interface:

  * requires regenerating its interface contract
  * must be propagated downstream
* System Overview updates only when:

  * a workflow is completed
  * a responsibility boundary changes

---

## 8. Why This Architecture Exists

This workflow system exists to:

* Keep client UX clean and safe
* Keep firm tools powerful but isolated
* Make AI legally defensible
* Allow fast iteration without breaking the system
* Scale VeriLex beyond Phase 1 without rewrites

This is intentional, not accidental.

---

## 9. Final Guiding Principle

> **Clients provide information.
> Firms make decisions.
> VeriLex enforces structure, safety, and insight.**

Any workflow that violates this principle is out of scope.

---

**End of Document**

