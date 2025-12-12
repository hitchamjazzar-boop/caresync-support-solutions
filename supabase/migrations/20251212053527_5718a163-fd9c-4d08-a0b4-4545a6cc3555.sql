-- Create clients table for company/client linking
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  contact_email text,
  contact_phone text,
  website text,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- RLS policies for clients
CREATE POLICY "Admins can manage clients"
ON public.clients FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view active clients"
ON public.clients FOR SELECT
USING (is_active = true);

-- Add client_id to default_tasks
ALTER TABLE public.default_tasks ADD COLUMN client_id uuid REFERENCES public.clients(id);

-- Add assignment columns to default_tasks
ALTER TABLE public.default_tasks ADD COLUMN assignment_type text DEFAULT 'all';
ALTER TABLE public.default_tasks ADD COLUMN assigned_to uuid[];
ALTER TABLE public.default_tasks ADD COLUMN assigned_departments text[];

-- Add client_id to employee_daily_tasks
ALTER TABLE public.employee_daily_tasks ADD COLUMN client_id uuid REFERENCES public.clients(id);

-- Create updated_at trigger for clients
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();