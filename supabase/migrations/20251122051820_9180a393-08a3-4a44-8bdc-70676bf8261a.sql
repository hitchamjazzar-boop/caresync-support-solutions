-- Allow users to create announcements about themselves (achievement sharing)
CREATE POLICY "Users can create announcements about themselves"
ON public.announcements
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by 
  AND auth.uid() = featured_user_id
  AND target_type = 'all'
);