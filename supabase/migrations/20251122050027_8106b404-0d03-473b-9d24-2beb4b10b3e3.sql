-- Add foreign key constraints to employee_achievements table
ALTER TABLE public.employee_achievements
ADD CONSTRAINT fk_employee_achievements_user_id
FOREIGN KEY (user_id) REFERENCES public.profiles(id)
ON DELETE CASCADE;

ALTER TABLE public.employee_achievements
ADD CONSTRAINT fk_employee_achievements_awarded_by
FOREIGN KEY (awarded_by) REFERENCES public.profiles(id)
ON DELETE CASCADE;

ALTER TABLE public.employee_achievements
ADD CONSTRAINT fk_employee_achievements_achievement_type_id
FOREIGN KEY (achievement_type_id) REFERENCES public.achievement_types(id)
ON DELETE CASCADE;