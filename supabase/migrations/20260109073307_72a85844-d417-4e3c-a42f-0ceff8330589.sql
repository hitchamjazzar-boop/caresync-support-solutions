-- Allow all authenticated users to view all nominations
CREATE POLICY "Authenticated users can view all nominations"
ON public.employee_nominations
FOR SELECT
TO authenticated
USING (true);

-- Drop the more restrictive policies that are now redundant
DROP POLICY IF EXISTS "Users can view their own nominations" ON public.employee_nominations;
DROP POLICY IF EXISTS "Users can view that they were nominated (but not who/why)" ON public.employee_nominations;