-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can vote for approved nominees" ON public.employee_votes;

-- Create a new INSERT policy that handles both nomination-required and direct voting
CREATE POLICY "Users can vote for nominees" ON public.employee_votes
FOR INSERT WITH CHECK (
  auth.uid() = voter_user_id 
  AND nominated_user_id <> voter_user_id
  AND EXISTS (
    SELECT 1 FROM voting_periods vp
    WHERE vp.id = employee_votes.voting_period_id 
    AND vp.status = 'open'
  )
  AND (
    -- Either the period doesn't require nominations (direct voting)
    EXISTS (
      SELECT 1 FROM voting_periods vp
      WHERE vp.id = employee_votes.voting_period_id 
      AND vp.requires_nomination = false
    )
    OR 
    -- Or the nominee is approved
    EXISTS (
      SELECT 1 FROM employee_nominations en
      WHERE en.voting_period_id = employee_votes.voting_period_id 
      AND en.nominated_user_id = employee_votes.nominated_user_id 
      AND en.is_approved = true
    )
  )
);