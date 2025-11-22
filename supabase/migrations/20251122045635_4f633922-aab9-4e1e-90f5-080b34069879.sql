-- Add missing columns to achievement_types table
ALTER TABLE public.achievement_types
ADD COLUMN category TEXT NOT NULL DEFAULT 'General',
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Add missing columns to employee_achievements table
ALTER TABLE public.employee_achievements
ADD COLUMN reason TEXT,
ADD COLUMN awarded_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
ADD COLUMN is_visible BOOLEAN NOT NULL DEFAULT true;

-- Update existing records to have a category if needed
UPDATE public.achievement_types
SET category = 'General'
WHERE category IS NULL;