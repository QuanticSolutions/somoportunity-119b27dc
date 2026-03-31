
-- Allow authenticated users to insert notifications (for system/status change triggers)
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create a function to notify applicant on status change
CREATE OR REPLACE FUNCTION public.notify_application_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  opp_title TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT title INTO opp_title FROM opportunities WHERE id = NEW.opportunity_id;
    INSERT INTO notifications (user_id, title, message)
    VALUES (
      NEW.user_id,
      'Application Status Updated',
      'Your application for "' || COALESCE(opp_title, 'an opportunity') || '" has been updated to: ' || NEW.status
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on applications table
CREATE TRIGGER on_application_status_change
  AFTER UPDATE OF status ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_application_status_change();
