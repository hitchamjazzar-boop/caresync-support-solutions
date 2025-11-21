-- Drop the constraint if it exists (in case it's in a bad state)
ALTER TABLE public.org_chart
DROP CONSTRAINT IF EXISTS org_chart_user_id_fkey;

-- Add foreign key constraint from org_chart to profiles
ALTER TABLE public.org_chart
ADD CONSTRAINT org_chart_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;