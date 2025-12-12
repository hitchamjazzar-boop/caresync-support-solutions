import { useState, useEffect } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
}

interface SubmitShoutoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: string;
  targetUserId?: string | null;
  recipientId?: string | null; // The original request recipient (for admin answering on behalf)
  onSuccess?: () => void;
}

export function SubmitShoutoutDialog({ 
  open, 
  onOpenChange, 
  requestId,
  targetUserId,
  recipientId,
  onSuccess 
}: SubmitShoutoutDialogProps) {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [message, setMessage] = useState('');

  // Determine who the shoutout should be "from"
  // If admin is answering on behalf, use the original recipient
  const fromUserId = isAdmin && recipientId ? recipientId : user?.id;

  useEffect(() => {
    if (open) {
      // Pre-select target if specified - do this immediately
      if (targetUserId) {
        setSelectedEmployee(targetUserId);
      } else {
        setSelectedEmployee('');
      }
      setMessage('');
      fetchEmployees();
    }
  }, [open, targetUserId]);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .neq('id', fromUserId) // Exclude the "from" user
      .order('full_name');
    
    if (data) {
      setEmployees(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromUserId || !selectedEmployee || !message.trim()) return;

    setLoading(true);
    try {
      // Create the shoutout on behalf of the original recipient
      const { error: shoutoutError } = await supabase
        .from('shoutouts')
        .insert({
          request_id: requestId,
          from_user_id: fromUserId,
          to_user_id: selectedEmployee,
          message: message.trim(),
        });

      if (shoutoutError) throw shoutoutError;

      // Update the request status
      const { error: updateError } = await supabase
        .from('shoutout_requests')
        .update({ status: 'completed' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      toast({
        title: 'Shout out sent!',
        description: isAdmin && recipientId ? 'Shout out submitted on behalf of the user.' : 'Your recognition has been submitted.',
      });
      onOpenChange(false);
      setSelectedEmployee('');
      setMessage('');
      onSuccess?.();
    } catch (error) {
      console.error('Error submitting shoutout:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit shout out.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Give a Shout Out</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Your recognition will be submitted for admin review and published anonymously.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="colleague">Who would you like to recognize?</Label>
            <Select 
              value={selectedEmployee} 
              onValueChange={setSelectedEmployee}
              disabled={!!targetUserId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a colleague" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {targetUserId && (
              <p className="text-xs text-muted-foreground">
                Admin has requested you recognize this specific person.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Your message</Label>
            <Textarea
              id="message"
              placeholder="Share what this person did that you'd like to recognize..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedEmployee || !message.trim()}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Submit Shout Out
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
