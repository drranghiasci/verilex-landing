This archive contains the finalized Workflow 1 database artifacts for VeriLex Phase 1.

Contents:
- supabase/migrations/: authoritative database migrations
- schema_dump.sql: schema-only dump of the live database

Purpose:
- Used by downstream workflows (2–7) as read-only backend truth.
- Do NOT modify directly in UI or AI workflows.
