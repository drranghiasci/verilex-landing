-- Workflow 1 audit triggers
-- NOTE: If an immutability trigger raises an exception, any audit insert in the same transaction will roll back.
-- Persistent logging of blocked attempts must happen at the application layer when catching INTAKE_IMMUTABLE.

create or replace function public.audit_write(
  p_firm_id uuid,
  p_event_type text,
  p_entity_table text,
  p_entity_id uuid,
  p_related_intake_id uuid,
  p_metadata jsonb,
  p_before jsonb,
  p_after jsonb
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_user_id uuid;
  v_actor_type text;
  v_request_id text;
  v_ip inet;
  v_user_agent text;
begin
  if auth.uid() is not null then
    v_actor_type := 'user';
    v_actor_user_id := auth.uid();
  else
    v_actor_type := 'system';
    v_actor_user_id := null;
  end if;

  v_request_id := nullif(current_setting('request.id', true), '');
  v_user_agent := nullif(current_setting('request.ua', true), '');
  v_ip := nullif(current_setting('request.ip', true), '')::inet;

  insert into public.audit_log (
    firm_id,
    actor_user_id,
    actor_role,
    actor_type,
    event_type,
    entity_table,
    entity_id,
    related_intake_id,
    request_id,
    ip,
    user_agent,
    metadata,
    before,
    after
  ) values (
    p_firm_id,
    v_actor_user_id,
    null,
    v_actor_type,
    p_event_type,
    p_entity_table,
    p_entity_id,
    p_related_intake_id,
    v_request_id,
    v_ip,
    v_user_agent,
    coalesce(p_metadata, '{}'::jsonb),
    p_before,
    p_after
  );
end;
$$;

create or replace function public.wf1_audit_intake_submission()
returns trigger
language plpgsql
as $$
begin
  if old.submitted_at is null and new.submitted_at is not null then
    perform public.audit_write(
      new.firm_id,
      'intake_submitted',
      'intakes',
      new.id,
      new.id,
      '{}'::jsonb,
      to_jsonb(old),
      to_jsonb(new)
    );
  end if;

  return new;
end;
$$;

create or replace function public.wf1_audit_ai_run_insert()
returns trigger
language plpgsql
as $$
begin
  perform public.audit_write(
    new.firm_id,
    'ai_run_created',
    'ai_runs',
    new.id,
    new.intake_id,
    '{}'::jsonb,
    null,
    to_jsonb(new)
  );

  return new;
end;
$$;

create or replace function public.wf1_audit_ai_flag_insert()
returns trigger
language plpgsql
as $$
begin
  perform public.audit_write(
    new.firm_id,
    'ai_flag_created',
    'ai_flags',
    new.id,
    new.intake_id,
    '{}'::jsonb,
    null,
    to_jsonb(new)
  );

  return new;
end;
$$;

create or replace function public.wf1_audit_case_insert_from_intake()
returns trigger
language plpgsql
as $$
begin
  if new.intake_id is not null then
    perform public.audit_write(
      new.firm_id,
      'case_created_from_intake',
      'cases',
      new.id,
      new.intake_id,
      '{}'::jsonb,
      null,
      to_jsonb(new)
    );
  end if;

  return new;
end;
$$;

do $$
begin
  if to_regclass('public.intakes') is not null then
    drop trigger if exists wf1_audit_intake_submitted on public.intakes;
    create trigger wf1_audit_intake_submitted
    after update on public.intakes
    for each row
    execute function public.wf1_audit_intake_submission();
  end if;
end
$$;

do $$
begin
  if to_regclass('public.ai_runs') is not null then
    drop trigger if exists wf1_audit_ai_runs_insert on public.ai_runs;
    create trigger wf1_audit_ai_runs_insert
    after insert on public.ai_runs
    for each row
    execute function public.wf1_audit_ai_run_insert();
  end if;
end
$$;

do $$
begin
  if to_regclass('public.ai_flags') is not null then
    drop trigger if exists wf1_audit_ai_flags_insert on public.ai_flags;
    create trigger wf1_audit_ai_flags_insert
    after insert on public.ai_flags
    for each row
    execute function public.wf1_audit_ai_flag_insert();
  end if;
end
$$;

do $$
declare
  has_cases boolean;
  has_intake_id boolean;
  has_firm_id boolean;
begin
  has_cases := (to_regclass('public.cases') is not null);
  if has_cases then
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'cases'
        and column_name = 'intake_id'
    ) into has_intake_id;

    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'cases'
        and column_name = 'firm_id'
    ) into has_firm_id;

    if has_intake_id and has_firm_id then
      drop trigger if exists wf1_audit_cases_insert on public.cases;
      create trigger wf1_audit_cases_insert
      after insert on public.cases
      for each row
      execute function public.wf1_audit_case_insert_from_intake();
    end if;
  end if;
end
$$;
