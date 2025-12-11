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
import { Megaphone, Loader2 } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
}

interface SendShoutoutRequestDialogProps {
  preselectedEmployeeId?: string;
  trigger?: React.ReactNode;
}

export function SendShoutoutRequestDialog({ 
  preselectedEmployeeId,
  trigger 
}: SendShoutoutRequestDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [adminName, setAdminName] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(preselectedEmployeeId || '');
  const [targetEmployee, setTargetEmployee] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (open) {
      fetchEmployees();
      fetchAdminName();
      if (preselectedEmployeeId) {
        setSelectedEmployee(preselectedEmployeeId);
      }
    }
  }, [open, preselectedEmployeeId]);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name');
    
    if (data) {
      setEmployees(data);
    }
  };

  const fetchAdminName = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
    
    if (data) {
      setAdminName(data.full_name);
    }
  };

  const sendNotification = async (recipientId: string, targetId?: string) => {
    try {
      const { error } = await supabase.functions.invoke('send-shoutout-notification', {
        body: {
          recipientId,
          adminName,
          message: message || undefined,
          targetUserId: targetId || undefined,
        },
      });
      
      if (error) {
        console.error('Error sending notification:', error);
      } else {
        console.log('Notification sent successfully');
      }
    } catch (err) {
      console.error('Failed to send notification:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedEmployee) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('shoutout_requests')
        .insert({
          admin_id: user.id,
          recipient_id: selectedEmployee,
          target_user_id: targetEmployee || null,
          message: message || null,
          status: 'pending',
        });

      if (error) throw error;

      // Send email notification (non-blocking)
      sendNotification(selectedEmployee, targetEmployee || undefined);

      toast({
        title: 'Request sent',
        description: 'The shout out request has been sent to the employee.',
      });
      setOpen(false);
      setSelectedEmployee('');
      setTargetEmployee('');
      setMessage('');
    } catch (error) {
      console.error('Error sending request:', error);
      toast({
        title: 'Error',
        description: 'Failed to send shout out request.',
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
          <Button variant="outline" size="sm">
            <Megaphone className="h-4 w-4 mr-2" />
            Request Shout Out
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Shout Out</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employee">Who should give the shout out? *</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an employee to write the shout out" />
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
            <Label htmlFor="target">Who should receive the shout out? (optional)</Label>
            <Select value={targetEmployee} onValueChange={setTargetEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Let them choose, or select a specific employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Let them choose</SelectItem>
                {employees.filter(emp => emp.id !== selectedEmployee).map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              placeholder="e.g., Please recognize someone who helped you this week"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedEmployee}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
