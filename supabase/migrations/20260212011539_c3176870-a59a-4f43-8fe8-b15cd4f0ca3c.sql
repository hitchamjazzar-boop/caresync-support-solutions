
-- Add screen_monitoring_enabled column to attendance
ALTER TABLE public.attendance ADD COLUMN screen_monitoring_enabled boolean NOT NULL DEFAULT false;

-- Create screen_captures table
CREATE TABLE public.screen_captures (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attendance_id uuid NOT NULL REFERENCES public.attendance(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  image_url text NOT NULL,
  captured_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.screen_captures ENABLE ROW LEVEL SECURITY;

-- Admins can view all screen captures
CREATE POLICY "Admins can view all screen captures"
ON public.screen_captures
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete screen captures
CREATE POLICY "Admins can delete screen captures"
ON public.screen_captures
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can insert their own screen captures
CREATE POLICY "Users can insert own screen captures"
ON public.screen_captures
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create screen-captures storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('screen-captures', 'screen-captures', false);

-- Storage policies: authenticated users can upload to their own folder
CREATE POLICY "Users can upload screen captures"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'screen-captures' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admins can view all screen captures in storage
CREATE POLICY "Admins can view screen captures"
ON storage.objects
FOR SELECT
USING (bucket_id = 'screen-captures' AND has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own uploaded captures (needed for upload)
CREATE POLICY "Users can view own screen captures"
ON storage.objects
FOR SELECT
USING (bucket_id = 'screen-captures' AND auth.uid()::text = (storage.foldername(name))[1]);
