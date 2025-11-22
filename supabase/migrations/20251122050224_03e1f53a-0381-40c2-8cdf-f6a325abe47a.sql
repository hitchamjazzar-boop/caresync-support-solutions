-- Enable realtime for announcement_comments table
ALTER TABLE public.announcement_comments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_comments;

-- Enable realtime for announcement_reactions table
ALTER TABLE public.announcement_reactions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_reactions;