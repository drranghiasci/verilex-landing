-- Add intake_type column to public.intakes
-- This allows the AI chat to select intake_type directly

ALTER TABLE public.intakes
ADD COLUMN IF NOT EXISTS intake_type text;

-- Add check constraint for valid intake types
ALTER TABLE public.intakes
DROP CONSTRAINT IF EXISTS intakes_intake_type_check;

ALTER TABLE public.intakes
ADD CONSTRAINT intakes_intake_type_check
CHECK (intake_type IS NULL OR intake_type IN ('custody_unmarried', 'divorce_no_children', 'divorce_with_children'));

-- Add comment
COMMENT ON COLUMN public.intakes.intake_type IS 'Selected intake type from selector: custody_unmarried, divorce_no_children, divorce_with_children';
