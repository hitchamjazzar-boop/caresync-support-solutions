-- Create shoutout_requests table
CREATE TABLE public.shoutout_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create shoutouts table
CREATE TABLE public.shoutouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES public.shoutout_requests(id) ON DELETE SET NULL,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shoutout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shoutouts ENABLE ROW LEVEL SECURITY;

-- RLS policies for shoutout_requests
CREATE POLICY "Admins can manage all requests"
ON public.shoutout_requests
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own requests"
ON public.shoutout_requests
FOR SELECT
USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update their own requests"
ON public.shoutout_requests
FOR UPDATE
USING (auth.uid() = recipient_id);

-- RLS policies for shoutouts
CREATE POLICY "Admins can manage all shoutouts"
ON public.shoutouts
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create shoutouts"
ON public.shoutouts
FOR INSERT
WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can view their own shoutouts"
ON public.shoutouts
FOR SELECT
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Everyone can view published shoutouts"
ON public.shoutouts
FOR SELECT
USING (is_published = true);