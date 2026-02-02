-- Drop existing RLS policies on employee_evaluations
DROP POLICY IF EXISTS "Admins can manage all evaluations" ON public.employee_evaluations;
DROP POLICY IF EXISTS "Employees can insert their own self-evaluations" ON public.employee_evaluations;
DROP POLICY IF EXISTS "Employees can update their own draft self-evaluations" ON public.employee_evaluations;
DROP POLICY IF EXISTS "Employees can view their own finalized evaluations" ON public.employee_evaluations;

-- New RLS policies for peer evaluation system

-- Admins have full access
CREATE POLICY "Admins can manage all evaluations" 
ON public.employee_evaluations 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Any authenticated user can create an evaluation for someone else (not themselves)
CREATE POLICY "Users can create evaluations for others" 
ON public.employee_evaluations 
FOR INSERT 
WITH CHECK (
  auth.uid() = reviewer_id 
  AND auth.uid() != employee_id
);

-- Reviewers can update their own draft evaluations
CREATE POLICY "Reviewers can update their draft evaluations" 
ON public.employee_evaluations 
FOR UPDATE 
USING (
  auth.uid() = reviewer_id 
  AND status = 'draft'
);

-- Reviewers can view evaluations they created
CREATE POLICY "Reviewers can view their evaluations" 
ON public.employee_evaluations 
FOR SELECT 
USING (auth.uid() = reviewer_id);

-- Employees can ONLY view their own evaluations when finalized
CREATE POLICY "Employees can view their own finalized evaluations" 
ON public.employee_evaluations 
FOR SELECT 
USING (
  auth.uid() = employee_id 
  AND status = 'finalized'
);

-- Update evaluation_section_scores policies
DROP POLICY IF EXISTS "Admins can manage all section scores" ON public.evaluation_section_scores;
DROP POLICY IF EXISTS "Employees can manage scores for their own draft self-evaluation" ON public.evaluation_section_scores;
DROP POLICY IF EXISTS "Employees can view their own finalized evaluation scores" ON public.evaluation_section_scores;

-- Admins can manage all scores
CREATE POLICY "Admins can manage all section scores" 
ON public.evaluation_section_scores 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Reviewers can manage scores for their draft evaluations
CREATE POLICY "Reviewers can manage scores for their draft evaluations" 
ON public.evaluation_section_scores 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM employee_evaluations 
    WHERE employee_evaluations.id = evaluation_section_scores.evaluation_id 
    AND employee_evaluations.reviewer_id = auth.uid() 
    AND employee_evaluations.status = 'draft'
  )
);

-- Reviewers can view scores for evaluations they created
CREATE POLICY "Reviewers can view their evaluation scores" 
ON public.evaluation_section_scores 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM employee_evaluations 
    WHERE employee_evaluations.id = evaluation_section_scores.evaluation_id 
    AND employee_evaluations.reviewer_id = auth.uid()
  )
);

-- Employees can view their own finalized evaluation scores
CREATE POLICY "Employees can view their own finalized evaluation scores" 
ON public.evaluation_section_scores 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM employee_evaluations 
    WHERE employee_evaluations.id = evaluation_section_scores.evaluation_id 
    AND employee_evaluations.employee_id = auth.uid() 
    AND employee_evaluations.status = 'finalized'
  )
);

-- Update evaluation_kpis policies
DROP POLICY IF EXISTS "Admins can manage all KPIs" ON public.evaluation_kpis;
DROP POLICY IF EXISTS "Employees can manage KPIs for their own draft self-evaluations" ON public.evaluation_kpis;
DROP POLICY IF EXISTS "Employees can view their own finalized evaluation KPIs" ON public.evaluation_kpis;

-- Admins can manage all KPIs
CREATE POLICY "Admins can manage all KPIs" 
ON public.evaluation_kpis 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Reviewers can manage KPIs for their draft evaluations
CREATE POLICY "Reviewers can manage KPIs for their draft evaluations" 
ON public.evaluation_kpis 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM employee_evaluations 
    WHERE employee_evaluations.id = evaluation_kpis.evaluation_id 
    AND employee_evaluations.reviewer_id = auth.uid() 
    AND employee_evaluations.status = 'draft'
  )
);

-- Reviewers can view KPIs for evaluations they created
CREATE POLICY "Reviewers can view their evaluation KPIs" 
ON public.evaluation_kpis 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM employee_evaluations 
    WHERE employee_evaluations.id = evaluation_kpis.evaluation_id 
    AND employee_evaluations.reviewer_id = auth.uid()
  )
);

-- Employees can view their own finalized evaluation KPIs
CREATE POLICY "Employees can view their own finalized evaluation KPIs" 
ON public.evaluation_kpis 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM employee_evaluations 
    WHERE employee_evaluations.id = evaluation_kpis.evaluation_id 
    AND employee_evaluations.employee_id = auth.uid() 
    AND employee_evaluations.status = 'finalized'
  )
);