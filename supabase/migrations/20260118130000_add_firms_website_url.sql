-- Add website_url column to firms table
-- This allows firms to specify their website URL which will be shown in the intake header

ALTER TABLE public.firms
ADD COLUMN IF NOT EXISTS website_url text;

-- Add comment for documentation
COMMENT ON COLUMN public.firms.website_url IS 'Optional firm website URL displayed in intake header. If set, firm name becomes clickable with leave-page warning.';
