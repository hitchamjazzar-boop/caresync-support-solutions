-- Add reason column to employee_votes
ALTER TABLE public.employee_votes 
ADD COLUMN reason text;