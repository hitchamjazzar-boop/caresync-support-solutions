-- Add is_daily and due_date columns to default_tasks
ALTER TABLE public.default_tasks ADD COLUMN is_daily boolean DEFAULT true;
ALTER TABLE public.default_tasks ADD COLUMN due_date date;

-- Add due_date to employee_daily_tasks for tracking
ALTER TABLE public.employee_daily_tasks ADD COLUMN due_date date;