-- Add column to voting_periods to control whether nominations are required
ALTER TABLE public.voting_periods 
ADD COLUMN requires_nomination boolean NOT NULL DEFAULT true;