# Workflow 4 Verification Report

Date: 2026-01-12  
Scope: WF4 (AI Extraction, Flags, Supervision) Phase 1

## What Exists (Checklist + Evidence)

- [x] WF4 runner and task wiring exist  
  `src/workflows/wf4/runWf4.ts`
- [x] OpenAI provider wrapper (server-only)  
  `src/workflows/wf4/openaiProvider.ts`
- [x] Prompt templates + versioning  
  `src/workflows/wf4/prompts.ts`  
  `docs/architecture/Phase-1/Workflow-04/workflow-04-prompt-templates.md`
- [x] Task catalog (schema + tasks list)  
  `src/workflows/wf4/taskCatalog.ts`  
  `docs/architecture/Phase-1/Workflow-04/workflow-04-ai-task-catalog.json`
- [x] Evidence pointer utilities + validation  
  `src/workflows/wf4/evidence.ts`
- [x] Trigger post-submit (WF2) and post-WF3  
  `apps/intake/pages/api/intake/submit.ts`
- [x] No client-side OpenAI SDK usage  
  `rg -n "OpenAI|openai" -S apps lib src` → only server files

## What Works (Checklist + Evidence)

- [x] Runs only post-submit and post-WF3 snapshot  
  `apps/intake/pages/api/intake/submit.ts:152-229`  
  `src/workflows/wf4/runWf4.ts:52-134`
- [x] No mutations to intake payload  
  `src/workflows/wf4/runWf4.ts` (read-only load + insert into `ai_runs`)
- [x] Prompt IDs + bundle version recorded per task  
  `src/workflows/wf4/runWf4.ts:405-563`  
  `src/workflows/wf4/prompts.ts`
- [x] Strict JSON validation and PARTIAL on task failure  
  `src/workflows/wf4/runWf4.ts:191-551`
- [x] Evidence pointers enforced and snippet bounded  
  `src/workflows/wf4/evidence.ts:3-96`  
  `src/workflows/wf4/runWf4.ts:209-346`
- [x] Immutable inserts to `public.ai_runs`  
  `src/workflows/wf4/runWf4.ts:154-189`
- [x] AI flags persisted to `public.ai_flags`  
  `src/workflows/wf4/runWf4.ts:203-279`
- [x] Idempotency via input_hash + prompt_hash  
  `src/workflows/wf4/runWf4.ts:620-688`
- [x] Document classification stored on `intake_documents`  
  `src/workflows/wf4/runWf4.ts:247-319`
- [x] Smoke tests exist and are mock-safe  
  `scripts/wf4_end_to_end_smoke.ts`  
  `scripts/wf4_smoke.ts`  
  `scripts/wf4_evidence_smoke.ts`  
  `scripts/wf4_counties_smoke.ts`
- [x] Endpoint verification script exists (requires envs)  
  `scripts/wf4_endpoint_verify.ts`

## Gaps Found

None.

## Verdict

WF4 is implemented, idempotent, and audit-safe. It is **post-submit**, **WF3-dependent**, **advisory-only**, and persists outputs to `ai_runs`, `ai_flags`, and document classifications.  

Status: **PASS**
