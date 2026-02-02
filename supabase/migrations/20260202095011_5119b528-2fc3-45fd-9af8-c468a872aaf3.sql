-- Add target_employee_id to evaluation_requests for peer evaluation requests
ALTER TABLE public.evaluation_requests
ADD COLUMN target_employee_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add comment explaining the column
COMMENT ON COLUMN public.evaluation_requests.target_employee_id IS 'For peer evaluations: the employee being evaluated. If null, it is a self-evaluation request.';