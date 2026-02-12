
-- Add screen_monitoring_required to profiles for admin to toggle per employee
ALTER TABLE public.profiles ADD COLUMN screen_monitoring_required boolean NOT NULL DEFAULT false;
