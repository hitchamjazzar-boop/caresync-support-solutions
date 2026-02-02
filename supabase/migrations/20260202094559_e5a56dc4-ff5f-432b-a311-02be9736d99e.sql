-- Update the evaluation_type check constraint to include peer_review
ALTER TABLE employee_evaluations DROP CONSTRAINT employee_evaluations_evaluation_type_check;

ALTER TABLE employee_evaluations ADD CONSTRAINT employee_evaluations_evaluation_type_check 
CHECK (evaluation_type = ANY (ARRAY['admin_review'::text, 'self_evaluation'::text, 'peer_review'::text]));

-- Add delete policy for reviewers on their draft evaluations
CREATE POLICY "Reviewers can delete their draft evaluations"
ON employee_evaluations
FOR DELETE
USING (auth.uid() = reviewer_id AND status = 'draft');