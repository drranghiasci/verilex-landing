-- Add step orchestration tracking columns to public.intakes
-- These columns store the orchestrator state for deterministic step progression

ALTER TABLE public.intakes
ADD COLUMN IF NOT EXISTS current_step_key text,
ADD COLUMN IF NOT EXISTS completed_step_keys text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS step_status jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_orchestrated_at timestamptz;

-- Add index for querying by current step
CREATE INDEX IF NOT EXISTS idx_intakes_current_step
ON public.intakes(current_step_key);

-- Add comments for documentation
COMMENT ON COLUMN public.intakes.current_step_key IS 'Current schema step key from orchestrator (e.g., matter_metadata, client_identity)';
COMMENT ON COLUMN public.intakes.completed_step_keys IS 'Array of completed schema step keys';
COMMENT ON COLUMN public.intakes.step_status IS 'JSON object with detailed status per step: { stepKey: { status, missingFields, validationErrors } }';
COMMENT ON COLUMN public.intakes.last_orchestrated_at IS 'Timestamp of last orchestrator run for this intake';
