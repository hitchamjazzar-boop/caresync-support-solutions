-- Add admin_vote_weight column to award_categories (null means no extra weight, value is percentage 0-100)
ALTER TABLE public.award_categories 
ADD COLUMN admin_vote_weight integer DEFAULT NULL;