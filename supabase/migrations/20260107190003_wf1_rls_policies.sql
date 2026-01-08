-- Workflow 1 RLS for intake + AI tables
-- NOTE: If public.firm_members is missing and public.is_firm_member(uuid) does not exist,
-- policies below default to `false` (fail closed). Adapt the membership check to your schema if needed.

-- Create membership helper only if missing (and firm_members exists)
do $do$
begin
  if to_regprocedure('public.is_firm_member(uuid)') is null then
    if to_regclass('public.firm_members') is not null then
      execute $sql$
        create function public.is_firm_member(p_firm_id uuid)
        returns boolean
        language sql
        stable
        security definer
        set search_path = public, auth
        as $fn$
          select exists (
            select 1
            from public.firm_members fm
            where fm.firm_id = p_firm_id
              and fm.user_id = auth.uid()
          );
        $fn$;
      $sql$;

      execute 'grant execute on function public.is_firm_member(uuid) to authenticated';
    end if;
  end if;
end
$do$;

-- RLS for public.intakes
do $$
declare
  has_member boolean := (to_regprocedure('public.is_firm_member(uuid)') is not null);
begin
  if to_regclass('public.intakes') is not null then
    alter table public.intakes enable row level security;
    alter table public.intakes force row level security;

    drop policy if exists wf1_intakes_select on public.intakes;
    drop policy if exists wf1_intakes_insert on public.intakes;
    drop policy if exists wf1_intakes_update on public.intakes;

    if has_member then
      create policy wf1_intakes_select
      on public.intakes
      for select
      using (public.is_firm_member(firm_id));

      create policy wf1_intakes_insert
      on public.intakes
      for insert
      with check (public.is_firm_member(firm_id));

      create policy wf1_intakes_update
      on public.intakes
      for update
      using (public.is_firm_member(firm_id))
      with check (public.is_firm_member(firm_id));
    else
      create policy wf1_intakes_select
      on public.intakes
      for select
      using (false);

      create policy wf1_intakes_insert
      on public.intakes
      for insert
      with check (false);

      create policy wf1_intakes_update
      on public.intakes
      for update
      using (false)
      with check (false);
    end if;
  end if;
end
$$;

-- RLS for public.intake_messages
do $$
declare
  has_member boolean := (to_regprocedure('public.is_firm_member(uuid)') is not null);
begin
  if to_regclass('public.intake_messages') is not null then
    alter table public.intake_messages enable row level security;
    alter table public.intake_messages force row level security;

    drop policy if exists wf1_intake_messages_select on public.intake_messages;
    drop policy if exists wf1_intake_messages_insert on public.intake_messages;
    drop policy if exists wf1_intake_messages_update on public.intake_messages;

    if has_member then
      create policy wf1_intake_messages_select
      on public.intake_messages
      for select
      using (public.is_firm_member(firm_id));

      create policy wf1_intake_messages_insert
      on public.intake_messages
      for insert
      with check (public.is_firm_member(firm_id));

      create policy wf1_intake_messages_update
      on public.intake_messages
      for update
      using (public.is_firm_member(firm_id))
      with check (public.is_firm_member(firm_id));
    else
      create policy wf1_intake_messages_select
      on public.intake_messages
      for select
      using (false);

      create policy wf1_intake_messages_insert
      on public.intake_messages
      for insert
      with check (false);

      create policy wf1_intake_messages_update
      on public.intake_messages
      for update
      using (false)
      with check (false);
    end if;
  end if;
end
$$;

-- RLS for public.intake_extractions
do $$
declare
  has_member boolean := (to_regprocedure('public.is_firm_member(uuid)') is not null);
begin
  if to_regclass('public.intake_extractions') is not null then
    alter table public.intake_extractions enable row level security;
    alter table public.intake_extractions force row level security;

    drop policy if exists wf1_intake_extractions_select on public.intake_extractions;
    drop policy if exists wf1_intake_extractions_insert on public.intake_extractions;
    drop policy if exists wf1_intake_extractions_update on public.intake_extractions;

    if has_member then
      create policy wf1_intake_extractions_select
      on public.intake_extractions
      for select
      using (public.is_firm_member(firm_id));

      create policy wf1_intake_extractions_insert
      on public.intake_extractions
      for insert
      with check (public.is_firm_member(firm_id));

      create policy wf1_intake_extractions_update
      on public.intake_extractions
      for update
      using (public.is_firm_member(firm_id))
      with check (public.is_firm_member(firm_id));
    else
      create policy wf1_intake_extractions_select
      on public.intake_extractions
      for select
      using (false);

      create policy wf1_intake_extractions_insert
      on public.intake_extractions
      for insert
      with check (false);

      create policy wf1_intake_extractions_update
      on public.intake_extractions
      for update
      using (false)
      with check (false);
    end if;
  end if;
end
$$;

-- RLS for public.ai_runs
do $$
declare
  has_member boolean := (to_regprocedure('public.is_firm_member(uuid)') is not null);
begin
  if to_regclass('public.ai_runs') is not null then
    alter table public.ai_runs enable row level security;
    alter table public.ai_runs force row level security;

    drop policy if exists wf1_ai_runs_select on public.ai_runs;
    drop policy if exists wf1_ai_runs_insert on public.ai_runs;
    drop policy if exists wf1_ai_runs_update on public.ai_runs;

    if has_member then
      create policy wf1_ai_runs_select
      on public.ai_runs
      for select
      using (public.is_firm_member(firm_id));

      create policy wf1_ai_runs_insert
      on public.ai_runs
      for insert
      with check (public.is_firm_member(firm_id));

      create policy wf1_ai_runs_update
      on public.ai_runs
      for update
      using (public.is_firm_member(firm_id))
      with check (public.is_firm_member(firm_id));
    else
      create policy wf1_ai_runs_select
      on public.ai_runs
      for select
      using (false);

      create policy wf1_ai_runs_insert
      on public.ai_runs
      for insert
      with check (false);

      create policy wf1_ai_runs_update
      on public.ai_runs
      for update
      using (false)
      with check (false);
    end if;
  end if;
end
$$;

-- RLS for public.ai_flags
do $$
declare
  has_member boolean := (to_regprocedure('public.is_firm_member(uuid)') is not null);
begin
  if to_regclass('public.ai_flags') is not null then
    alter table public.ai_flags enable row level security;
    alter table public.ai_flags force row level security;

    drop policy if exists wf1_ai_flags_select on public.ai_flags;
    drop policy if exists wf1_ai_flags_insert on public.ai_flags;
    drop policy if exists wf1_ai_flags_update on public.ai_flags;

    if has_member then
      create policy wf1_ai_flags_select
      on public.ai_flags
      for select
      using (public.is_firm_member(firm_id));

      create policy wf1_ai_flags_insert
      on public.ai_flags
      for insert
      with check (public.is_firm_member(firm_id));

      create policy wf1_ai_flags_update
      on public.ai_flags
      for update
      using (public.is_firm_member(firm_id))
      with check (public.is_firm_member(firm_id));
    else
      create policy wf1_ai_flags_select
      on public.ai_flags
      for select
      using (false);

      create policy wf1_ai_flags_insert
      on public.ai_flags
      for insert
      with check (false);

      create policy wf1_ai_flags_update
      on public.ai_flags
      for update
      using (false)
      with check (false);
    end if;
  end if;
end
$$;

-- RLS for public.intake_documents
do $$
declare
  has_member boolean := (to_regprocedure('public.is_firm_member(uuid)') is not null);
begin
  if to_regclass('public.intake_documents') is not null then
    alter table public.intake_documents enable row level security;
    alter table public.intake_documents force row level security;

    drop policy if exists wf1_intake_documents_select on public.intake_documents;
    drop policy if exists wf1_intake_documents_insert on public.intake_documents;
    drop policy if exists wf1_intake_documents_update on public.intake_documents;

    if has_member then
      create policy wf1_intake_documents_select
      on public.intake_documents
      for select
      using (public.is_firm_member(firm_id));

      create policy wf1_intake_documents_insert
      on public.intake_documents
      for insert
      with check (public.is_firm_member(firm_id));

      create policy wf1_intake_documents_update
      on public.intake_documents
      for update
      using (public.is_firm_member(firm_id))
      with check (public.is_firm_member(firm_id));
    else
      create policy wf1_intake_documents_select
      on public.intake_documents
      for select
      using (false);

      create policy wf1_intake_documents_insert
      on public.intake_documents
      for insert
      with check (false);

      create policy wf1_intake_documents_update
      on public.intake_documents
      for update
      using (false)
      with check (false);
    end if;
  end if;
end
$$;

-- RLS for public.audit_log
do $$
declare
  has_member boolean := (to_regprocedure('public.is_firm_member(uuid)') is not null);
begin
  if to_regclass('public.audit_log') is not null then
    alter table public.audit_log enable row level security;
    alter table public.audit_log force row level security;

    drop policy if exists wf1_audit_log_select on public.audit_log;

    if has_member then
      create policy wf1_audit_log_select
      on public.audit_log
      for select
      using (public.is_firm_member(firm_id));
    else
      create policy wf1_audit_log_select
      on public.audit_log
      for select
      using (false);
    end if;
  end if;
end
$$;
