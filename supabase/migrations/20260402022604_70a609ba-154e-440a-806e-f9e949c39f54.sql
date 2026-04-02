
CREATE TABLE public.error_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  message text NOT NULL,
  stack text,
  context jsonb DEFAULT '{}'::jsonb,
  severity text NOT NULL DEFAULT 'error',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all error logs"
ON public.error_logs FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::app_role
));

CREATE POLICY "Authenticated users can insert error logs"
ON public.error_logs FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX idx_error_logs_severity ON public.error_logs(severity);
