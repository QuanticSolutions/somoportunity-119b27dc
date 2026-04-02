-- Add new columns to opportunities
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS eligibility text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS benefits text,
  ADD COLUMN IF NOT EXISTS application_steps jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS compensation text,
  ADD COLUMN IF NOT EXISTS funding_amount text,
  ADD COLUMN IF NOT EXISTS official_website text;

-- Add new columns to profiles for provider details
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS organization_name text,
  ADD COLUMN IF NOT EXISTS organization_type text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS linkedin text;