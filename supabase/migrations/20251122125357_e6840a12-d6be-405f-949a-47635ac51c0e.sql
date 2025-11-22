-- Add calendar_color column to profiles table for persistent employee colors
ALTER TABLE profiles 
ADD COLUMN calendar_color TEXT DEFAULT NULL;

-- Create index for faster color lookups
CREATE INDEX idx_profiles_calendar_color ON profiles(calendar_color);

-- Add comment for documentation
COMMENT ON COLUMN profiles.calendar_color IS 'Hex color code for calendar events (e.g., #FF6B9D). NULL means use default color assignment.';