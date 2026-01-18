-- Venue Statistics Tables
-- Suppression-first, county-level-only, boolean-only design

--------------------------------------------------------------------------------
-- 1. RAW TELEMETRY (append-only, boolean-only)
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.venue_stats_telemetry (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    firm_id uuid NOT NULL REFERENCES public.firms(id),
    intake_id uuid NOT NULL REFERENCES public.intakes(id),
    venue_state text NOT NULL,
    venue_county text NOT NULL,
    matter_type text NOT NULL,
    submitted_at timestamp with time zone NOT NULL,
    -- Boolean-only presence maps (no values, no text)
    field_presence jsonb NOT NULL DEFAULT '{}'::jsonb,
    doc_presence jsonb NOT NULL DEFAULT '{}'::jsonb,
    contradiction_types text[] NOT NULL DEFAULT '{}',
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    
    -- Prevent duplicate telemetry for same intake
    CONSTRAINT venue_stats_telemetry_intake_unique UNIQUE (intake_id)
);

-- RLS
ALTER TABLE public.venue_stats_telemetry ENABLE ROW LEVEL SECURITY;

-- Firm members can read their own firm's telemetry (for verification only)
CREATE POLICY venue_telemetry_firm_read ON public.venue_stats_telemetry
    FOR SELECT
    USING (
        firm_id IN (
            SELECT fm.firm_id FROM public.firm_members fm 
            WHERE fm.user_id = auth.uid()
        )
    );

-- No direct insert from clients - service role only via derive function

--------------------------------------------------------------------------------
-- 2. IMMUTABLE SNAPSHOTS
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.venue_stats_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    venue_state text NOT NULL,
    venue_county text NOT NULL,
    matter_type text NOT NULL,
    time_window_start date NOT NULL,
    time_window_end date NOT NULL,
    scope text NOT NULL,
    firm_id uuid REFERENCES public.firms(id),  -- NULL for global scope
    sample_size int NOT NULL,
    is_suppressed boolean NOT NULL DEFAULT true,
    suppression_reason text,
    computed_at timestamp with time zone DEFAULT now() NOT NULL,
    
    CONSTRAINT venue_stats_snapshots_scope_check CHECK (scope IN ('firm', 'global')),
    CONSTRAINT venue_stats_snapshots_sample_positive CHECK (sample_size >= 0)
);

-- RLS
ALTER TABLE public.venue_stats_snapshots ENABLE ROW LEVEL SECURITY;

-- Firm members can read their firm's snapshots OR global snapshots
CREATE POLICY venue_snapshots_read ON public.venue_stats_snapshots
    FOR SELECT
    USING (
        scope = 'global' 
        OR firm_id IN (
            SELECT fm.firm_id FROM public.firm_members fm 
            WHERE fm.user_id = auth.uid()
        )
    );

--------------------------------------------------------------------------------
-- 3. METRICS WITH SUPPRESSION FLAGS
--------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.venue_stats_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    snapshot_id uuid NOT NULL REFERENCES public.venue_stats_snapshots(id) ON DELETE CASCADE,
    metric_key text NOT NULL,
    metric_type text NOT NULL,
    count int NOT NULL,
    prevalence_pct numeric(5,2) NOT NULL,
    is_suppressed boolean NOT NULL DEFAULT true,
    suppression_reason text,
    
    CONSTRAINT venue_stats_metrics_type_check CHECK (metric_type IN ('field', 'document', 'contradiction')),
    CONSTRAINT venue_stats_metrics_unique UNIQUE (snapshot_id, metric_key),
    CONSTRAINT venue_stats_metrics_prevalence_range CHECK (prevalence_pct >= 0 AND prevalence_pct <= 100)
);

-- RLS (inherits from snapshot visibility)
ALTER TABLE public.venue_stats_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY venue_metrics_read ON public.venue_stats_metrics
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.venue_stats_snapshots s
            WHERE s.id = snapshot_id
            AND (
                s.scope = 'global'
                OR s.firm_id IN (
                    SELECT fm.firm_id FROM public.firm_members fm 
                    WHERE fm.user_id = auth.uid()
                )
            )
        )
    );

--------------------------------------------------------------------------------
-- IMMUTABILITY TRIGGERS
--------------------------------------------------------------------------------

-- Prevent telemetry updates/deletes
CREATE OR REPLACE FUNCTION prevent_venue_telemetry_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Venue stats telemetry is append-only and cannot be modified';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER venue_telemetry_no_update
    BEFORE UPDATE ON public.venue_stats_telemetry
    FOR EACH ROW EXECUTE FUNCTION prevent_venue_telemetry_mutation();

CREATE TRIGGER venue_telemetry_no_delete
    BEFORE DELETE ON public.venue_stats_telemetry
    FOR EACH ROW EXECUTE FUNCTION prevent_venue_telemetry_mutation();

-- Prevent snapshot updates/deletes
CREATE OR REPLACE FUNCTION prevent_venue_snapshot_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Venue stats snapshots are immutable and cannot be modified';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER venue_snapshot_no_update
    BEFORE UPDATE ON public.venue_stats_snapshots
    FOR EACH ROW EXECUTE FUNCTION prevent_venue_snapshot_mutation();

CREATE TRIGGER venue_snapshot_no_delete
    BEFORE DELETE ON public.venue_stats_snapshots
    FOR EACH ROW EXECUTE FUNCTION prevent_venue_snapshot_mutation();

-- Prevent metric updates/deletes (except via CASCADE from snapshot)
CREATE OR REPLACE FUNCTION prevent_venue_metric_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Venue stats metrics are immutable and cannot be modified';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER venue_metric_no_update
    BEFORE UPDATE ON public.venue_stats_metrics
    FOR EACH ROW EXECUTE FUNCTION prevent_venue_metric_mutation();

--------------------------------------------------------------------------------
-- AUDIT LOGGING
--------------------------------------------------------------------------------

-- Log telemetry insertion
CREATE OR REPLACE FUNCTION audit_venue_telemetry_insert() RETURNS trigger AS $$
BEGIN
    PERFORM public.audit_write(
        NEW.firm_id,
        'venue_telemetry_created',
        'venue_stats_telemetry',
        NEW.id,
        NEW.intake_id,
        jsonb_build_object(
            'venue_state', NEW.venue_state,
            'venue_county', NEW.venue_county,
            'matter_type', NEW.matter_type
        ),
        NULL,
        NULL
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_venue_telemetry
    AFTER INSERT ON public.venue_stats_telemetry
    FOR EACH ROW EXECUTE FUNCTION audit_venue_telemetry_insert();

-- Log snapshot creation
CREATE OR REPLACE FUNCTION audit_venue_snapshot_insert() RETURNS trigger AS $$
BEGIN
    PERFORM public.audit_write(
        COALESCE(NEW.firm_id, '00000000-0000-0000-0000-000000000000'::uuid),
        'venue_snapshot_created',
        'venue_stats_snapshots',
        NEW.id,
        NULL,
        jsonb_build_object(
            'venue_state', NEW.venue_state,
            'venue_county', NEW.venue_county,
            'matter_type', NEW.matter_type,
            'scope', NEW.scope,
            'sample_size', NEW.sample_size,
            'is_suppressed', NEW.is_suppressed
        ),
        NULL,
        NULL
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_venue_snapshot
    AFTER INSERT ON public.venue_stats_snapshots
    FOR EACH ROW EXECUTE FUNCTION audit_venue_snapshot_insert();

--------------------------------------------------------------------------------
-- INDEXES
--------------------------------------------------------------------------------

CREATE INDEX idx_venue_telemetry_county ON public.venue_stats_telemetry(venue_state, venue_county);
CREATE INDEX idx_venue_telemetry_matter ON public.venue_stats_telemetry(matter_type);
CREATE INDEX idx_venue_telemetry_submitted ON public.venue_stats_telemetry(submitted_at);
CREATE INDEX idx_venue_snapshots_lookup ON public.venue_stats_snapshots(venue_state, venue_county, matter_type, scope);
CREATE INDEX idx_venue_metrics_snapshot ON public.venue_stats_metrics(snapshot_id);
