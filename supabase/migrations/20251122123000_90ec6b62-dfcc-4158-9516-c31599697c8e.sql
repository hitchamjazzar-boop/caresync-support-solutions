-- Add meeting link field to calendar_events
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS meeting_link text;

-- Create calendar event responses table for RSVP tracking
CREATE TABLE IF NOT EXISTS calendar_event_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES calendar_events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  response_status text CHECK (response_status IN ('pending', 'accepted', 'declined', 'tentative')) NOT NULL DEFAULT 'pending',
  responded_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS on calendar_event_responses
ALTER TABLE calendar_event_responses ENABLE ROW LEVEL SECURITY;

-- Admins can manage all responses
CREATE POLICY "Admins can manage all responses"
ON calendar_event_responses
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view responses for events they're invited to
CREATE POLICY "Users can view responses for their events"
ON calendar_event_responses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM calendar_events
    WHERE calendar_events.id = calendar_event_responses.event_id
    AND (
      calendar_events.created_by = auth.uid()
      OR auth.uid() = ANY(calendar_events.target_users)
      OR calendar_events.is_public = true
    )
  )
);

-- Users can update their own responses
CREATE POLICY "Users can update own responses"
ON calendar_event_responses
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can insert their own responses
CREATE POLICY "Users can insert own responses"
ON calendar_event_responses
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_calendar_event_responses_event_id ON calendar_event_responses(event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_responses_user_id ON calendar_event_responses(user_id);

-- Add trigger to update updated_at
CREATE TRIGGER update_calendar_event_responses_updated_at
BEFORE UPDATE ON calendar_event_responses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add indexes to calendar_events for better performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_target_users ON calendar_events USING GIN(target_users);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_end_time ON calendar_events(end_time);