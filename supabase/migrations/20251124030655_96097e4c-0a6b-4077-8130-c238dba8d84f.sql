-- Create timesheet submissions table
CREATE TABLE public.timesheet_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.timesheet_submissions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can submit own timesheets"
ON public.timesheet_submissions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own timesheets"
ON public.timesheet_submissions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all timesheets"
ON public.timesheet_submissions
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update timesheets"
ON public.timesheet_submissions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_timesheet_submissions_updated_at
BEFORE UPDATE ON public.timesheet_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();