-- Create calendar events table
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('appointment', 'project', 'event', 'reminder', 'birthday', 'holiday', 'meeting')),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT false,
  location TEXT,
  color TEXT DEFAULT '#3b82f6',
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- For recurring events
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT,
  recurrence_end_date TIMESTAMP WITH TIME ZONE,
  
  -- For reminders
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_minutes_before INTEGER DEFAULT 30,
  
  -- Visibility
  is_public BOOLEAN DEFAULT true,
  target_departments TEXT[],
  target_users UUID[]
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calendar_events
CREATE POLICY "Everyone can view public events"
  ON public.calendar_events
  FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view events targeted to them"
  ON public.calendar_events
  FOR SELECT
  USING (
    auth.uid() = ANY(target_users) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.department = ANY(calendar_events.target_departments)
    )
  );

CREATE POLICY "Admins can manage all events"
  ON public.calendar_events
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create events"
  ON public.calendar_events
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own events"
  ON public.calendar_events
  FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own events"
  ON public.calendar_events
  FOR DELETE
  USING (auth.uid() = created_by);

-- Create notification acknowledgments table
CREATE TABLE IF NOT EXISTS public.notification_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_type TEXT NOT NULL,
  notification_id UUID NOT NULL,
  acknowledged_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, notification_type, notification_id)
);

-- Enable RLS
ALTER TABLE public.notification_acknowledgments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_acknowledgments
CREATE POLICY "Users can manage their own acknowledgments"
  ON public.notification_acknowledgments
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all acknowledgments"
  ON public.notification_acknowledgments
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX idx_calendar_events_end_time ON public.calendar_events(end_time);
CREATE INDEX idx_calendar_events_created_by ON public.calendar_events(created_by);
CREATE INDEX idx_calendar_events_event_type ON public.calendar_events(event_type);
CREATE INDEX idx_notification_acknowledgments_user_id ON public.notification_acknowledgments(user_id);
CREATE INDEX idx_notification_acknowledgments_notification_type ON public.notification_acknowledgments(notification_type);