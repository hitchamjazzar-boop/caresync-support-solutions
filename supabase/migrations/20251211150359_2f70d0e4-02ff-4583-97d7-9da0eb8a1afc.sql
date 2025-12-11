-- Create award categories table
CREATE TABLE public.award_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'award',
  color TEXT DEFAULT '#f59e0b',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.award_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can view active categories
CREATE POLICY "Everyone can view active award categories"
ON public.award_categories FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'));

-- Admins can manage categories
CREATE POLICY "Admins can manage award categories"
ON public.award_categories FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Add category_id to voting_periods
ALTER TABLE public.voting_periods 
ADD COLUMN category_id UUID REFERENCES public.award_categories(id),
ADD COLUMN winner_id UUID REFERENCES auth.users(id),
ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN announcement_message TEXT,
ADD COLUMN published_at TIMESTAMP WITH TIME ZONE;

-- Add approval status to nominations
ALTER TABLE public.employee_nominations
ADD COLUMN is_approved BOOLEAN DEFAULT NULL,
ADD COLUMN approved_by UUID REFERENCES auth.users(id),
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;

-- Update voting policy to only allow voting for approved nominees
DROP POLICY IF EXISTS "Users can vote once per period" ON public.employee_votes;

CREATE POLICY "Users can vote for approved nominees"
ON public.employee_votes FOR INSERT
WITH CHECK (
  (auth.uid() = voter_user_id) 
  AND (nominated_user_id <> voter_user_id)
  AND EXISTS (
    SELECT 1 FROM voting_periods
    WHERE voting_periods.id = employee_votes.voting_period_id
    AND voting_periods.status = 'open'
  )
  AND EXISTS (
    SELECT 1 FROM employee_nominations
    WHERE employee_nominations.voting_period_id = employee_votes.voting_period_id
    AND employee_nominations.nominated_user_id = employee_votes.nominated_user_id
    AND employee_nominations.is_approved = true
  )
);

-- Insert default "Employee of the Month" category
INSERT INTO public.award_categories (name, description, icon, color)
VALUES ('Employee of the Month', 'Recognizing outstanding performance and dedication', 'award', '#f59e0b');