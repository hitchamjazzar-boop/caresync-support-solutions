-- Add escalation fields to memos table
ALTER TABLE public.memos
  ADD COLUMN escalate_after_hours INTEGER DEFAULT 24,
  ADD COLUMN escalated BOOLEAN DEFAULT false,
  ADD COLUMN escalated_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN escalation_memo_id UUID REFERENCES public.memos(id) ON DELETE SET NULL;

-- Add index for efficient escalation queries
CREATE INDEX idx_memos_escalation_check 
  ON public.memos(is_read, escalated, created_at) 
  WHERE is_read = false AND escalated = false;

-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;