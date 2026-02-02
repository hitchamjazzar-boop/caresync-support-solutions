-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can manage all evaluations" ON public.employee_evaluations;
DROP POLICY IF EXISTS "Assigned reviewers can create evaluations" ON public.employee_evaluations;
DROP POLICY IF EXISTS "Reviewers can delete their draft evaluations" ON public.employee_evaluations;
DROP POLICY IF EXISTS "Reviewers can update their draft evaluations" ON public.employee_evaluations;
DROP POLICY IF EXISTS "Reviewers can view their own evaluations" ON public.employee_evaluations;

-- Recreate as PERMISSIVE policies (default is permissive)
CREATE POLICY "Admins can manage all evaluations" 
ON public.employee_evaluations 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Reviewers can view their own evaluations" 
ON public.employee_evaluations 
FOR SELECT 
USING (auth.uid() = reviewer_id);

CREATE POLICY "Reviewers can create peer evaluations" 
ON public.employee_evaluations 
FOR INSERT 
WITH CHECK (auth.uid() = reviewer_id AND auth.uid() != employee_id);

CREATE POLICY "Reviewers can update their draft evaluations" 
ON public.employee_evaluations 
FOR UPDATE 
USING (auth.uid() = reviewer_id AND status = 'draft');

CREATE POLICY "Reviewers can delete their draft evaluations" 
ON public.employee_evaluations 
FOR DELETE 
USING (auth.uid() = reviewer_id AND status = 'draft');

-- Allow employees to view their finalized evaluations
CREATE POLICY "Employees can view their finalized evaluations" 
ON public.employee_evaluations 
FOR SELECT 
USING (auth.uid() = employee_id AND status = 'finalized');