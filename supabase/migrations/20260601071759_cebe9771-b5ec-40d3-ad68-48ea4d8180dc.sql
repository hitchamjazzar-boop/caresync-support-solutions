-- 1. Fix employee_achievements visibility bypass
DROP POLICY IF EXISTS "Everyone can view employee achievements" ON public.employee_achievements;

CREATE POLICY "View visible achievements or own/admin"
ON public.employee_achievements
FOR SELECT
TO authenticated
USING (
  is_visible = true
  OR user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- 2. Restrict org_chart to authenticated users only
DROP POLICY IF EXISTS "Anyone can view org chart" ON public.org_chart;

CREATE POLICY "Authenticated users can view org chart"
ON public.org_chart
FOR SELECT
TO authenticated
USING (true);
