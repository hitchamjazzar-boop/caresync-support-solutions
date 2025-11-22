-- Create voting periods table
CREATE TABLE public.voting_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(month, year)
);

-- Create employee nominations table
CREATE TABLE public.employee_nominations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voting_period_id UUID NOT NULL REFERENCES voting_periods(id) ON DELETE CASCADE,
  nominated_user_id UUID NOT NULL,
  nominator_user_id UUID NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(voting_period_id, nominator_user_id, nominated_user_id)
);

-- Create employee votes table
CREATE TABLE public.employee_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voting_period_id UUID NOT NULL REFERENCES voting_periods(id) ON DELETE CASCADE,
  nominated_user_id UUID NOT NULL,
  voter_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(voting_period_id, voter_user_id)
);

-- Enable RLS
ALTER TABLE public.voting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for voting_periods
CREATE POLICY "Everyone can view voting periods"
  ON public.voting_periods FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage voting periods"
  ON public.voting_periods FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for employee_nominations
CREATE POLICY "Users can nominate others"
  ON public.employee_nominations FOR INSERT
  WITH CHECK (
    auth.uid() = nominator_user_id 
    AND nominated_user_id != nominator_user_id
    AND EXISTS (
      SELECT 1 FROM voting_periods 
      WHERE id = voting_period_id AND status = 'open'
    )
  );

CREATE POLICY "Users can view their own nominations"
  ON public.employee_nominations FOR SELECT
  USING (auth.uid() = nominator_user_id);

CREATE POLICY "Users can view that they were nominated (but not who/why)"
  ON public.employee_nominations FOR SELECT
  USING (auth.uid() = nominated_user_id);

CREATE POLICY "Admins can view all nominations"
  ON public.employee_nominations FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete nominations"
  ON public.employee_nominations FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for employee_votes
CREATE POLICY "Users can vote once per period"
  ON public.employee_votes FOR INSERT
  WITH CHECK (
    auth.uid() = voter_user_id 
    AND nominated_user_id != voter_user_id
    AND EXISTS (
      SELECT 1 FROM voting_periods 
      WHERE id = voting_period_id AND status = 'open'
    )
  );

CREATE POLICY "Users can view their own votes"
  ON public.employee_votes FOR SELECT
  USING (auth.uid() = voter_user_id);

CREATE POLICY "Admins can view all votes"
  ON public.employee_votes FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete votes"
  ON public.employee_votes FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));