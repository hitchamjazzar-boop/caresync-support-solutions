-- Add targeting fields to announcements table
ALTER TABLE announcements ADD COLUMN target_type text NOT NULL DEFAULT 'all';
ALTER TABLE announcements ADD COLUMN target_users uuid[] DEFAULT NULL;
ALTER TABLE announcements ADD COLUMN target_roles text[] DEFAULT NULL;
ALTER TABLE announcements ADD COLUMN target_departments text[] DEFAULT NULL;

-- Add check constraint for target_type
ALTER TABLE announcements ADD CONSTRAINT announcements_target_type_check 
  CHECK (target_type IN ('all', 'specific_users', 'roles', 'departments'));

-- Create announcement_reads table to track when users view announcements
CREATE TABLE announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, announcement_id)
);

-- Enable RLS
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;

-- Users can view their own reads
CREATE POLICY "Users can view own reads"
  ON announcement_reads
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own reads
CREATE POLICY "Users can insert own reads"
  ON announcement_reads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all reads
CREATE POLICY "Admins can view all reads"
  ON announcement_reads
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_announcement_reads_user_id ON announcement_reads(user_id);
CREATE INDEX idx_announcement_reads_announcement_id ON announcement_reads(announcement_id);

-- Create function to check if user can see announcement
CREATE OR REPLACE FUNCTION can_user_see_announcement(
  announcement_id uuid,
  user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_type_val text;
  target_users_val uuid[];
  target_roles_val text[];
  target_departments_val text[];
  user_department text;
BEGIN
  -- Get announcement targeting settings
  SELECT target_type, target_users, target_roles, target_departments
  INTO target_type_val, target_users_val, target_roles_val, target_departments_val
  FROM announcements
  WHERE id = announcement_id;

  -- If target is 'all', everyone can see it
  IF target_type_val = 'all' THEN
    RETURN true;
  END IF;

  -- If target is 'specific_users', check if user is in the list
  IF target_type_val = 'specific_users' THEN
    RETURN user_id = ANY(target_users_val);
  END IF;

  -- If target is 'roles', check if user has any of the roles
  IF target_type_val = 'roles' THEN
    RETURN EXISTS (
      SELECT 1
      FROM user_roles
      WHERE user_roles.user_id = can_user_see_announcement.user_id
        AND user_roles.role::text = ANY(target_roles_val)
    );
  END IF;

  -- If target is 'departments', check if user is in any of the departments
  IF target_type_val = 'departments' THEN
    SELECT department INTO user_department
    FROM profiles
    WHERE profiles.id = can_user_see_announcement.user_id;
    
    RETURN user_department = ANY(target_departments_val);
  END IF;

  RETURN false;
END;
$$;