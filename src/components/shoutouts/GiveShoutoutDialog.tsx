import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Heart, Loader2 } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
}

interface GiveShoutoutDialogProps {
  trigger?: React.ReactNode;
}

export function GiveShoutoutDialog({ trigger }: GiveShoutoutDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (open) {
      fetchEmployees();
      // Reset form when dialog opens
      setSelectedEmployee('');
      setMessage('');
    }
  }, [open]);

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .neq('id', user?.id)
      .order('full_name');
    
    console.log('Fetched employees:', data, 'Error:', error);
    
    if (data) {
      setEmployees(data);
    }
  };

  const handleEmployeeChange = (value: string) => {
    console.log('Employee selected:', value);
    setSelectedEmployee(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Submit attempted:', { user: user?.id, selectedEmployee, message: message.trim() });
    
    if (!user || !selectedEmployee || !message.trim()) {
      console.log('Validation failed:', { hasUser: !!user, hasEmployee: !!selectedEmployee, hasMessage: !!message.trim() });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('shoutouts')
        .insert({
          from_user_id: user.id,
          to_user_id: selectedEmployee,
          message: message.trim(),
        });

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      toast({
        title: 'Shout out sent!',
        description: 'Your recognition has been submitted for review.',
      });
      // Reset form but keep dialog open for another submission
      setSelectedEmployee('');
      setMessage('');
      setOpen(false);
    } catch (error) {
      console.error('Error submitting shoutout:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit shout out. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="w-full justify-start">
            <Heart className="h-4 w-4 mr-2" />
            Give a Shout Out
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Give a Shout Out
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Your recognition will be submitted for admin review and published anonymously.
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="colleague">Who would you like to recognize?</Label>
            <Select value={selectedEmployee} onValueChange={handleEmployeeChange}>
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedEmployee || !message.trim()}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Shout Out
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
