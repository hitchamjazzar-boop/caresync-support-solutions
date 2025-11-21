-- Add is_pinned column to announcements table
ALTER TABLE announcements ADD COLUMN is_pinned boolean NOT NULL DEFAULT false;

-- Create announcement_acknowledgments table to track user acknowledgments
CREATE TABLE announcement_acknowledgments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  acknowledged_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, announcement_id)
);

-- Enable RLS
ALTER TABLE announcement_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Users can view their own acknowledgments
CREATE POLICY "Users can view own acknowledgments"
  ON announcement_acknowledgments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own acknowledgments
CREATE POLICY "Users can insert own acknowledgments"
  ON announcement_acknowledgments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all acknowledgments
CREATE POLICY "Admins can view all acknowledgments"
  ON announcement_acknowledgments
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_announcement_acknowledgments_user_id ON announcement_acknowledgments(user_id);
CREATE INDEX idx_announcement_acknowledgments_announcement_id ON announcement_acknowledgments(announcement_id);