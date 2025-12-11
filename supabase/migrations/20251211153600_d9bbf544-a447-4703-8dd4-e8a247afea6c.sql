-- Create feedback_requests table similar to shoutout_requests
CREATE TABLE public.feedback_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.feedback_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all feedback requests"
ON public.feedback_requests
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own feedback requests"
ON public.feedback_requests
FOR SELECT
USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update their own feedback requests"
ON public.feedback_requests
FOR UPDATE
USING (auth.uid() = recipient_id);