-- Allow all authenticated users to view all attendance records (transparency)
CREATE POLICY "Authenticated users can view all attendance"
ON public.attendance
FOR SELECT
TO authenticated
USING (true);

-- Allow all authenticated users to view all breaks (so attendance views are complete)
CREATE POLICY "Authenticated users can view all breaks"
ON public.attendance_breaks
FOR SELECT
TO authenticated
USING (true);