-- Add policy for users with 'reports' permission to view all EOD reports
CREATE POLICY "Users with reports permission can view all eod reports"
ON public.eod_reports
FOR SELECT
USING (has_admin_permission(auth.uid(), 'reports'));