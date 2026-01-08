## Sub-Phase 3 — Firm scoping model and RLS policy set (Phase 1)

This deliverable has two parts:

1. **Policy matrix** (table × operation × role)
2. **Codex-ready RLS SQL** aligned to your existing helpers:

* `public.is_firm_member(uuid)`
* `public.is_firm_editor(uuid)` (admin + attorney)
* `public.is_firm_admin(uuid)`

### Phase 1 assumption (explicit)

For Phase 1, **authenticated firm members** are the only principals granted direct DB access to intake artifacts. If you later add public/anonymous client intake entry, it should be done via a **separate “intake link/token” model** (firm-scoped) or via **Edge Function/service role** ingestion—both are outside this sub-phase and would require additional DB constraints/policies.

---

# 3.1 Policy matrix (Phase 1 MVP)

Legend:

* **M** = firm member (any active firm member)
* **E** = firm editor (admin, attorney)
* **A** = firm admin
* “Append-only” means **no UPDATE/DELETE** via RLS (immutability triggers come in Sub-Phase 4)

## `public.intakes`

* SELECT: **M**
* INSERT: **E**
* UPDATE: **E** *(draft updates allowed; locked by triggers after submission in Sub-Phase 4)*
* DELETE: **A** *(optional; you may prefer “no deletes” Phase 1)*

## `public.intake_raw_payloads` (append-only)

* SELECT: **M**
* INSERT: **E**
* UPDATE: **none**
* DELETE: **none**

## `public.intake_structured_versions`

* SELECT: **M**
* INSERT: **E**
* UPDATE: **E** *(only if you support toggling `is_current` / adding review fields; otherwise make append-only)*
* DELETE: **A** *(optional; you may prefer “no deletes”)*

## `public.intake_transcript_events` (append-only)

* SELECT: **M**
* INSERT: **E** *(or **M** if you want paralegals to add events; default to E)*
* UPDATE: **none**
* DELETE: **none**

## `public.intake_documents`

* SELECT: **M**
* INSERT: **E**
* UPDATE: **E** *(classification/review fields; metadata facts locked post-submit in Sub-Phase 4)*
* DELETE: **A** *(optional; Phase 1 often prefers soft-delete only pre-submit)*

## `public.ai_runs`

* SELECT: **M**
* INSERT: **E** *(or service role; but RLS governs user access)*
* UPDATE: **E** *(only status progression fields; lock post-complete in Sub-Phase 4 or via audit/immutability rules)*
* DELETE: **none** *(recommend none Phase 1)*

## `public.ai_flags`

* SELECT: **M**
* INSERT: **E**
* UPDATE: **E** *(review disposition fields only; capture in audit)*
* DELETE: **none** *(recommend none Phase 1)*

## `public.audit_log` (append-only)

* SELECT: **A** *(recommended) OR **M** *(if you want all members to see audit)*
* INSERT: **E** *(and/or triggers; see note below)*
* UPDATE: **none**
* DELETE: **none**

**Note on audit insertion:** If you implement audit via triggers (recommended next), those triggers can be `SECURITY DEFINER` and will insert regardless of RLS. In that case, you can restrict `audit_log` INSERT to **none** for application users. For Phase 1, I recommend:

* **SELECT: A**
* **INSERT: none** (trigger-only)
  We will formalize this in Sub-Phase 5.

---

# 3.2 Codex-ready RLS SQL (new Phase 1 tables)

Below is the exact policy set you can apply once these tables exist. It follows your current naming style and helper usage.

> If you choose “no deletes” across Phase 1, omit all DELETE policies.

```sql
-- =========================================================
-- Phase 1: Enable RLS on new tables
-- =========================================================
alter table public.intakes enable row level security;
alter table public.intake_raw_payloads enable row level security;
alter table public.intake_structured_versions enable row level security;
alter table public.intake_transcript_events enable row level security;
alter table public.intake_documents enable row level security;
alter table public.ai_runs enable row level security;
alter table public.ai_flags enable row level security;
alter table public.audit_log enable row level security;

-- =========================================================
-- public.intakes
-- =========================================================
drop policy if exists "intakes_select_firm_members" on public.intakes;
create policy "intakes_select_firm_members"
on public.intakes
for select
to authenticated
using (public.is_firm_member(firm_id));

drop policy if exists "intakes_insert_firm_editors" on public.intakes;
create policy "intakes_insert_firm_editors"
on public.intakes
for insert
to authenticated
with check (public.is_firm_editor(firm_id));

drop policy if exists "intakes_update_firm_editors" on public.intakes;
create policy "intakes_update_firm_editors"
on public.intakes
for update
to authenticated
using (public.is_firm_editor(firm_id))
with check (public.is_firm_editor(firm_id));

-- Optional: DELETE (admin only)
drop policy if exists "intakes_delete_firm_admins" on public.intakes;
create policy "intakes_delete_firm_admins"
on public.intakes
for delete
to authenticated
using (public.is_firm_admin(firm_id));

-- =========================================================
-- public.intake_raw_payloads (append-only)
-- =========================================================
drop policy if exists "intake_raw_select_firm_members" on public.intake_raw_payloads;
create policy "intake_raw_select_firm_members"
on public.intake_raw_payloads
for select
to authenticated
using (public.is_firm_member(firm_id));

drop policy if exists "intake_raw_insert_firm_editors" on public.intake_raw_payloads;
create policy "intake_raw_insert_firm_editors"
on public.intake_raw_payloads
for insert
to authenticated
with check (public.is_firm_editor(firm_id));

-- No update/delete policies = denied by default

-- =========================================================
-- public.intake_structured_versions
-- =========================================================
drop policy if exists "intake_struct_select_firm_members" on public.intake_structured_versions;
create policy "intake_struct_select_firm_members"
on public.intake_structured_versions
for select
to authenticated
using (public.is_firm_member(firm_id));

drop policy if exists "intake_struct_insert_firm_editors" on public.intake_structured_versions;
create policy "intake_struct_insert_firm_editors"
on public.intake_structured_versions
for insert
to authenticated
with check (public.is_firm_editor(firm_id));

drop policy if exists "intake_struct_update_firm_editors" on public.intake_structured_versions;
create policy "intake_struct_update_firm_editors"
on public.intake_structured_versions
for update
to authenticated
using (public.is_firm_editor(firm_id))
with check (public.is_firm_editor(firm_id));

-- Optional: DELETE (admin only)
drop policy if exists "intake_struct_delete_firm_admins" on public.intake_structured_versions;
create policy "intake_struct_delete_firm_admins"
on public.intake_structured_versions
for delete
to authenticated
using (public.is_firm_admin(firm_id));

-- =========================================================
-- public.intake_transcript_events (append-only)
-- =========================================================
drop policy if exists "intake_transcript_select_firm_members" on public.intake_transcript_events;
create policy "intake_transcript_select_firm_members"
on public.intake_transcript_events
for select
to authenticated
using (public.is_firm_member(firm_id));

drop policy if exists "intake_transcript_insert_firm_editors" on public.intake_transcript_events;
create policy "intake_transcript_insert_firm_editors"
on public.intake_transcript_events
for insert
to authenticated
with check (public.is_firm_editor(firm_id));

-- No update/delete policies = denied by default

-- =========================================================
-- public.intake_documents
-- =========================================================
drop policy if exists "intake_docs_select_firm_members" on public.intake_documents;
create policy "intake_docs_select_firm_members"
on public.intake_documents
for select
to authenticated
using (public.is_firm_member(firm_id));

drop policy if exists "intake_docs_insert_firm_editors" on public.intake_documents;
create policy "intake_docs_insert_firm_editors"
on public.intake_documents
for insert
to authenticated
with check (public.is_firm_editor(firm_id));

drop policy if exists "intake_docs_update_firm_editors" on public.intake_documents;
create policy "intake_docs_update_firm_editors"
on public.intake_documents
for update
to authenticated
using (public.is_firm_editor(firm_id))
with check (public.is_firm_editor(firm_id));

-- Optional: DELETE (admin only)
drop policy if exists "intake_docs_delete_firm_admins" on public.intake_documents;
create policy "intake_docs_delete_firm_admins"
on public.intake_documents
for delete
to authenticated
using (public.is_firm_admin(firm_id));

-- =========================================================
-- public.ai_runs
-- =========================================================
drop policy if exists "ai_runs_select_firm_members" on public.ai_runs;
create policy "ai_runs_select_firm_members"
on public.ai_runs
for select
to authenticated
using (public.is_firm_member(firm_id));

drop policy if exists "ai_runs_insert_firm_editors" on public.ai_runs;
create policy "ai_runs_insert_firm_editors"
on public.ai_runs
for insert
to authenticated
with check (public.is_firm_editor(firm_id));

drop policy if exists "ai_runs_update_firm_editors" on public.ai_runs;
create policy "ai_runs_update_firm_editors"
on public.ai_runs
for update
to authenticated
using (public.is_firm_editor(firm_id))
with check (public.is_firm_editor(firm_id));

-- No delete policy by default

-- =========================================================
-- public.ai_flags
-- =========================================================
drop policy if exists "ai_flags_select_firm_members" on public.ai_flags;
create policy "ai_flags_select_firm_members"
on public.ai_flags
for select
to authenticated
using (public.is_firm_member(firm_id));

drop policy if exists "ai_flags_insert_firm_editors" on public.ai_flags;
create policy "ai_flags_insert_firm_editors"
on public.ai_flags
for insert
to authenticated
with check (public.is_firm_editor(firm_id));

drop policy if exists "ai_flags_update_firm_editors" on public.ai_flags;
create policy "ai_flags_update_firm_editors"
on public.ai_flags
for update
to authenticated
using (public.is_firm_editor(firm_id))
with check (public.is_firm_editor(firm_id));

-- No delete policy by default

-- =========================================================
-- public.audit_log (recommended: trigger-only insert)
-- =========================================================
drop policy if exists "audit_select_firm_admins" on public.audit_log;
create policy "audit_select_firm_admins"
on public.audit_log
for select
to authenticated
using (public.is_firm_admin(firm_id));

-- Recommended: no insert/update/delete policies.
-- Audit writes should be performed by SECURITY DEFINER triggers (Sub-Phase 5).
```

---

# 3.3 Storage policy note (intake documents)

You already have a storage approach that infers `firm_id` from a UUID prefix in `storage.objects.name` and authorizes access via membership. For `intake_documents`, keep the exact same invariants:

* object path begins with `{firm_id}/...`
* `intake_documents.storage_path` matches `storage.objects.name`

In Sub-Phase 7 (implementation prompts) we’ll add the precise storage bucket policy mirroring your existing case-documents policy, but keyed off `intake_documents`.

---

## Proceeding

If you proceed, the next step is **Sub-Phase 4: Immutability model (post-submission lock)**, where I will specify:

* the exact “locked after submitted” rules table-by-table,
* trigger-based enforcement strategy (including what fields can still change, if any),
* and how that interacts with audit logging (append-only, court-defensible).
