-- Enable realtime for payroll table
ALTER TABLE public.payroll REPLICA IDENTITY FULL;

-- Add the payroll table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.payroll;