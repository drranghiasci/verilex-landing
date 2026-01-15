-- Migration: Fix Pack v1
-- Author: AntiGravity
-- Date: 2026-01-14

-- 1. Updates to intakes table
ALTER TABLE public.intakes 
  ADD COLUMN IF NOT EXISTS intake_started_at timestamp with time zone DEFAULT now(),
  ADD COLUMN IF NOT EXISTS has_children boolean,
  ADD COLUMN IF NOT EXISTS children_count integer,
  ADD COLUMN IF NOT EXISTS opposing_employment_status text,
  ADD COLUMN IF NOT EXISTS opposing_income_annual_estimate numeric,
  ADD COLUMN IF NOT EXISTS opposing_employer text;

-- 2. Update status constraint for intakes
-- First drop existing constraint if it exists
ALTER TABLE public.intakes DROP CONSTRAINT IF EXISTS wf1_intakes_status_check;
-- Add new constraint with expanded status options
ALTER TABLE public.intakes ADD CONSTRAINT wf1_intakes_status_check 
  CHECK (status IN ('draft', 'in_progress', 'ready_for_review', 'submitted'));

-- 3. Create intake_questions_for_firm
CREATE TABLE IF NOT EXISTS public.intake_questions_for_firm (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    intake_id uuid REFERENCES public.intakes(id) NOT NULL,
    firm_id uuid NOT NULL,
    question_text text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS for new table
ALTER TABLE public.intake_questions_for_firm ENABLE ROW LEVEL SECURITY;

-- 4. Update intake_messages constraints to support 'assistant' and 'tool' roles
ALTER TABLE public.intake_messages DROP CONSTRAINT IF EXISTS wf1_intake_messages_source_check;
ALTER TABLE public.intake_messages ADD CONSTRAINT wf1_intake_messages_source_check 
  CHECK (source IN ('client', 'system', 'attorney', 'assistant', 'tool'));

-- 5. Add timestamp indices for performance (optional but good practice)
CREATE INDEX IF NOT EXISTS idx_intake_messages_intake_id ON public.intake_messages(intake_id);
CREATE INDEX IF NOT EXISTS idx_intake_questions_intake_id ON public.intake_questions_for_firm(intake_id);
