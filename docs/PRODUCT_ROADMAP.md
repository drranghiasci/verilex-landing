VeriLex AI Product Roadmap
Purpose of This Document

This roadmap defines what is built when.
It exists to:

Prevent MVP scope creep

Align development across chats, tools, and contributors

Preserve long-term vision without contaminating near-term execution

Provide a shared reference point for decisions

Rule:
If a feature is not listed under the current phase, it is intentionally deferred.

Phase 1 — MVP (Current Focus)
Goal

Deliver a secure, firm-aware legal workspace that solo attorneys and small firms can actually use, demo, and trust.

Core Capabilities

This phase must remain simple, reliable, and shippable.

1. Firm Onboarding & Access

Firm intake submission

Admin approval workflow

Firm creation

Email-based invite flow

Secure invite acceptance

Automatic firm membership linking

Firm-scoped access control (RLS)

2. MyClient Dashboard (Minimal Shell)

Firm context awareness

Firm badge (firm ID + role)

Basic navigation

Clear empty states

No analytics or automation

3. Active Cases

Firm-scoped case list

Core fields only:

Client name

Matter type

Status

Created date

Read-only list view

Simple empty states

4. Case Detail (Minimal)

View and edit basic metadata

Plain-text internal notes

Firm-scoped access enforcement

No workflows or automations

5. Documents (Basic)

Upload documents to a case

List documents per case

Download/view files

No OCR, AI, tagging, or parsing

6. Firm Members (Read-Only)

View firm members and roles

No role editing

No invite management from UI

Definition of MVP Complete

MVP is considered complete when:

A new firm can onboard end-to-end

Users only see their firm’s data

Cases can be viewed and minimally managed

Documents can be uploaded and retrieved

The system is stable, demoable, and deployable

Phase 2 — Firm Productivity (Post-MVP)
Goal

Improve day-to-day legal operations without introducing AI complexity.

Potential Features

Tasks and follow-ups

Internal reminders

Simple timelines

Case status workflows

Member role management

Activity feeds

Audit trails

⚠️ None of these are MVP.

Phase 3 — AI Enablement
Goal

Introduce AI assistance only after core workflows are proven.

Potential Features

Case summarization

Document analysis

Draft generation

Research assistance

Intake analysis

AI features must never compensate for missing fundamentals.

Phase 4 — Client & Firm Expansion
Goal

Expand beyond internal firm use.

Potential Features

Client portal

Secure messaging

Billing and invoicing

Payments

Multi-firm membership

Firm analytics

Scope Enforcement Rule (Important)

If a feature is not listed under Phase 1, it is out of scope

Phase changes require an explicit decision

MVP scope remains locked unless formally amended

This document defines intentional sequencing, not limitations.

Versioning

Phase 1 (MVP): Active

This document may evolve, but Phase 1 scope must remain stable until shipped