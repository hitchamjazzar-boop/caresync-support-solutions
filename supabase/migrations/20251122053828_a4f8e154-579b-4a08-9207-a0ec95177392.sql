-- Create function to auto-enroll all users when event opens
CREATE OR REPLACE FUNCTION public.auto_enroll_users_in_secret_santa()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only proceed if status is changing to 'open'
  IF NEW.status = 'open' AND (OLD.status IS NULL OR OLD.status != 'open') THEN
    -- Insert all users from profiles into participants
    INSERT INTO public.secret_santa_participants (event_id, user_id, is_active, joined_at)
    SELECT NEW.id, profiles.id, true, now()
    FROM public.profiles
    ON CONFLICT (event_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-enroll users when event opens
DROP TRIGGER IF EXISTS trigger_auto_enroll_secret_santa ON public.secret_santa_events;

CREATE TRIGGER trigger_auto_enroll_secret_santa
  AFTER INSERT OR UPDATE OF status ON public.secret_santa_events
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_enroll_users_in_secret_santa();

-- Add unique constraint to prevent duplicate enrollments
ALTER TABLE public.secret_santa_participants
  DROP CONSTRAINT IF EXISTS secret_santa_participants_event_id_user_id_key;

ALTER TABLE public.secret_santa_participants
  ADD CONSTRAINT secret_santa_participants_event_id_user_id_key 
  UNIQUE (event_id, user_id);