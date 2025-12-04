-- Create employee_invoices table
CREATE TABLE public.employee_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  base_salary NUMERIC NOT NULL,
  deductions NUMERIC DEFAULT 0,
  deduction_notes TEXT,
  absent_days INTEGER DEFAULT 0,
  absent_deduction NUMERIC DEFAULT 0,
  additional_items JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  total_amount NUMERIC NOT NULL,
  balance_due NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employee_invoices ENABLE ROW LEVEL SECURITY;

-- Admins can manage all invoices
CREATE POLICY "Admins can manage all invoices"
ON public.employee_invoices
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own invoices
CREATE POLICY "Users can view own invoices"
ON public.employee_invoices
FOR SELECT
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_employee_invoices_updated_at
BEFORE UPDATE ON public.employee_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();