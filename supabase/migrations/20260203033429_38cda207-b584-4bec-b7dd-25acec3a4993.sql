-- Drop the existing restrictive policy for reviewers managing section scores
DROP POLICY IF EXISTS "Reviewers can manage scores for their draft evaluations" ON public.evaluation_section_scores;

-- Create a new policy that allows reviewers to manage section scores
-- for evaluations that are either draft OR submitted (to handle the submission flow)
CREATE POLICY "Reviewers can manage scores for their draft evaluations"
ON public.evaluation_section_scores
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM employee_evaluations
    WHERE employee_evaluations.id = evaluation_section_scores.evaluation_id
      AND employee_evaluations.reviewer_id = auth.uid()
      AND employee_evaluations.status IN ('draft', 'submitted')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM employee_evaluations
    WHERE employee_evaluations.id = evaluation_section_scores.evaluation_id
      AND employee_evaluations.reviewer_id = auth.uid()
      AND employee_evaluations.status IN ('draft', 'submitted')
  )
);