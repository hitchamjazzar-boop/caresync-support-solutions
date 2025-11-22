-- Create achievement_types table
CREATE TABLE public.achievement_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employee_achievements table
CREATE TABLE public.employee_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_type_id UUID NOT NULL REFERENCES public.achievement_types(id) ON DELETE CASCADE,
  awarded_by UUID NOT NULL,
  awarded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.achievement_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_achievements ENABLE ROW LEVEL SECURITY;

-- Policies for achievement_types
CREATE POLICY "Everyone can view achievement types"
  ON public.achievement_types FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage achievement types"
  ON public.achievement_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Policies for employee_achievements
CREATE POLICY "Everyone can view employee achievements"
  ON public.employee_achievements FOR SELECT
  USING (true);

CREATE POLICY "Admins can award achievements"
  ON public.employee_achievements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage achievements"
  ON public.employee_achievements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );