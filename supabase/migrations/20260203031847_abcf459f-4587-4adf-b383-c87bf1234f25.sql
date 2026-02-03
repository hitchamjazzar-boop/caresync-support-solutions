-- Drop the existing restrictive update policy for reviewers
DROP POLICY IF EXISTS "Reviewers can update their draft evaluations" ON public.employee_evaluations;

-- Create a new policy that allows reviewers to update their draft evaluations
-- and submit them (change status from draft to submitted)
CREATE POLICY "Reviewers can update their draft evaluations"
ON public.employee_evaluations
FOR UPDATE
USING (
  (auth.uid() = reviewer_id) AND (status = 'draft'::text)
)
WITH CHECK (
  (auth.uid() = reviewer_id) AND (status IN ('draft', 'submitted'))
);