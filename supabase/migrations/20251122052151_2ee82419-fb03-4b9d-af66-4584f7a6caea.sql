-- Create enums for Secret Santa
CREATE TYPE secret_santa_status AS ENUM ('draft', 'open', 'assigned', 'completed');
CREATE TYPE wishlist_priority AS ENUM ('high', 'medium', 'low');

-- Create secret_santa_events table
CREATE TABLE public.secret_santa_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  budget_limit NUMERIC,
  status secret_santa_status NOT NULL DEFAULT 'draft',
  reveal_enabled BOOLEAN NOT NULL DEFAULT false,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create secret_santa_participants table
CREATE TABLE public.secret_santa_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.secret_santa_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(event_id, user_id)
);

-- Create secret_santa_assignments table
CREATE TABLE public.secret_santa_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.secret_santa_events(id) ON DELETE CASCADE,
  giver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, giver_id),
  UNIQUE(event_id, receiver_id)
);

-- Create secret_santa_wishlists table
CREATE TABLE public.secret_santa_wishlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.secret_santa_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_title TEXT NOT NULL,
  item_description TEXT,
  item_url TEXT,
  priority wishlist_priority NOT NULL DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.secret_santa_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secret_santa_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secret_santa_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secret_santa_wishlists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for secret_santa_events
CREATE POLICY "Everyone can view non-completed events"
ON public.secret_santa_events
FOR SELECT
TO authenticated
USING (status != 'completed');

CREATE POLICY "Admins can view all events"
ON public.secret_santa_events
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create events"
ON public.secret_santa_events
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin') AND auth.uid() = created_by);

CREATE POLICY "Admins can update events"
ON public.secret_santa_events
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete draft events"
ON public.secret_santa_events
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin') AND status = 'draft');

-- RLS Policies for secret_santa_participants
CREATE POLICY "Admins can view all participants"
ON public.secret_santa_participants
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view participants in their events"
ON public.secret_santa_participants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.secret_santa_participants sp
    WHERE sp.event_id = secret_santa_participants.event_id
    AND sp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can join open events"
ON public.secret_santa_participants
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.secret_santa_events
    WHERE id = event_id AND status = 'open'
  )
);

CREATE POLICY "Users can remove themselves before assignment"
ON public.secret_santa_participants
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.secret_santa_events
    WHERE id = event_id AND status = 'open'
  )
);

CREATE POLICY "Admins can manage all participants"
ON public.secret_santa_participants
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for secret_santa_assignments (CRITICAL - Most Restrictive)
CREATE POLICY "Admins can view all assignments"
ON public.secret_santa_assignments
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own assignment if reveal is enabled"
ON public.secret_santa_assignments
FOR SELECT
TO authenticated
USING (
  auth.uid() = giver_id
  AND EXISTS (
    SELECT 1 FROM public.secret_santa_events
    WHERE id = event_id AND reveal_enabled = true
  )
);

CREATE POLICY "Admins can manage assignments"
ON public.secret_santa_assignments
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for secret_santa_wishlists
CREATE POLICY "Users can view their own wishlist"
ON public.secret_santa_wishlists
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their receiver's wishlist"
ON public.secret_santa_wishlists
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.secret_santa_assignments sa
    WHERE sa.giver_id = auth.uid()
    AND sa.receiver_id = secret_santa_wishlists.user_id
    AND sa.event_id = secret_santa_wishlists.event_id
  )
);

CREATE POLICY "Admins can view all wishlists"
ON public.secret_santa_wishlists
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage their own wishlist items"
ON public.secret_santa_wishlists
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger for wishlist updated_at
CREATE TRIGGER update_secret_santa_wishlists_updated_at
BEFORE UPDATE ON public.secret_santa_wishlists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_secret_santa_events_status ON public.secret_santa_events(status);
CREATE INDEX idx_secret_santa_participants_event_id ON public.secret_santa_participants(event_id);
CREATE INDEX idx_secret_santa_participants_user_id ON public.secret_santa_participants(user_id);
CREATE INDEX idx_secret_santa_assignments_event_id ON public.secret_santa_assignments(event_id);
CREATE INDEX idx_secret_santa_assignments_giver_id ON public.secret_santa_assignments(giver_id);
CREATE INDEX idx_secret_santa_wishlists_event_user ON public.secret_santa_wishlists(event_id, user_id);