-- Create memo_replies table
CREATE TABLE public.memo_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  memo_id UUID NOT NULL REFERENCES public.memos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.memo_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for memo_replies
CREATE POLICY "Users can view replies on their memos"
  ON public.memo_replies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memos
      WHERE memos.id = memo_replies.memo_id
      AND (memos.recipient_id = auth.uid() OR memos.sender_id = auth.uid())
    )
  );

CREATE POLICY "Users can reply to their own memos"
  ON public.memo_replies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memos
      WHERE memos.id = memo_replies.memo_id
      AND memos.recipient_id = auth.uid()
    )
    AND auth.uid() = user_id
  );

CREATE POLICY "Admins can view all replies"
  ON public.memo_replies FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add indexes
CREATE INDEX idx_memo_replies_memo_id ON public.memo_replies(memo_id);
CREATE INDEX idx_memo_replies_user_id ON public.memo_replies(user_id);
CREATE INDEX idx_memo_replies_created_at ON public.memo_replies(created_at DESC);