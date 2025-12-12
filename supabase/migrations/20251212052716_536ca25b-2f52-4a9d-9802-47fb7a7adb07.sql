-- Create enum for task priority
CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high');

-- Create enum for task status
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed', 'skipped');

-- Create default_tasks table (admin-defined default tasks)
CREATE TABLE public.default_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  priority task_priority NOT NULL DEFAULT 'medium',
  category TEXT NOT NULL DEFAULT 'General',
  time_estimate INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  order_position INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employee_daily_tasks table
CREATE TABLE public.employee_daily_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_date DATE NOT NULL DEFAULT CURRENT_DATE,
  default_task_id UUID REFERENCES public.default_tasks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  priority task_priority NOT NULL DEFAULT 'medium',
  status task_status NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, task_date, default_task_id)
);

-- Enable RLS
ALTER TABLE public.default_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_daily_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for default_tasks
CREATE POLICY "Admins can manage default tasks"
ON public.default_tasks
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view active default tasks"
ON public.default_tasks
FOR SELECT
USING (is_active = true);

-- RLS Policies for employee_daily_tasks
CREATE POLICY "Users can view own daily tasks"
ON public.employee_daily_tasks
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily tasks"
ON public.employee_daily_tasks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily tasks"
ON public.employee_daily_tasks
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all daily tasks"
ON public.employee_daily_tasks
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all daily tasks"
ON public.employee_daily_tasks
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_default_tasks_updated_at
BEFORE UPDATE ON public.default_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_daily_tasks_updated_at
BEFORE UPDATE ON public.employee_daily_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();