import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MessageSquare, X } from 'lucide-react';

interface MemoReplyDialogProps {
  memoId: string;
  memoTitle: string;
  onReply: () => void;
  buttonText?: string;
}

export function MemoReplyDialog({
  memoId,
  memoTitle,
  onReply,
  buttonText = 'Reply',
}: MemoReplyDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReply = async () => {
    if (!user || !content.trim()) {
      toast.error('Please enter a reply');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('memo_replies').insert({
        memo_id: memoId,
        user_id: user.id,
        content: content.trim(),
      });

      if (error) throw error;

      toast.success('Reply sent successfully');
      setContent('');
      setOpen(false);
      onReply();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <MessageSquare className="h-4 w-4 mr-2" />
        {buttonText}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="relative w-full sm:max-w-[525px] max-h-[90vh] overflow-y-auto rounded-lg border bg-background p-6 shadow-lg">
            <button
              type="button"
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-4">
              <h2 className="text-lg font-semibold leading-none tracking-tight">Reply to Memo</h2>
              <p className="text-sm text-muted-foreground mt-1.5">
                Replying to: <span className="font-medium">{memoTitle}</span>
              </p>
            </div>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reply-content">Your Reply</Label>
                <Textarea
                  id="reply-content"
                  placeholder="Type your reply here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleReply} disabled={loading || !content.trim()}>
                {loading ? 'Sending...' : 'Send Reply'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
