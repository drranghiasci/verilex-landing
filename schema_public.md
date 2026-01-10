--
-- PostgreSQL database dump
--

\restrict SLa8litcvEKI86I3j4EwFk1Edv4FwxKNx7N5sjRuf1e2uLiyUn8EkKKSIAc6U77

-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.15 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: firm_intake_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.firm_intake_status AS ENUM (
    'new',
    'reviewing',
    'approved',
    'rejected'
);


--
-- Name: firm_member_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.firm_member_role AS ENUM (
    'admin',
    'attorney',
    'staff'
);


--
-- Name: audit_write(uuid, text, text, uuid, uuid, jsonb, jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.audit_write(p_firm_id uuid, p_event_type text, p_entity_table text, p_entity_id uuid, p_related_intake_id uuid, p_metadata jsonb, p_before jsonb, p_after jsonb) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $$
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


--
-- Name: call_confirmation_email(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.call_confirmation_email() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  response json;
begin
  -- Make a POST request to the deployed Edge Function
  select into response
    http_post(
      'https://nlyuskhbjpeiebtfmbcb.functions.supabase.co/send-confirmation-email',
      json_build_object('email', new.email)::text,
      json_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5seXVza2hianBlaWVidGZtYmNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNzYyNjcsImV4cCI6MjA1ODk1MjI2N30.-88rXdVH4wq642DtUlwV8PUGjPjUCOy3mXhCORRM8bw'
      )
    );

  return new;
end;
$$;


--
-- Name: claim_firm_membership(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.claim_firm_membership() RETURNS TABLE(out_firm_id uuid, out_role text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_invite_id uuid;
  v_firm_id uuid;
  v_role public.firm_member_role;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if v_email = '' then
    raise exception 'Missing email claim in JWT';
  end if;

  select fi.id, fi.firm_id, fi.role
    into v_invite_id, v_firm_id, v_role
  from public.firm_invites fi
  where lower(fi.email) = v_email
    and fi.status = 'pending'
  order by fi.created_at desc
  limit 1;

  if v_invite_id is null then
    raise exception 'No pending invite found for %', v_email;
  end if;

  insert into public.firm_members (firm_id, user_id, role)
  values (v_firm_id, v_uid, v_role)
  on conflict (firm_id, user_id) do nothing;

  update public.firm_invites fi
    set status = 'accepted',
        accepted_at = coalesce(fi.accepted_at, now())
  where fi.id = v_invite_id;

  return query
  select v_firm_id, v_role::text;
end;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, email, created_at, updated_at)
  values (new.id, new.email, now(), now())
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;


--
-- Name: is_firm_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_firm_admin(check_firm_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.firm_members
    where firm_id = check_firm_id
      and user_id = auth.uid()
      and role = 'admin'
  );
$$;


--
-- Name: is_firm_editor(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_firm_editor(check_firm_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.firm_members
    where firm_id = check_firm_id
      and user_id = auth.uid()
      and role in ('admin', 'attorney')
  );
$$;


--
-- Name: is_firm_member(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_firm_member(check_firm_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (
    select 1
    from public.firm_members
    where firm_id = check_firm_id
      and user_id = auth.uid()
  );
$$;


--
-- Name: is_intake_submitted(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_intake_submitted(p_intake_id uuid) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  select exists (
    select 1
    from public.intakes i
    where i.id = p_intake_id
      and i.submitted_at is not null
  );
$$;


--
-- Name: redeem_invite(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.redeem_invite(invite_code text, new_email text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  profile_match record;
begin
  -- 1. Check if there's a matching profile with the given code and email
  select * into profile_match
  from profiles
  where access_code = invite_code and email = new_email;

  if profile_match is null then
    raise exception 'Invalid or already-used access code.';
  end if;

  -- 2. Update the profile to link to the current user
  update profiles
  set
    id = auth.uid(),            -- link to the logged-in Supabase user
    beta_access = true,
    access_code = null          -- invalidate code so it can’t be reused
  where code = invite_code and email = new_email;
end;
$$;


--
-- Name: set_case_tasks_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_case_tasks_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- Name: storage_firm_id_from_path(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.storage_firm_id_from_path(path text) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
  select case
    when split_part(path, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then split_part(path, '/', 1)::uuid
    else null
  end;
$_$;


--
-- Name: wf1_audit_ai_flag_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wf1_audit_ai_flag_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: wf1_audit_ai_run_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wf1_audit_ai_run_insert() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: wf1_audit_case_insert_from_intake(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wf1_audit_case_insert_from_intake() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: wf1_audit_intake_submission(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wf1_audit_intake_submission() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: wf1_audit_log_block_mutations(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wf1_audit_log_block_mutations() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  raise exception 'AUDIT_LOG_APPEND_ONLY';
  return null;
end;
$$;


--
-- Name: wf1_deny_deletes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wf1_deny_deletes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  raise exception 'DELETE_NOT_ALLOWED';
  return null;
end;
$$;


--
-- Name: wf1_enforce_intake_immutability(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wf1_enforce_intake_immutability() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: wf1_set_intakes_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.wf1_set_intakes_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    firm_id uuid NOT NULL,
    intake_id uuid NOT NULL,
    ai_run_id uuid,
    flag_key text NOT NULL,
    severity text NOT NULL,
    summary text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_acknowledged boolean DEFAULT false NOT NULL,
    acknowledged_by uuid,
    acknowledged_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wf1_ai_flags_severity_check CHECK ((severity = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])))
);

ALTER TABLE ONLY public.ai_flags FORCE ROW LEVEL SECURITY;


--
-- Name: ai_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    firm_id uuid NOT NULL,
    intake_id uuid,
    run_kind text NOT NULL,
    model_name text,
    prompt_hash text,
    inputs jsonb DEFAULT '{}'::jsonb NOT NULL,
    outputs jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'completed'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.ai_runs FORCE ROW LEVEL SECURITY;


--
-- Name: audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    firm_id uuid NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    actor_user_id uuid,
    actor_role text,
    actor_type text NOT NULL,
    event_type text NOT NULL,
    entity_table text NOT NULL,
    entity_id uuid,
    related_intake_id uuid,
    request_id text,
    ip inet,
    user_agent text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    before jsonb,
    after jsonb
);

ALTER TABLE ONLY public.audit_log FORCE ROW LEVEL SECURITY;


--
-- Name: case_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_activity (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    firm_id uuid NOT NULL,
    case_id uuid NOT NULL,
    actor_user_id uuid,
    event_type text NOT NULL,
    message text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: case_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    firm_id uuid NOT NULL,
    case_id uuid NOT NULL,
    storage_path text NOT NULL,
    filename text NOT NULL,
    mime_type text,
    size_bytes bigint,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    display_name text,
    doc_type text DEFAULT 'other'::text NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: case_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    firm_id uuid NOT NULL,
    case_id uuid NOT NULL,
    title text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    due_date date,
    assigned_user_id uuid,
    created_by uuid,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    ribbon_color text,
    due_time time without time zone,
    due_at timestamp with time zone,
    CONSTRAINT case_tasks_ribbon_color_check CHECK (((ribbon_color IS NULL) OR (ribbon_color = ANY (ARRAY['red'::text, 'orange'::text, 'yellow'::text, 'green'::text, 'blue'::text, 'pink'::text, 'purple'::text]))))
);


--
-- Name: cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    firm_id uuid NOT NULL,
    client_name text NOT NULL,
    matter_type text DEFAULT 'divorce'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    intake_summary text,
    last_activity_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    internal_notes text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    title text,
    client_first_name text,
    client_last_name text,
    client_email text,
    client_phone text,
    state text,
    county text,
    court_name text,
    case_number text
);


--
-- Name: firm_intakes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.firm_intakes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status public.firm_intake_status DEFAULT 'new'::public.firm_intake_status NOT NULL,
    firm_name text NOT NULL,
    firm_website text,
    office_state text,
    office_county text,
    practice_focus text[] DEFAULT '{}'::text[] NOT NULL,
    monthly_new_matters text,
    admin_name text NOT NULL,
    admin_email text NOT NULL,
    admin_phone text,
    attorney_users text,
    staff_users text,
    additional_user_emails text,
    billing_email text,
    case_management_system text,
    case_management_system_other text,
    data_migration_needed text,
    notes text,
    approved_firm_id uuid,
    approved_at timestamp with time zone,
    team_size_estimate text,
    CONSTRAINT firm_intakes_team_size_estimate_check CHECK (((team_size_estimate IS NULL) OR (team_size_estimate = ANY (ARRAY['1'::text, '2-5'::text, '6-15'::text, '16-50'::text, '50+'::text]))))
);


--
-- Name: firm_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.firm_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    firm_id uuid NOT NULL,
    email text NOT NULL,
    role public.firm_member_role DEFAULT 'staff'::public.firm_member_role NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    accepted_at timestamp with time zone
);


--
-- Name: firm_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.firm_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    firm_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role public.firm_member_role DEFAULT 'staff'::public.firm_member_role NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: firms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.firms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    website text,
    office_state text,
    office_county text,
    practice_focus text[] DEFAULT '{}'::text[] NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    plan text DEFAULT 'free'::text NOT NULL,
    CONSTRAINT firms_plan_check CHECK ((plan = ANY (ARRAY['free'::text, 'pro'::text, 'enterprise'::text])))
);


--
-- Name: intake_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intake_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    firm_id uuid NOT NULL,
    intake_id uuid NOT NULL,
    storage_object_path text NOT NULL,
    document_type text,
    classification jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.intake_documents FORCE ROW LEVEL SECURITY;


--
-- Name: intake_extractions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intake_extractions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    firm_id uuid NOT NULL,
    intake_id uuid NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    extracted_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    schema_version text DEFAULT 'v1'::text NOT NULL,
    confidence jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.intake_extractions FORCE ROW LEVEL SECURITY;


--
-- Name: intake_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intake_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    firm_id uuid NOT NULL,
    intake_id uuid NOT NULL,
    seq integer NOT NULL,
    source text NOT NULL,
    channel text NOT NULL,
    content text NOT NULL,
    content_structured jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wf1_intake_messages_channel_check CHECK ((channel = ANY (ARRAY['chat'::text, 'form'::text]))),
    CONSTRAINT wf1_intake_messages_source_check CHECK ((source = ANY (ARRAY['client'::text, 'system'::text, 'attorney'::text])))
);

ALTER TABLE ONLY public.intake_messages FORCE ROW LEVEL SECURITY;


--
-- Name: intakes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.intakes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    firm_id uuid NOT NULL,
    created_by uuid,
    status text DEFAULT 'draft'::text NOT NULL,
    submitted_at timestamp with time zone,
    intake_channel text,
    matter_type text,
    urgency_level text,
    language_preference text,
    raw_payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    client_display_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wf1_intakes_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text])))
);

ALTER TABLE ONLY public.intakes FORCE ROW LEVEL SECURITY;


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    full_name text,
    avatar_url text,
    timezone text
);


--
-- Name: ai_flags ai_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_flags
    ADD CONSTRAINT ai_flags_pkey PRIMARY KEY (id);


--
-- Name: ai_runs ai_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_runs
    ADD CONSTRAINT ai_runs_pkey PRIMARY KEY (id);


--
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);


--
-- Name: case_activity case_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_activity
    ADD CONSTRAINT case_activity_pkey PRIMARY KEY (id);


--
-- Name: case_documents case_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_documents
    ADD CONSTRAINT case_documents_pkey PRIMARY KEY (id);


--
-- Name: case_tasks case_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_tasks
    ADD CONSTRAINT case_tasks_pkey PRIMARY KEY (id);


--
-- Name: cases cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_pkey PRIMARY KEY (id);


--
-- Name: firm_intakes firm_intakes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.firm_intakes
    ADD CONSTRAINT firm_intakes_pkey PRIMARY KEY (id);


--
-- Name: firm_invites firm_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.firm_invites
    ADD CONSTRAINT firm_invites_pkey PRIMARY KEY (id);


--
-- Name: firm_members firm_members_firm_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.firm_members
    ADD CONSTRAINT firm_members_firm_id_user_id_key UNIQUE (firm_id, user_id);


--
-- Name: firm_members firm_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.firm_members
    ADD CONSTRAINT firm_members_pkey PRIMARY KEY (id);


--
-- Name: firms firms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.firms
    ADD CONSTRAINT firms_pkey PRIMARY KEY (id);


--
-- Name: intake_documents intake_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_documents
    ADD CONSTRAINT intake_documents_pkey PRIMARY KEY (id);


--
-- Name: intake_extractions intake_extractions_intake_id_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_extractions
    ADD CONSTRAINT intake_extractions_intake_id_version_key UNIQUE (intake_id, version);


--
-- Name: intake_extractions intake_extractions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_extractions
    ADD CONSTRAINT intake_extractions_pkey PRIMARY KEY (id);


--
-- Name: intake_messages intake_messages_intake_id_seq_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_messages
    ADD CONSTRAINT intake_messages_intake_id_seq_key UNIQUE (intake_id, seq);


--
-- Name: intake_messages intake_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_messages
    ADD CONSTRAINT intake_messages_pkey PRIMARY KEY (id);


--
-- Name: intakes intakes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intakes
    ADD CONSTRAINT intakes_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: idx_ai_flags_firm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_flags_firm_id ON public.ai_flags USING btree (firm_id);


--
-- Name: idx_ai_flags_intake_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_flags_intake_id ON public.ai_flags USING btree (intake_id);


--
-- Name: idx_ai_runs_firm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_runs_firm_id ON public.ai_runs USING btree (firm_id);


--
-- Name: idx_ai_runs_intake_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_runs_intake_id ON public.ai_runs USING btree (intake_id);


--
-- Name: idx_audit_log_entity_table_entity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_entity_table_entity_id ON public.audit_log USING btree (entity_table, entity_id);


--
-- Name: idx_audit_log_firm_id_occurred_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_firm_id_occurred_at ON public.audit_log USING btree (firm_id, occurred_at DESC);


--
-- Name: idx_audit_log_related_intake_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_log_related_intake_id ON public.audit_log USING btree (related_intake_id);


--
-- Name: idx_case_activity_case_id_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_activity_case_id_created_at ON public.case_activity USING btree (case_id, created_at DESC);


--
-- Name: idx_case_activity_firm_id_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_activity_firm_id_created_at ON public.case_activity USING btree (firm_id, created_at DESC);


--
-- Name: idx_case_documents_case_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_documents_case_deleted ON public.case_documents USING btree (case_id, deleted_at);


--
-- Name: idx_case_documents_case_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_documents_case_id ON public.case_documents USING btree (case_id);


--
-- Name: idx_case_documents_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_documents_created_at ON public.case_documents USING btree (created_at DESC);


--
-- Name: idx_case_documents_firm_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_documents_firm_deleted ON public.case_documents USING btree (firm_id, deleted_at);


--
-- Name: idx_case_documents_firm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_documents_firm_id ON public.case_documents USING btree (firm_id);


--
-- Name: idx_case_tasks_case_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_tasks_case_id ON public.case_tasks USING btree (case_id);


--
-- Name: idx_case_tasks_case_status_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_tasks_case_status_due ON public.case_tasks USING btree (case_id, status, due_date);


--
-- Name: idx_case_tasks_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_tasks_due_date ON public.case_tasks USING btree (due_date);


--
-- Name: idx_case_tasks_due_date_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_tasks_due_date_time ON public.case_tasks USING btree (due_date, due_time);


--
-- Name: idx_case_tasks_firm_due_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_tasks_firm_due_at ON public.case_tasks USING btree (firm_id, due_at);


--
-- Name: idx_case_tasks_firm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_tasks_firm_id ON public.case_tasks USING btree (firm_id);


--
-- Name: idx_case_tasks_firm_status_due; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_tasks_firm_status_due ON public.case_tasks USING btree (firm_id, status, due_date);


--
-- Name: idx_cases_firm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cases_firm_id ON public.cases USING btree (firm_id);


--
-- Name: idx_cases_last_activity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cases_last_activity ON public.cases USING btree (last_activity_at DESC);


--
-- Name: idx_firm_intakes_status_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_firm_intakes_status_created_at ON public.firm_intakes USING btree (status, created_at DESC);


--
-- Name: idx_firm_invites_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_firm_invites_email ON public.firm_invites USING btree (email);


--
-- Name: idx_firm_invites_firm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_firm_invites_firm_id ON public.firm_invites USING btree (firm_id);


--
-- Name: idx_firm_members_firm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_firm_members_firm_id ON public.firm_members USING btree (firm_id);


--
-- Name: idx_firm_members_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_firm_members_user_id ON public.firm_members USING btree (user_id);


--
-- Name: idx_intake_documents_firm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intake_documents_firm_id ON public.intake_documents USING btree (firm_id);


--
-- Name: idx_intake_documents_intake_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intake_documents_intake_id ON public.intake_documents USING btree (intake_id);


--
-- Name: idx_intake_extractions_firm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intake_extractions_firm_id ON public.intake_extractions USING btree (firm_id);


--
-- Name: idx_intake_extractions_intake_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intake_extractions_intake_id ON public.intake_extractions USING btree (intake_id);


--
-- Name: idx_intake_messages_firm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intake_messages_firm_id ON public.intake_messages USING btree (firm_id);


--
-- Name: idx_intake_messages_intake_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intake_messages_intake_id ON public.intake_messages USING btree (intake_id);


--
-- Name: idx_intakes_firm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_intakes_firm_id ON public.intakes USING btree (firm_id);


--
-- Name: idx_profiles_full_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_full_name ON public.profiles USING btree (full_name);


--
-- Name: uniq_firm_invites_firm_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_firm_invites_firm_email ON public.firm_invites USING btree (firm_id, email);


--
-- Name: case_tasks case_tasks_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER case_tasks_set_updated_at BEFORE UPDATE ON public.case_tasks FOR EACH ROW EXECUTE FUNCTION public.set_case_tasks_updated_at();


--
-- Name: cases cases_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER cases_set_updated_at BEFORE UPDATE ON public.cases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: firm_intakes trg_firm_intakes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_firm_intakes_updated_at BEFORE UPDATE ON public.firm_intakes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: firm_members trg_firm_members_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_firm_members_updated_at BEFORE UPDATE ON public.firm_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: firms trg_firms_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_firms_updated_at BEFORE UPDATE ON public.firms FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: ai_flags wf1_ai_flags_immutability; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wf1_ai_flags_immutability BEFORE DELETE OR UPDATE ON public.ai_flags FOR EACH ROW EXECUTE FUNCTION public.wf1_enforce_intake_immutability();


--
-- Name: ai_flags wf1_ai_flags_no_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wf1_ai_flags_no_delete BEFORE DELETE ON public.ai_flags FOR EACH ROW EXECUTE FUNCTION public.wf1_deny_deletes();


--
-- Name: ai_runs wf1_ai_runs_immutability; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wf1_ai_runs_immutability BEFORE DELETE OR UPDATE ON public.ai_runs FOR EACH ROW EXECUTE FUNCTION public.wf1_enforce_intake_immutability();


--
-- Name: ai_runs wf1_ai_runs_no_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wf1_ai_runs_no_delete BEFORE DELETE ON public.ai_runs FOR EACH ROW EXECUTE FUNCTION public.wf1_deny_deletes();


--
-- Name: ai_flags wf1_audit_ai_flags_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wf1_audit_ai_flags_insert AFTER INSERT ON public.ai_flags FOR EACH ROW EXECUTE FUNCTION public.wf1_audit_ai_flag_insert();


--
-- Name: ai_runs wf1_audit_ai_runs_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wf1_audit_ai_runs_insert AFTER INSERT ON public.ai_runs FOR EACH ROW EXECUTE FUNCTION public.wf1_audit_ai_run_insert();


--
-- Name: intakes wf1_audit_intake_submitted; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wf1_audit_intake_submitted AFTER UPDATE ON public.intakes FOR EACH ROW EXECUTE FUNCTION public.wf1_audit_intake_submission();


--
-- Name: audit_log wf1_audit_log_no_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wf1_audit_log_no_delete BEFORE DELETE ON public.audit_log FOR EACH ROW EXECUTE FUNCTION public.wf1_audit_log_block_mutations();


--
-- Name: audit_log wf1_audit_log_no_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wf1_audit_log_no_update BEFORE UPDATE ON public.audit_log FOR EACH ROW EXECUTE FUNCTION public.wf1_audit_log_block_mutations();


--
-- Name: intake_documents wf1_intake_documents_immutability; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wf1_intake_documents_immutability BEFORE DELETE OR UPDATE ON public.intake_documents FOR EACH ROW EXECUTE FUNCTION public.wf1_enforce_intake_immutability();


--
-- Name: intake_documents wf1_intake_documents_no_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wf1_intake_documents_no_delete BEFORE DELETE ON public.intake_documents FOR EACH ROW EXECUTE FUNCTION public.wf1_deny_deletes();


--
-- Name: intake_extractions wf1_intake_extractions_immutability; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wf1_intake_extractions_immutability BEFORE DELETE OR UPDATE ON public.intake_extractions FOR EACH ROW EXECUTE FUNCTION public.wf1_enforce_intake_immutability();


--
-- Name: intake_extractions wf1_intake_extractions_no_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wf1_intake_extractions_no_delete BEFORE DELETE ON public.intake_extractions FOR EACH ROW EXECUTE FUNCTION public.wf1_deny_deletes();


--
-- Name: intake_messages wf1_intake_messages_immutability; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wf1_intake_messages_immutability BEFORE DELETE OR UPDATE ON public.intake_messages FOR EACH ROW EXECUTE FUNCTION public.wf1_enforce_intake_immutability();


--
-- Name: intake_messages wf1_intake_messages_no_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wf1_intake_messages_no_delete BEFORE DELETE ON public.intake_messages FOR EACH ROW EXECUTE FUNCTION public.wf1_deny_deletes();


--
-- Name: intakes wf1_intakes_immutability; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wf1_intakes_immutability BEFORE DELETE OR UPDATE ON public.intakes FOR EACH ROW EXECUTE FUNCTION public.wf1_enforce_intake_immutability();


--
-- Name: intakes wf1_intakes_no_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wf1_intakes_no_delete BEFORE DELETE ON public.intakes FOR EACH ROW EXECUTE FUNCTION public.wf1_deny_deletes();


--
-- Name: intakes wf1_set_intakes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER wf1_set_intakes_updated_at BEFORE UPDATE ON public.intakes FOR EACH ROW EXECUTE FUNCTION public.wf1_set_intakes_updated_at();


--
-- Name: ai_flags ai_flags_acknowledged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_flags
    ADD CONSTRAINT ai_flags_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES auth.users(id);


--
-- Name: ai_flags ai_flags_ai_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_flags
    ADD CONSTRAINT ai_flags_ai_run_id_fkey FOREIGN KEY (ai_run_id) REFERENCES public.ai_runs(id);


--
-- Name: ai_flags ai_flags_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_flags
    ADD CONSTRAINT ai_flags_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id);


--
-- Name: ai_flags ai_flags_intake_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_flags
    ADD CONSTRAINT ai_flags_intake_id_fkey FOREIGN KEY (intake_id) REFERENCES public.intakes(id);


--
-- Name: ai_runs ai_runs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_runs
    ADD CONSTRAINT ai_runs_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: ai_runs ai_runs_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_runs
    ADD CONSTRAINT ai_runs_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id);


--
-- Name: ai_runs ai_runs_intake_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_runs
    ADD CONSTRAINT ai_runs_intake_id_fkey FOREIGN KEY (intake_id) REFERENCES public.intakes(id);


--
-- Name: case_activity case_activity_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_activity
    ADD CONSTRAINT case_activity_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;


--
-- Name: case_documents case_documents_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_documents
    ADD CONSTRAINT case_documents_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;


--
-- Name: case_documents case_documents_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_documents
    ADD CONSTRAINT case_documents_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE;


--
-- Name: case_tasks case_tasks_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_tasks
    ADD CONSTRAINT case_tasks_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;


--
-- Name: cases cases_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cases
    ADD CONSTRAINT cases_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE;


--
-- Name: firm_intakes firm_intakes_approved_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.firm_intakes
    ADD CONSTRAINT firm_intakes_approved_firm_id_fkey FOREIGN KEY (approved_firm_id) REFERENCES public.firms(id);


--
-- Name: firm_invites firm_invites_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.firm_invites
    ADD CONSTRAINT firm_invites_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE;


--
-- Name: firm_members firm_members_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.firm_members
    ADD CONSTRAINT firm_members_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE;


--
-- Name: firm_members firm_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.firm_members
    ADD CONSTRAINT firm_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: intake_documents intake_documents_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_documents
    ADD CONSTRAINT intake_documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: intake_documents intake_documents_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_documents
    ADD CONSTRAINT intake_documents_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id);


--
-- Name: intake_documents intake_documents_intake_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_documents
    ADD CONSTRAINT intake_documents_intake_id_fkey FOREIGN KEY (intake_id) REFERENCES public.intakes(id);


--
-- Name: intake_extractions intake_extractions_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_extractions
    ADD CONSTRAINT intake_extractions_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id);


--
-- Name: intake_extractions intake_extractions_intake_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_extractions
    ADD CONSTRAINT intake_extractions_intake_id_fkey FOREIGN KEY (intake_id) REFERENCES public.intakes(id);


--
-- Name: intake_messages intake_messages_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_messages
    ADD CONSTRAINT intake_messages_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id);


--
-- Name: intake_messages intake_messages_intake_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intake_messages
    ADD CONSTRAINT intake_messages_intake_id_fkey FOREIGN KEY (intake_id) REFERENCES public.intakes(id);


--
-- Name: intakes intakes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intakes
    ADD CONSTRAINT intakes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: intakes intakes_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.intakes
    ADD CONSTRAINT intakes_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.firms(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ai_flags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_flags ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: case_activity; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.case_activity ENABLE ROW LEVEL SECURITY;

--
-- Name: case_activity case_activity_insert_firm_scoped; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY case_activity_insert_firm_scoped ON public.case_activity FOR INSERT TO authenticated WITH CHECK (public.is_firm_member(firm_id));


--
-- Name: case_activity case_activity_select_firm_scoped; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY case_activity_select_firm_scoped ON public.case_activity FOR SELECT TO authenticated USING (public.is_firm_member(firm_id));


--
-- Name: case_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.case_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: case_documents case_documents_insert_firm_scoped; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY case_documents_insert_firm_scoped ON public.case_documents FOR INSERT TO authenticated WITH CHECK (public.is_firm_editor(firm_id));


--
-- Name: case_documents case_documents_select_firm_scoped; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY case_documents_select_firm_scoped ON public.case_documents FOR SELECT TO authenticated USING (public.is_firm_member(firm_id));


--
-- Name: case_documents case_documents_update_firm_scoped; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY case_documents_update_firm_scoped ON public.case_documents FOR UPDATE TO authenticated USING (public.is_firm_editor(firm_id)) WITH CHECK (public.is_firm_editor(firm_id));


--
-- Name: case_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.case_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: case_tasks case_tasks_insert_firm_editor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY case_tasks_insert_firm_editor ON public.case_tasks FOR INSERT TO authenticated WITH CHECK (public.is_firm_editor(firm_id));


--
-- Name: case_tasks case_tasks_insert_firm_scoped; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY case_tasks_insert_firm_scoped ON public.case_tasks FOR INSERT TO authenticated WITH CHECK (public.is_firm_editor(firm_id));


--
-- Name: case_tasks case_tasks_select_firm_member; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY case_tasks_select_firm_member ON public.case_tasks FOR SELECT TO authenticated USING (public.is_firm_member(firm_id));


--
-- Name: case_tasks case_tasks_select_firm_scoped; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY case_tasks_select_firm_scoped ON public.case_tasks FOR SELECT TO authenticated USING (public.is_firm_member(firm_id));


--
-- Name: case_tasks case_tasks_update_firm_editor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY case_tasks_update_firm_editor ON public.case_tasks FOR UPDATE TO authenticated USING (public.is_firm_editor(firm_id)) WITH CHECK (public.is_firm_editor(firm_id));


--
-- Name: case_tasks case_tasks_update_firm_scoped; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY case_tasks_update_firm_scoped ON public.case_tasks FOR UPDATE TO authenticated USING (public.is_firm_editor(firm_id)) WITH CHECK (public.is_firm_editor(firm_id));


--
-- Name: cases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

--
-- Name: cases cases_insert_firm_scoped; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cases_insert_firm_scoped ON public.cases FOR INSERT TO authenticated WITH CHECK (public.is_firm_editor(firm_id));


--
-- Name: cases cases_select_firm_scoped; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cases_select_firm_scoped ON public.cases FOR SELECT TO authenticated USING (public.is_firm_member(firm_id));


--
-- Name: cases cases_update_firm_scoped; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cases_update_firm_scoped ON public.cases FOR UPDATE TO authenticated USING (public.is_firm_editor(firm_id)) WITH CHECK (public.is_firm_editor(firm_id));


--
-- Name: firm_intakes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.firm_intakes ENABLE ROW LEVEL SECURITY;

--
-- Name: firm_intakes firm_intakes_insert_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY firm_intakes_insert_public ON public.firm_intakes FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: firm_invites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.firm_invites ENABLE ROW LEVEL SECURITY;

--
-- Name: firm_invites firm_invites_accept_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY firm_invites_accept_own ON public.firm_invites FOR UPDATE TO authenticated USING (((email = (auth.jwt() ->> 'email'::text)) AND (status = 'pending'::text) AND (accepted_at IS NULL))) WITH CHECK (((email = (auth.jwt() ->> 'email'::text)) AND (status = 'accepted'::text) AND (accepted_at IS NOT NULL)));


--
-- Name: firm_invites firm_invites_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY firm_invites_select_own ON public.firm_invites FOR SELECT TO authenticated USING ((email = (auth.jwt() ->> 'email'::text)));


--
-- Name: firm_invites firm_invites_select_own_email; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY firm_invites_select_own_email ON public.firm_invites FOR SELECT TO authenticated USING ((lower(email) = lower(COALESCE((auth.jwt() ->> 'email'::text), ''::text))));


--
-- Name: firm_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.firm_members ENABLE ROW LEVEL SECURITY;

--
-- Name: firm_members firm_members_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY firm_members_select_admin ON public.firm_members FOR SELECT TO authenticated USING (public.is_firm_admin(firm_id));


--
-- Name: firm_members firm_members_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY firm_members_select_own ON public.firm_members FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: firm_members firm_members_select_own_row; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY firm_members_select_own_row ON public.firm_members FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: firm_members firm_members_select_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY firm_members_select_self ON public.firm_members FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: firms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;

--
-- Name: firms firms_select_firm_scoped; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY firms_select_firm_scoped ON public.firms FOR SELECT TO authenticated USING (public.is_firm_member(id));


--
-- Name: firms firms_select_if_member; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY firms_select_if_member ON public.firms FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.firm_members fm
  WHERE ((fm.firm_id = firms.id) AND (fm.user_id = auth.uid()) AND (fm.is_active = true)))));


--
-- Name: firms firms_update_admin_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY firms_update_admin_only ON public.firms FOR UPDATE TO authenticated USING (public.is_firm_admin(id)) WITH CHECK (public.is_firm_admin(id));


--
-- Name: intake_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.intake_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: intake_extractions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.intake_extractions ENABLE ROW LEVEL SECURITY;

--
-- Name: intake_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.intake_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: intakes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.intakes ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated USING ((id = auth.uid()));


--
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));


--
-- Name: ai_flags wf1_ai_flags_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wf1_ai_flags_insert ON public.ai_flags FOR INSERT WITH CHECK (public.is_firm_member(firm_id));


--
-- Name: ai_flags wf1_ai_flags_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wf1_ai_flags_select ON public.ai_flags FOR SELECT USING (public.is_firm_member(firm_id));


--
-- Name: ai_flags wf1_ai_flags_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wf1_ai_flags_update ON public.ai_flags FOR UPDATE USING (public.is_firm_member(firm_id)) WITH CHECK (public.is_firm_member(firm_id));


--
-- Name: ai_runs wf1_ai_runs_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wf1_ai_runs_insert ON public.ai_runs FOR INSERT WITH CHECK (public.is_firm_member(firm_id));


--
-- Name: ai_runs wf1_ai_runs_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wf1_ai_runs_select ON public.ai_runs FOR SELECT USING (public.is_firm_member(firm_id));


--
-- Name: ai_runs wf1_ai_runs_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wf1_ai_runs_update ON public.ai_runs FOR UPDATE USING (public.is_firm_member(firm_id)) WITH CHECK (public.is_firm_member(firm_id));


--
-- Name: audit_log wf1_audit_log_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wf1_audit_log_select ON public.audit_log FOR SELECT USING (public.is_firm_member(firm_id));


--
-- Name: intake_documents wf1_intake_documents_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wf1_intake_documents_insert ON public.intake_documents FOR INSERT WITH CHECK (public.is_firm_member(firm_id));


--
-- Name: intake_documents wf1_intake_documents_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wf1_intake_documents_select ON public.intake_documents FOR SELECT USING (public.is_firm_member(firm_id));


--
-- Name: intake_documents wf1_intake_documents_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wf1_intake_documents_update ON public.intake_documents FOR UPDATE USING (public.is_firm_member(firm_id)) WITH CHECK (public.is_firm_member(firm_id));


--
-- Name: intake_extractions wf1_intake_extractions_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wf1_intake_extractions_insert ON public.intake_extractions FOR INSERT WITH CHECK (public.is_firm_member(firm_id));


--
-- Name: intake_extractions wf1_intake_extractions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wf1_intake_extractions_select ON public.intake_extractions FOR SELECT USING (public.is_firm_member(firm_id));


--
-- Name: intake_extractions wf1_intake_extractions_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wf1_intake_extractions_update ON public.intake_extractions FOR UPDATE USING (public.is_firm_member(firm_id)) WITH CHECK (public.is_firm_member(firm_id));


--
-- Name: intake_messages wf1_intake_messages_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wf1_intake_messages_insert ON public.intake_messages FOR INSERT WITH CHECK (public.is_firm_member(firm_id));


--
-- Name: intake_messages wf1_intake_messages_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wf1_intake_messages_select ON public.intake_messages FOR SELECT USING (public.is_firm_member(firm_id));


--
-- Name: intake_messages wf1_intake_messages_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wf1_intake_messages_update ON public.intake_messages FOR UPDATE USING (public.is_firm_member(firm_id)) WITH CHECK (public.is_firm_member(firm_id));


--
-- Name: intakes wf1_intakes_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wf1_intakes_insert ON public.intakes FOR INSERT WITH CHECK (public.is_firm_member(firm_id));


--
-- Name: intakes wf1_intakes_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wf1_intakes_select ON public.intakes FOR SELECT USING (public.is_firm_member(firm_id));


--
-- Name: intakes wf1_intakes_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wf1_intakes_update ON public.intakes FOR UPDATE USING (public.is_firm_member(firm_id)) WITH CHECK (public.is_firm_member(firm_id));


--
-- PostgreSQL database dump complete
--

\unrestrict SLa8litcvEKI86I3j4EwFk1Edv4FwxKNx7N5sjRuf1e2uLiyUn8EkKKSIAc6U77

