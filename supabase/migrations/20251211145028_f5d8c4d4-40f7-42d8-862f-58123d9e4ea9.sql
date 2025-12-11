-- Add featured_user_ids array column to announcements table
ALTER TABLE public.announcements 
ADD COLUMN featured_user_ids uuid[] DEFAULT NULL;