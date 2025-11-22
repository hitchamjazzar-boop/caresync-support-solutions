-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view participants in their events" ON public.secret_santa_participants;

-- Create a security definer function to check if user is a participant
CREATE OR REPLACE FUNCTION public.is_event_participant(_user_id uuid, _event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.secret_santa_participants
    WHERE user_id = _user_id
      AND event_id = _event_id
  )
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Users can view participants in their events"
ON public.secret_santa_participants
FOR SELECT
TO authenticated
USING (public.is_event_participant(auth.uid(), event_id));