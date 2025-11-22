-- Create announcement reactions table for emoji reactions
CREATE TABLE IF NOT EXISTS public.announcement_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'celebrate', 'clap', 'fire')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(announcement_id, user_id, reaction_type)
);

-- Enable RLS on announcement_reactions
ALTER TABLE public.announcement_reactions ENABLE ROW LEVEL SECURITY;

-- Users can view reactions on announcements they can see
CREATE POLICY "Users can view reactions on visible announcements"
ON public.announcement_reactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.announcements
    WHERE announcements.id = announcement_reactions.announcement_id
    AND announcements.is_active = true
  )
);

-- Users can insert their own reactions
CREATE POLICY "Users can insert own reactions"
ON public.announcement_reactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reactions
CREATE POLICY "Users can delete own reactions"
ON public.announcement_reactions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add trigger for updated_at on announcement_reactions
CREATE TRIGGER update_announcement_reactions_updated_at
  BEFORE UPDATE ON public.announcement_reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();