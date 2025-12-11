-- Add target_user_id to shoutout_requests table
ALTER TABLE public.shoutout_requests 
ADD COLUMN target_user_id uuid REFERENCES public.profiles(id);

-- Add target_user_id to feedback_requests table
ALTER TABLE public.feedback_requests 
ADD COLUMN target_user_id uuid REFERENCES public.profiles(id);

-- Add comment for clarity
COMMENT ON COLUMN public.shoutout_requests.target_user_id IS 'Optional: The employee who should receive the shoutout';
COMMENT ON COLUMN public.feedback_requests.target_user_id IS 'Optional: The employee who should receive the feedback about';