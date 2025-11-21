-- Add resolved field to memos table
ALTER TABLE public.memos
  ADD COLUMN resolved BOOLEAN DEFAULT false,
  ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add index for resolved memos
CREATE INDEX idx_memos_resolved ON public.memos(resolved, created_at);