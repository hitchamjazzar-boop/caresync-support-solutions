-- Add expires_at column to employee_achievements table
ALTER TABLE public.employee_achievements 
ADD COLUMN expires_at timestamp with time zone DEFAULT NULL;