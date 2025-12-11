-- Enable realtime for shoutout_requests and feedback_requests tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.shoutout_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback_requests;