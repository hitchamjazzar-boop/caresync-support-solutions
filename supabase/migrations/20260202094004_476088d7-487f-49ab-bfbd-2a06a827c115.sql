-- Create evaluation campaigns table (admin creates these)
CREATE TABLE public.evaluation_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  created_by UUID NOT NULL,
  review_type TEXT NOT NULL DEFAULT 'quarterly',
  include_leadership BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'open', -- open, closed, finalized
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create evaluation assignments table (who is assigned to evaluate)
CREATE TABLE public.evaluation_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.evaluation_campaigns(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, submitted
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, reviewer_id)
);

-- Add campaign_id to employee_evaluations to link responses
ALTER TABLE public.employee_evaluations 
ADD COLUMN campaign_id UUID REFERENCES public.evaluation_campaigns(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.evaluation_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_assignments ENABLE ROW LEVEL SECURITY;

-- RLS for evaluation_campaigns
CREATE POLICY "Admins can manage all campaigns"
ON public.evaluation_campaigns FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees can view finalized campaigns where they are the subject"
ON public.evaluation_campaigns FOR SELECT
USING (auth.uid() = employee_id AND status = 'finalized');

CREATE POLICY "Assigned reviewers can view their campaigns"
ON public.evaluation_campaigns FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.evaluation_assignments
  WHERE evaluation_assignments.campaign_id = evaluation_campaigns.id
  AND evaluation_assignments.reviewer_id = auth.uid()
));

-- RLS for evaluation_assignments
CREATE POLICY "Admins can manage all assignments"
ON public.evaluation_assignments FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view and update their own assignments"
ON public.evaluation_assignments FOR SELECT
USING (auth.uid() = reviewer_id);

CREATE POLICY "Users can update their own assignments"
ON public.evaluation_assignments FOR UPDATE
USING (auth.uid() = reviewer_id);

-- Update employee_evaluations RLS to work with campaigns
DROP POLICY IF EXISTS "Users can create evaluations for others" ON public.employee_evaluations;
DROP POLICY IF EXISTS "Reviewers can update their draft evaluations" ON public.employee_evaluations;
DROP POLICY IF EXISTS "Reviewers can view their evaluations" ON public.employee_evaluations;
DROP POLICY IF EXISTS "Employees can view their own finalized evaluations" ON public.employee_evaluations;

CREATE POLICY "Assigned reviewers can create evaluations"
ON public.employee_evaluations FOR INSERT
WITH CHECK (
  auth.uid() = reviewer_id 
  AND auth.uid() != employee_id
  AND EXISTS (
    SELECT 1 FROM public.evaluation_assignments ea
    JOIN public.evaluation_campaigns ec ON ea.campaign_id = ec.id
    WHERE ea.reviewer_id = auth.uid()
    AND ec.employee_id = employee_evaluations.employee_id
    AND ec.status = 'open'
  )
);

CREATE POLICY "Reviewers can view their own evaluations"
ON public.employee_evaluations FOR SELECT
USING (auth.uid() = reviewer_id);

CREATE POLICY "Reviewers can update their draft evaluations"
ON public.employee_evaluations FOR UPDATE
USING (auth.uid() = reviewer_id AND status = 'draft');

CREATE POLICY "Employees can view aggregated results when finalized"
ON public.evaluation_campaigns FOR SELECT
USING (auth.uid() = employee_id AND status = 'finalized');

-- Triggers for updated_at
CREATE TRIGGER update_evaluation_campaigns_updated_at
BEFORE UPDATE ON public.evaluation_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();