-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own feedback" ON public.employee_feedback;
DROP POLICY IF EXISTS "Admins can view all feedback" ON public.employee_feedback;
DROP POLICY IF EXISTS "Users can insert own feedback" ON public.employee_feedback;
DROP POLICY IF EXISTS "Admins can update feedback" ON public.employee_feedback;

-- Recreate as PERMISSIVE policies (default, any one needs to pass)
CREATE POLICY "Users can view own feedback"
ON public.employee_feedback
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback"
ON public.employee_feedback
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own feedback"
ON public.employee_feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update feedback"
ON public.employee_feedback
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));