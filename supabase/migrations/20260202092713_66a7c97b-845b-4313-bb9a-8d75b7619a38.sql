-- Create evaluation_periods table
CREATE TABLE public.evaluation_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  review_type TEXT NOT NULL CHECK (review_type IN ('probation', 'quarterly', 'bi_annual', 'annual', 'promotion')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employee_evaluations table
CREATE TABLE public.employee_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id UUID REFERENCES public.evaluation_periods(id) ON DELETE SET NULL,
  employee_id UUID NOT NULL,
  reviewer_id UUID NOT NULL,
  evaluation_type TEXT NOT NULL DEFAULT 'admin_review' CHECK (evaluation_type IN ('admin_review', 'self_evaluation')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed', 'finalized')),
  include_leadership BOOLEAN NOT NULL DEFAULT false,
  total_score NUMERIC,
  max_possible_score NUMERIC DEFAULT 45,
  overall_result TEXT,
  strengths TEXT,
  areas_for_improvement TEXT,
  training_needed TEXT,
  goals_next_period TEXT,
  action_plan TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  finalized_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create evaluation_section_scores table
CREATE TABLE public.evaluation_section_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_id UUID NOT NULL REFERENCES public.employee_evaluations(id) ON DELETE CASCADE,
  section_number INTEGER NOT NULL CHECK (section_number BETWEEN 1 AND 10),
  section_name TEXT NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(evaluation_id, section_number)
);

-- Create evaluation_kpis table
CREATE TABLE public.evaluation_kpis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_id UUID NOT NULL REFERENCES public.employee_evaluations(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  target_value TEXT,
  actual_value TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create evaluation_requests table
CREATE TABLE public.evaluation_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  period_id UUID REFERENCES public.evaluation_periods(id) ON DELETE SET NULL,
  review_type TEXT NOT NULL CHECK (review_type IN ('probation', 'quarterly', 'bi_annual', 'annual', 'promotion')),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'expired')),
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.evaluation_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_section_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for evaluation_periods
CREATE POLICY "Admins can manage evaluation periods"
  ON public.evaluation_periods FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view active evaluation periods"
  ON public.evaluation_periods FOR SELECT
  USING (is_active = true);

-- RLS Policies for employee_evaluations
CREATE POLICY "Admins can manage all evaluations"
  ON public.employee_evaluations FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees can insert their own self-evaluations"
  ON public.employee_evaluations FOR INSERT
  WITH CHECK (
    auth.uid() = employee_id 
    AND evaluation_type = 'self_evaluation'
    AND EXISTS (
      SELECT 1 FROM public.evaluation_requests
      WHERE employee_id = auth.uid()
      AND status = 'pending'
    )
  );

CREATE POLICY "Employees can update their own draft self-evaluations"
  ON public.employee_evaluations FOR UPDATE
  USING (
    auth.uid() = employee_id 
    AND evaluation_type = 'self_evaluation'
    AND status = 'draft'
  );

CREATE POLICY "Employees can view their own finalized evaluations"
  ON public.employee_evaluations FOR SELECT
  USING (
    auth.uid() = employee_id 
    AND status = 'finalized'
  );

-- RLS Policies for evaluation_section_scores
CREATE POLICY "Admins can manage all section scores"
  ON public.evaluation_section_scores FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees can manage scores for their own draft self-evaluations"
  ON public.evaluation_section_scores FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.employee_evaluations
      WHERE id = evaluation_section_scores.evaluation_id
      AND employee_id = auth.uid()
      AND evaluation_type = 'self_evaluation'
      AND status = 'draft'
    )
  );

CREATE POLICY "Employees can view their own finalized evaluation scores"
  ON public.evaluation_section_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employee_evaluations
      WHERE id = evaluation_section_scores.evaluation_id
      AND employee_id = auth.uid()
      AND status = 'finalized'
    )
  );

-- RLS Policies for evaluation_kpis
CREATE POLICY "Admins can manage all KPIs"
  ON public.evaluation_kpis FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees can manage KPIs for their own draft self-evaluations"
  ON public.evaluation_kpis FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.employee_evaluations
      WHERE id = evaluation_kpis.evaluation_id
      AND employee_id = auth.uid()
      AND evaluation_type = 'self_evaluation'
      AND status = 'draft'
    )
  );

CREATE POLICY "Employees can view their own finalized evaluation KPIs"
  ON public.evaluation_kpis FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employee_evaluations
      WHERE id = evaluation_kpis.evaluation_id
      AND employee_id = auth.uid()
      AND status = 'finalized'
    )
  );

-- RLS Policies for evaluation_requests
CREATE POLICY "Admins can manage all evaluation requests"
  ON public.evaluation_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Employees can view their own pending requests"
  ON public.evaluation_requests FOR SELECT
  USING (auth.uid() = employee_id);

CREATE POLICY "Employees can update their own requests when submitting"
  ON public.evaluation_requests FOR UPDATE
  USING (auth.uid() = employee_id AND status = 'pending');

-- Create updated_at trigger function usage
CREATE TRIGGER update_evaluation_periods_updated_at
  BEFORE UPDATE ON public.evaluation_periods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_evaluations_updated_at
  BEFORE UPDATE ON public.employee_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evaluation_section_scores_updated_at
  BEFORE UPDATE ON public.evaluation_section_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();