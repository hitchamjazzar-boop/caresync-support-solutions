-- Create enum for memo types
CREATE TYPE memo_type AS ENUM ('memo', 'reminder', 'warning');

-- Create memos table
CREATE TABLE public.memos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type memo_type NOT NULL DEFAULT 'memo',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.memos ENABLE ROW LEVEL SECURITY;

-- Allow admins to create memos
CREATE POLICY "Admins can create memos"
  ON public.memos
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Allow admins to view all memos
CREATE POLICY "Admins can view all memos"
  ON public.memos
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Allow users to view their own memos
CREATE POLICY "Users can view their own memos"
  ON public.memos
  FOR SELECT
  TO authenticated
  USING (auth.uid() = recipient_id);

-- Allow users to update their own memos (mark as read)
CREATE POLICY "Users can update their own memos"
  ON public.memos
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = recipient_id);

-- Allow admins to update memos
CREATE POLICY "Admins can update memos"
  ON public.memos
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Allow admins to delete memos
CREATE POLICY "Admins can delete memos"
  ON public.memos
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_memos_updated_at
  BEFORE UPDATE ON public.memos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_memos_recipient_id ON public.memos(recipient_id);
CREATE INDEX idx_memos_is_read ON public.memos(is_read);
CREATE INDEX idx_memos_created_at ON public.memos(created_at DESC);