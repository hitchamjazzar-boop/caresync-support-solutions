-- Allow admins to update nominations (for approving/rejecting)
CREATE POLICY "Admins can update nominations"
ON public.employee_nominations
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));