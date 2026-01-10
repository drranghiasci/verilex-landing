WF2 Source Of Truth

Sources (do not override with external docs)
- Intake schema source: docs/Georgia–Divorce&Custody-v1.0.md
- Counties source: docs/ga_counties.csv
- WF1 contract sources: docs/workflow1-verification.md, docs/architecture/Phase-1/phase1_workflow_system_overview.md, docs/architecture/Phase-1/Master, schema_public.md, workflow1_db_artifacts.zip
- Product intent: docs/Master-Product-Map.md
- System boundaries: docs/architecture/Phase-1/phase1_workflow_system_overview.md

Hard constraints (non-negotiable)
- Canonical record: public.intakes.raw_payload (jsonb)
- Transcript: public.intake_messages with (intake_id, seq) unique
- Docs: public.intake_documents metadata only; files in Storage
- Lock boundary: public.intakes.submitted_at null→non-null; post-submit UPDATE/DELETE blocked by triggers
- Deletes denied everywhere
- State Pattern B: Workflow 2 does not create public.cases
