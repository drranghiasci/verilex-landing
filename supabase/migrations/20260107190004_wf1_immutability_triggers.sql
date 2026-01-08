-- Workflow 1 intake immutability triggers

create or replace function public.is_intake_submitted(p_intake_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.intakes i
    where i.id = p_intake_id
      and i.submitted_at is not null
  );
$$;

create or replace function public.wf1_enforce_intake_immutability()
returns trigger
language plpgsql
as $$
declare
  target_intake_id uuid;
  is_submitted boolean;
begin
  if TG_OP not in ('UPDATE', 'DELETE') then
    return null;
  end if;

  if TG_TABLE_NAME = 'intakes' then
    target_intake_id := old.id;
  else
    target_intake_id := old.intake_id;
  end if;

  if TG_TABLE_NAME = 'intakes' and TG_OP = 'UPDATE' then
    if old.status = 'submitted' and new.status <> 'submitted' then
      raise exception 'INTAKE_IMMUTABLE';
    end if;

    if old.submitted_at is not null then
      if new.submitted_at is null then
        raise exception 'INTAKE_IMMUTABLE';
      end if;
      raise exception 'INTAKE_IMMUTABLE';
    end if;
  end if;

  is_submitted := public.is_intake_submitted(target_intake_id);

  if is_submitted then
    if TG_TABLE_NAME = 'ai_flags' and TG_OP = 'UPDATE' then
      if new.id is distinct from old.id
        or new.firm_id is distinct from old.firm_id
        or new.intake_id is distinct from old.intake_id
        or new.ai_run_id is distinct from old.ai_run_id
        or new.flag_key is distinct from old.flag_key
        or new.severity is distinct from old.severity
        or new.summary is distinct from old.summary
        or new.details is distinct from old.details
        or new.created_at is distinct from old.created_at then
        raise exception 'INTAKE_IMMUTABLE';
      end if;

      return new;
    end if;

    raise exception 'INTAKE_IMMUTABLE';
  end if;

  if TG_OP = 'UPDATE' then
    return new;
  end if;

  return old;
end;
$$;

do $$
begin
  if to_regclass('public.intakes') is not null then
    drop trigger if exists wf1_intakes_immutability on public.intakes;
    create trigger wf1_intakes_immutability
    before update or delete on public.intakes
    for each row
    execute function public.wf1_enforce_intake_immutability();
  end if;
end
$$;

do $$
begin
  if to_regclass('public.intake_messages') is not null then
    drop trigger if exists wf1_intake_messages_immutability on public.intake_messages;
    create trigger wf1_intake_messages_immutability
    before update or delete on public.intake_messages
    for each row
    execute function public.wf1_enforce_intake_immutability();
  end if;
end
$$;

do $$
begin
  if to_regclass('public.intake_extractions') is not null then
    drop trigger if exists wf1_intake_extractions_immutability on public.intake_extractions;
    create trigger wf1_intake_extractions_immutability
    before update or delete on public.intake_extractions
    for each row
    execute function public.wf1_enforce_intake_immutability();
  end if;
end
$$;

do $$
begin
  if to_regclass('public.ai_runs') is not null then
    drop trigger if exists wf1_ai_runs_immutability on public.ai_runs;
    create trigger wf1_ai_runs_immutability
    before update or delete on public.ai_runs
    for each row
    execute function public.wf1_enforce_intake_immutability();
  end if;
end
$$;

do $$
begin
  if to_regclass('public.ai_flags') is not null then
    drop trigger if exists wf1_ai_flags_immutability on public.ai_flags;
    create trigger wf1_ai_flags_immutability
    before update or delete on public.ai_flags
    for each row
    execute function public.wf1_enforce_intake_immutability();
  end if;
end
$$;

do $$
begin
  if to_regclass('public.intake_documents') is not null then
    drop trigger if exists wf1_intake_documents_immutability on public.intake_documents;
    create trigger wf1_intake_documents_immutability
    before update or delete on public.intake_documents
    for each row
    execute function public.wf1_enforce_intake_immutability();
  end if;
end
$$;
