
-- Drop storage policy dependency
DROP POLICY IF EXISTS "Providers and admins can view resumes" ON storage.objects;

-- Drop trigger that depends on status column
DROP TRIGGER IF EXISTS on_application_status_change ON public.applications;

-- Drop old columns
ALTER TABLE public.applications 
  DROP COLUMN IF EXISTS name CASCADE,
  DROP COLUMN IF EXISTS email CASCADE,
  DROP COLUMN IF EXISTS phone CASCADE,
  DROP COLUMN IF EXISTS resume_url CASCADE,
  DROP COLUMN IF EXISTS documents CASCADE;

-- Rename user_id to seeker_id
ALTER TABLE public.applications RENAME COLUMN user_id TO seeker_id;

-- Create application_status enum
DO $$ BEGIN
  CREATE TYPE public.application_status AS ENUM ('submitted', 'shortlisted', 'interview', 'hired', 'denied');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Change status column to use the enum
ALTER TABLE public.applications 
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE public.application_status USING status::public.application_status,
  ALTER COLUMN status SET DEFAULT 'submitted'::application_status;

-- Add unique constraint
DO $$ BEGIN
  ALTER TABLE public.applications ADD CONSTRAINT unique_application_per_user UNIQUE (opportunity_id, seeker_id);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create application_documents table
CREATE TABLE IF NOT EXISTS public.application_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT application_documents_pkey PRIMARY KEY (id),
  CONSTRAINT application_documents_application_id_fkey FOREIGN KEY (application_id) REFERENCES applications (id) ON DELETE CASCADE
);

ALTER TABLE public.application_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own application docs"
  ON public.application_documents FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM applications a WHERE a.id = application_documents.application_id AND a.seeker_id = auth.uid()));

CREATE POLICY "Users can view own application docs"
  ON public.application_documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM applications a WHERE a.id = application_documents.application_id AND a.seeker_id = auth.uid()));

CREATE POLICY "Providers can view application docs"
  ON public.application_documents FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM applications a JOIN opportunities o ON o.id = a.opportunity_id
    WHERE a.id = application_documents.application_id AND o.provider_id = auth.uid()
  ));

CREATE POLICY "Admins can view all application docs"
  ON public.application_documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::app_role));

-- Update RLS policies on applications
DROP POLICY IF EXISTS "Users can insert own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can update own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can view own applications" ON public.applications;
DROP POLICY IF EXISTS "Anyone can insert applications" ON public.applications;
DROP POLICY IF EXISTS "Providers can update application status" ON public.applications;
DROP POLICY IF EXISTS "Providers can view applications on their opportunities" ON public.applications;

CREATE POLICY "Users can insert own applications" ON public.applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = seeker_id);
CREATE POLICY "Users can update own applications" ON public.applications FOR UPDATE TO authenticated USING (auth.uid() = seeker_id);
CREATE POLICY "Users can view own applications" ON public.applications FOR SELECT TO authenticated USING (auth.uid() = seeker_id);

CREATE POLICY "Providers can view applications on their opportunities" ON public.applications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM opportunities o WHERE o.id = applications.opportunity_id AND o.provider_id = auth.uid()));

CREATE POLICY "Providers can update application status" ON public.applications FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM opportunities o WHERE o.id = applications.opportunity_id AND o.provider_id = auth.uid()));

-- Recreate storage policy
CREATE POLICY "Providers and admins can view resumes"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM opportunities WHERE opportunities.provider_id = auth.uid())
  ));

-- Recreate notification trigger with seeker_id
CREATE OR REPLACE FUNCTION public.notify_application_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE opp_title TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT title INTO opp_title FROM opportunities WHERE id = NEW.opportunity_id;
    INSERT INTO notifications (user_id, title, message) VALUES (
      NEW.seeker_id, 'Application Status Updated',
      'Your application for "' || COALESCE(opp_title, 'an opportunity') || '" has been updated to: ' || NEW.status
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_application_status_change AFTER UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.notify_application_status_change();
