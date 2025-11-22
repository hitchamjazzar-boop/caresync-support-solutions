-- Add new fields to profiles table for birthday, address, zodiac sign
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS zodiac_sign TEXT;

-- Create employee feedback table
CREATE TABLE IF NOT EXISTS public.employee_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  admin_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on employee_feedback
ALTER TABLE public.employee_feedback ENABLE ROW LEVEL SECURITY;

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
ON public.employee_feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
ON public.employee_feedback
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
ON public.employee_feedback
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admins can update feedback
CREATE POLICY "Admins can update feedback"
ON public.employee_feedback
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Create announcement comments table
CREATE TABLE IF NOT EXISTS public.announcement_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on announcement_comments
ALTER TABLE public.announcement_comments ENABLE ROW LEVEL SECURITY;

-- Users can view comments on announcements they can see
CREATE POLICY "Users can view comments on visible announcements"
ON public.announcement_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.announcements
    WHERE announcements.id = announcement_comments.announcement_id
    AND announcements.is_active = true
  )
);

-- Users can insert their own comments
CREATE POLICY "Users can insert own comments"
ON public.announcement_comments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
ON public.announcement_comments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
ON public.announcement_comments
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Admins can manage all comments
CREATE POLICY "Admins can manage all comments"
ON public.announcement_comments
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Add image_url field to announcements for employee of the month photos
ALTER TABLE public.announcements
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS featured_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add trigger for updated_at on employee_feedback
CREATE TRIGGER update_employee_feedback_updated_at
  BEFORE UPDATE ON public.employee_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on announcement_comments
CREATE TRIGGER update_announcement_comments_updated_at
  BEFORE UPDATE ON public.announcement_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();