-- Allow authenticated users to view profiles that are in the org chart
CREATE POLICY "Users can view profiles in org chart"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.org_chart
    WHERE org_chart.user_id = profiles.id
  )
);