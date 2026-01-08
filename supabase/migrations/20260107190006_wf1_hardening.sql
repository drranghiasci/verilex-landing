-- Workflow 1 hardening: delete-deny triggers + defensive constraints

create or replace function public.wf1_deny_deletes()
returns trigger
language plpgsql
as $$
begin
  raise exception 'DELETE_NOT_ALLOWED';
  return null;
end;
$$;

do $$
begin
  if to_regclass('public.intakes') is not null then
    drop trigger if exists wf1_intakes_no_delete on public.intakes;
    create trigger wf1_intakes_no_delete
    before delete on public.intakes
    for each row
    execute function public.wf1_deny_deletes();
  end if;
end
$$;

do $$
begin
  if to_regclass('public.intake_messages') is not null then
    drop trigger if exists wf1_intake_messages_no_delete on public.intake_messages;
    create trigger wf1_intake_messages_no_delete
    before delete on public.intake_messages
    for each row
    execute function public.wf1_deny_deletes();
  end if;
end
$$;

do $$
begin
  if to_regclass('public.intake_extractions') is not null then
    drop trigger if exists wf1_intake_extractions_no_delete on public.intake_extractions;
    create trigger wf1_intake_extractions_no_delete
    before delete on public.intake_extractions
    for each row
    execute function public.wf1_deny_deletes();
  end if;
end
$$;

do $$
begin
  if to_regclass('public.ai_runs') is not null then
    drop trigger if exists wf1_ai_runs_no_delete on public.ai_runs;
    create trigger wf1_ai_runs_no_delete
    before delete on public.ai_runs
    for each row
    execute function public.wf1_deny_deletes();
  end if;
end
$$;

do $$
begin
  if to_regclass('public.ai_flags') is not null then
    drop trigger if exists wf1_ai_flags_no_delete on public.ai_flags;
    create trigger wf1_ai_flags_no_delete
    before delete on public.ai_flags
    for each row
    execute function public.wf1_deny_deletes();
  end if;
end
$$;

do $$
begin
  if to_regclass('public.intake_documents') is not null then
    drop trigger if exists wf1_intake_documents_no_delete on public.intake_documents;
    create trigger wf1_intake_documents_no_delete
    before delete on public.intake_documents
    for each row
    execute function public.wf1_deny_deletes();
  end if;
end
$$;

do $$
begin
  if to_regclass('public.intakes') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'wf1_intakes_status_check'
        and conrelid = 'public.intakes'::regclass
    ) then
      alter table public.intakes
        add constraint wf1_intakes_status_check
        check (status in ('draft', 'submitted'));
    end if;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.ai_flags') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'wf1_ai_flags_severity_check'
        and conrelid = 'public.ai_flags'::regclass
    ) then
      alter table public.ai_flags
        add constraint wf1_ai_flags_severity_check
        check (severity in ('low', 'medium', 'high'));
    end if;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.intake_messages') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'wf1_intake_messages_source_check'
        and conrelid = 'public.intake_messages'::regclass
    ) then
      alter table public.intake_messages
        add constraint wf1_intake_messages_source_check
        check (source in ('client', 'system', 'attorney'));
    end if;

    if not exists (
      select 1
      from pg_constraint
      where conname = 'wf1_intake_messages_channel_check'
        and conrelid = 'public.intake_messages'::regclass
    ) then
      alter table public.intake_messages
        add constraint wf1_intake_messages_channel_check
        check (channel in ('chat', 'form'));
    end if;
  end if;
end
$$;
