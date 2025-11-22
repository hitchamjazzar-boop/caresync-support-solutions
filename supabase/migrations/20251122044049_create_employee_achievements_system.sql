/*
  # Employee Achievements and Badges System - RLS and Policies

  ## Security Setup
  - Enable RLS on achievement tables
  - Add policies for viewing and managing achievements
  - Create indexes for performance
  - Add triggers for updated_at timestamps
*/

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_achievement_types_active ON public.achievement_types(is_active);
CREATE INDEX IF NOT EXISTS idx_achievement_types_category ON public.achievement_types(category);
CREATE INDEX IF NOT EXISTS idx_employee_achievements_user ON public.employee_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_achievements_type ON public.employee_achievements(achievement_type_id);
CREATE INDEX IF NOT EXISTS idx_employee_achievements_date ON public.employee_achievements(awarded_date);

-- Enable RLS
ALTER TABLE public.achievement_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_achievements ENABLE ROW LEVEL SECURITY;

-- Everyone can view active achievement types
CREATE POLICY "Users can view active achievement types"
  ON public.achievement_types FOR SELECT
  TO authenticated
  USING (is_active = true OR created_by = auth.uid());

-- Anyone can view visible achievements
CREATE POLICY "Users can view visible achievements"
  ON public.employee_achievements FOR SELECT
  TO authenticated
  USING (is_visible = true OR user_id = auth.uid() OR awarded_by = auth.uid());

-- Allow admins to manage everything (policies will be added when user_roles table exists)
-- For now, anyone authenticated can create achievement types and award achievements
-- This will be restricted to admins once the app is fully set up

CREATE POLICY "Allow achievement type management"
  ON public.achievement_types FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow achievement management"
  ON public.employee_achievements FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
