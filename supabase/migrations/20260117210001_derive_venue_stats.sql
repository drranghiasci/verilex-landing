-- Derive Venue Stats Inputs Function
-- Extracts boolean-only field presence from submitted intakes

--------------------------------------------------------------------------------
-- CONSTANTS
--------------------------------------------------------------------------------

-- Field presence allow-list (boolean only - no values extracted)
-- These are the ONLY fields we track presence for
CREATE OR REPLACE FUNCTION get_venue_stats_field_allowlist() 
RETURNS text[] AS $$
BEGIN
    RETURN ARRAY[
        -- Client identity
        'client_first_name',
        'client_last_name',
        'client_email',
        'client_phone',
        'client_address',
        -- Spouse identity  
        'spouse_first_name',
        'spouse_last_name',
        -- Marriage info
        'date_of_marriage',
        'date_of_separation',
        -- Children
        'has_children',
        'child_count',
        -- Property
        'has_marital_property',
        'has_debts',
        -- Jurisdiction
        'county_of_filing',
        'client_county',
        -- Desired outcomes
        'desired_custody_outcome',
        'desired_property_outcome'
    ];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Sensitive fields (tracked but ALWAYS suppressed in display)
CREATE OR REPLACE FUNCTION get_venue_stats_sensitive_fields()
RETURNS text[] AS $$
BEGIN
    RETURN ARRAY[
        'has_dv_indicator',
        'dv_details',
        'has_protective_order',
        'weapons_in_home',
        'safety_concerns'
    ];
END;
$$ LANGUAGE plpgsql IMMUTABLE;

--------------------------------------------------------------------------------
-- DERIVE FUNCTION
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION derive_venue_stats_inputs(p_intake_id uuid)
RETURNS void AS $$
DECLARE
    v_intake RECORD;
    v_payload jsonb;
    v_field_presence jsonb := '{}'::jsonb;
    v_doc_presence jsonb := '{}'::jsonb;
    v_contradiction_types text[] := '{}';
    v_field text;
    v_allowlist text[];
    v_venue_county text;
    v_venue_state text;
BEGIN
    -- Get intake record
    SELECT 
        i.id,
        i.firm_id,
        i.raw_payload,
        i.matter_type,
        i.submitted_at,
        i.status
    INTO v_intake
    FROM public.intakes i
    WHERE i.id = p_intake_id;
    
    -- Only process submitted intakes
    IF v_intake IS NULL OR v_intake.status != 'submitted' THEN
        RETURN;
    END IF;
    
    -- Check if already processed (idempotency)
    IF EXISTS (SELECT 1 FROM public.venue_stats_telemetry WHERE intake_id = p_intake_id) THEN
        RETURN;
    END IF;
    
    v_payload := COALESCE(v_intake.raw_payload, '{}'::jsonb);
    
    -- Extract venue (county-level only)
    v_venue_county := COALESCE(
        v_payload->>'county_of_filing',
        v_payload->>'client_county',
        'UNKNOWN'
    );
    v_venue_state := COALESCE(
        v_payload->>'state',
        v_payload->'client_address'->>'state',
        'GA'  -- Default to Georgia for this schema
    );
    
    -- Build field presence map (boolean only)
    v_allowlist := get_venue_stats_field_allowlist();
    FOREACH v_field IN ARRAY v_allowlist
    LOOP
        -- Check if field is present and non-null
        IF v_payload ? v_field AND v_payload->>v_field IS NOT NULL AND v_payload->>v_field != '' THEN
            v_field_presence := v_field_presence || jsonb_build_object('has_' || v_field, true);
        ELSE
            v_field_presence := v_field_presence || jsonb_build_object('has_' || v_field, false);
        END IF;
    END LOOP;
    
    -- Extract document presence from intake_documents
    SELECT jsonb_object_agg(
        'has_doc_' || COALESCE(d.document_type, 'other'),
        true
    ) INTO v_doc_presence
    FROM public.intake_documents d
    WHERE d.intake_id = p_intake_id
    GROUP BY d.intake_id;
    
    v_doc_presence := COALESCE(v_doc_presence, '{}'::jsonb);
    
    -- Extract contradiction types from Case Integrity Engine (if available)
    -- These come from ai_flags or could be computed
    SELECT ARRAY_AGG(DISTINCT f.flag_key)
    INTO v_contradiction_types
    FROM public.ai_flags f
    WHERE f.intake_id = p_intake_id
    AND f.flag_key LIKE 'contradiction_%';
    
    v_contradiction_types := COALESCE(v_contradiction_types, '{}');
    
    -- Insert telemetry row (will fail silently if duplicate due to UNIQUE)
    INSERT INTO public.venue_stats_telemetry (
        firm_id,
        intake_id,
        venue_state,
        venue_county,
        matter_type,
        submitted_at,
        field_presence,
        doc_presence,
        contradiction_types
    ) VALUES (
        v_intake.firm_id,
        p_intake_id,
        v_venue_state,
        v_venue_county,
        COALESCE(v_intake.matter_type, 'divorce'),
        v_intake.submitted_at,
        v_field_presence,
        v_doc_presence,
        v_contradiction_types
    )
    ON CONFLICT (intake_id) DO NOTHING;
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

--------------------------------------------------------------------------------
-- TRIGGER ON INTAKE SUBMISSION
--------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_derive_venue_stats() RETURNS trigger AS $$
BEGIN
    -- Only trigger when status changes to 'submitted'
    IF NEW.status = 'submitted' AND (OLD IS NULL OR OLD.status != 'submitted') THEN
        PERFORM derive_venue_stats_inputs(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to intakes table (if not exists)
DROP TRIGGER IF EXISTS derive_venue_stats_on_submit ON public.intakes;
CREATE TRIGGER derive_venue_stats_on_submit
    AFTER INSERT OR UPDATE ON public.intakes
    FOR EACH ROW EXECUTE FUNCTION trigger_derive_venue_stats();
