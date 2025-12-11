import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface SubmitFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  targetUserName?: string;
  onSuccess?: () => void;
}

export function SubmitFeedbackDialog({
  open,
  onOpenChange,
  requestId,
  targetUserName,
  onSuccess,
}: SubmitFeedbackDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Insert the feedback
      const { error: feedbackError } = await supabase
        .from('employee_feedback')
        .insert({
          user_id: user?.id,
          subject: subject.trim(),
          message: message.trim(),
        });

      if (feedbackError) throw feedbackError;

      // Update the request status
      const { error: updateError } = await supabase
        .from('feedback_requests')
        .update({ status: 'completed' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      toast({
        title: 'Success',
        description: 'Your feedback has been submitted',
      });

      onOpenChange(false);
      setSubject('');
      setMessage('');
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Feedback</DialogTitle>
          <DialogDescription>
            {targetUserName 
              ? `Share your feedback about ${targetUserName}`
              : 'Share your thoughts, suggestions, or concerns with the admin team'
            }
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {targetUserName && (
            <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
              Admin has requested feedback specifically about <strong>{targetUserName}</strong>.
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            Your feedback will be submitted for admin review. Your identity will be visible only to administrators.
          </p>
          <div className="space-y-2">
            <Label>Subject *</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of your feedback"
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label>Message *</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Detailed feedback message..."
              rows={5}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              {message.length}/1000 characters
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !subject.trim() || !message.trim()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Feedback'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
