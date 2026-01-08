Date: 01/08/2026
Environment: Supabase/Prod
Passed: ALL

** Succeeded: What should have succeeded and did succeed.
7B-1 Create draft intake and capture ID
insert into public.intakes (firm_id, created_by, status, raw_payload)
values ('<FIRM_ID>'::uuid, '<USER_ID>'::uuid, 'draft', '{"test":"draft"}'::jsonb)
returning id;

7B-2 Add a message (should succeed)
insert into public.intake_messages (firm_id, intake_id, seq, source, channel, content)
values ('<FIRM_ID>'::uuid, '<INTAKE_ID>'::uuid, 1, 'client', 'chat', 'hello');

7B-3 Submit intake (should succeed + write audit_log intake_submitted)
update public.intakes
set submitted_at = now(), status = 'submitted'
where id = '<INTAKE_ID>'::uuid;

7B-7 Confirm audit_log entry for submission
select
  occurred_at,
  event_type,
  entity_table,
  entity_id,
  related_intake_id,
  actor_type,
  actor_user_id
from public.audit_log
where related_intake_id = '<INTAKE_ID>'::uuid
order by occurred_at desc
limit 20;

Optional 7B-8 Verify AI triggers + acknowledgement allowlist
Create an AI run
insert into public.ai_runs (firm_id, intake_id, run_kind, model_name, inputs, outputs, created_by)
values (
  '<FIRM_ID>'::uuid,
  '<INTAKE_ID>'::uuid,
  'flags',
  'test-model',
  '{"input":"x"}'::jsonb,
  '{"output":"y"}'::jsonb,
  '<USER_ID>'::uuid
)
returning id;

Create a flag
insert into public.ai_flags (firm_id, intake_id, ai_run_id, flag_key, severity, summary)
values (
  '<FIRM_ID>'::uuid,
  '<INTAKE_ID>'::uuid,
  null,
  'jurisdiction_risk',
  'high',
  'test'
)
returning id;

Acknowledge the flag
update public.ai_flags
set is_acknowledged = true,
    acknowledged_by = '<USER_ID>'::uuid,
    acknowledged_at = now()
where intake_id = '<INTAKE_ID>'::uuid;

** Failed: What should have failed and did fail.
7B-4 Attempt forbidden update on intake (must FAIL with INTAKE_IMMUTABLE)
update public.intakes
set client_display_name = 'should fail'
where id = '<INTAKE_ID>'::uuid;

7B-5 Attempt forbidden update on message (must FAIL with INTAKE_IMMUTABLE)
update public.intake_messages
set content = 'should fail'
where intake_id = '<INTAKE_ID>'::uuid
  and seq = 1;

7B-6 Attempt forbidden delete (must FAIL with DELETE_NOT_ALLOWED)
delete from public.intake_messages
where intake_id = '<INTAKE_ID>'::uuid
  and seq = 1;

Attempt to change summary post-submission (must FAIL with INTAKE_IMMUTABLE)
update public.ai_flags
set summary = 'should fail'
where intake_id = '<INTAKE_ID>'::uuid;