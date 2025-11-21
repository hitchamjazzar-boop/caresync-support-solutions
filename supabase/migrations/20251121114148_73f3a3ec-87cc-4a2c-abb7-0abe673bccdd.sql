-- Update RLS policies to allow admins to insert replies on any memo
CREATE POLICY "Admins can reply to any memo"
  ON public.memo_replies FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND auth.uid() = user_id
  );