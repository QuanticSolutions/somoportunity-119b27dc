
-- Make notification insert more restrictive - only allow inserting for own user_id
DROP POLICY "Authenticated users can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
