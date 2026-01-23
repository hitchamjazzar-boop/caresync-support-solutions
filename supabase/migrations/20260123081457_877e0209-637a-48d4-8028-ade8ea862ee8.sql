-- Create attendance_breaks table for tracking multiple break types
CREATE TABLE public.attendance_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id UUID NOT NULL REFERENCES public.attendance(id) ON DELETE CASCADE,
  break_type TEXT NOT NULL CHECK (break_type IN ('lunch', 'coffee', 'bathroom', 'personal', 'other')),
  break_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  break_end TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_attendance_breaks_attendance_id ON public.attendance_breaks(attendance_id);

-- Enable RLS
ALTER TABLE public.attendance_breaks ENABLE ROW LEVEL SECURITY;

-- Users can insert breaks for their own attendance records
CREATE POLICY "Users can insert own breaks"
ON public.attendance_breaks
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.attendance
    WHERE attendance.id = attendance_breaks.attendance_id
    AND attendance.user_id = auth.uid()
  )
);

-- Users can update their own breaks (to end them)
CREATE POLICY "Users can update own breaks"
ON public.attendance_breaks
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.attendance
    WHERE attendance.id = attendance_breaks.attendance_id
    AND attendance.user_id = auth.uid()
  )
);

-- Users can view their own breaks
CREATE POLICY "Users can view own breaks"
ON public.attendance_breaks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.attendance
    WHERE attendance.id = attendance_breaks.attendance_id
    AND attendance.user_id = auth.uid()
  )
);

-- Admins can view all breaks
CREATE POLICY "Admins can view all breaks"
ON public.attendance_breaks
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage all breaks
CREATE POLICY "Admins can manage all breaks"
ON public.attendance_breaks
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));