import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MessageSquare } from 'lucide-react';

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageSquare className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Reply to Memo</DialogTitle>
          <DialogDescription>
            Replying to: <span className="font-medium">{memoTitle}</span>
          </DialogDescription>
        </DialogHeader>
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
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleReply} disabled={loading || !content.trim()}>
            {loading ? 'Sending...' : 'Send Reply'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
