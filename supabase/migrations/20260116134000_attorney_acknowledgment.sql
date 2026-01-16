-- Migration: Attorney Acknowledgment Audit Logging
-- This adds immutable logging for attorney acknowledgment of client-asserted intake records

-- Add attorney_acknowledgments table for immutable logging
CREATE TABLE IF NOT EXISTS public.intake_attorney_acknowledgments (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    firm_id uuid NOT NULL REFERENCES public.firms(id),
    intake_id uuid NOT NULL REFERENCES public.intakes(id),
    attorney_user_id uuid NOT NULL REFERENCES public.profiles(id),
    acknowledgment_text text NOT NULL DEFAULT 'I understand this record contains client-asserted, unverified information.',
    acknowledged_at timestamp with time zone DEFAULT now() NOT NULL,
    
    CONSTRAINT unique_intake_attorney_ack UNIQUE (intake_id, attorney_user_id)
);

-- Enable RLS
ALTER TABLE public.intake_attorney_acknowledgments ENABLE ROW LEVEL SECURITY;

-- RLS policy: only firm members can read their firm's acknowledgments
CREATE POLICY intake_attorney_ack_firm_read ON public.intake_attorney_acknowledgments
    FOR SELECT
    USING (
        firm_id IN (
            SELECT fm.firm_id FROM public.firm_members fm 
            WHERE fm.user_id = auth.uid()
        )
    );

-- RLS policy: attorneys can insert acknowledgments for their firm
CREATE POLICY intake_attorney_ack_firm_insert ON public.intake_attorney_acknowledgments
    FOR INSERT
    WITH CHECK (
        firm_id IN (
            SELECT fm.firm_id FROM public.firm_members fm 
            WHERE fm.user_id = auth.uid()
        )
        AND attorney_user_id = auth.uid()
    );

-- Immutability: prevent updates and deletes (acknowledgments are permanent)
CREATE OR REPLACE FUNCTION prevent_ack_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Attorney acknowledgments are immutable and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER intake_attorney_ack_no_update
    BEFORE UPDATE ON public.intake_attorney_acknowledgments
    FOR EACH ROW EXECUTE FUNCTION prevent_ack_mutation();

CREATE TRIGGER intake_attorney_ack_no_delete  
    BEFORE DELETE ON public.intake_attorney_acknowledgments
    FOR EACH ROW EXECUTE FUNCTION prevent_ack_mutation();

-- Audit log entry for acknowledgment creation
CREATE OR REPLACE FUNCTION audit_attorney_acknowledgment() RETURNS trigger AS $$
BEGIN
    PERFORM public.audit_write(
        NEW.firm_id,
        'attorney_acknowledgment',
        'intake_attorney_acknowledgments',
        NEW.id,
        NEW.intake_id,
        jsonb_build_object(
            'attorney_user_id', NEW.attorney_user_id,
            'acknowledgment_text', NEW.acknowledgment_text
        ),
        NULL,
        to_jsonb(NEW)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_intake_attorney_ack
    AFTER INSERT ON public.intake_attorney_acknowledgments
    FOR EACH ROW EXECUTE FUNCTION audit_attorney_acknowledgment();
