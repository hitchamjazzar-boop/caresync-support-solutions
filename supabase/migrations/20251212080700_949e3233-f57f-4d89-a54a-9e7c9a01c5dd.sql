-- Drop the unique constraint on month/year to allow multiple voting periods
ALTER TABLE public.voting_periods 
DROP CONSTRAINT IF EXISTS voting_periods_month_year_key;

-- Add is_admin_vote column to track admin votes for weighted calculation
ALTER TABLE public.employee_votes
ADD COLUMN is_admin_vote boolean DEFAULT false;