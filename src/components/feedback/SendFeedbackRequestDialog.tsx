import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2 } from 'lucide-react';
import { sendBrowserNotification } from '@/hooks/useBrowserNotifications';

interface Profile {
  id: string;
  full_name: string;
}

export function SendFeedbackRequestDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [targetEmployee, setTargetEmployee] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchEmployees();
    }
  }, [open]);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .order('full_name');
    setEmployees(data || []);
  };

  const handleSubmit = async () => {
    if (!selectedEmployee) {
      toast({
        title: 'Error',
        description: 'Please select an employee',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Get admin name
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();

      const { error } = await supabase
        .from('feedback_requests')
        .insert({
          admin_id: user?.id,
          recipient_id: selectedEmployee,
          target_user_id: targetEmployee || null,
          message: message.trim() || null,
        });

      if (error) throw error;

      // Send email notification
      try {
        await supabase.functions.invoke('send-feedback-notification', {
          body: {
            recipientId: selectedEmployee,
            adminName: adminProfile?.full_name || 'Admin',
            message: message.trim() || null,
            targetUserId: targetEmployee || null,
          },
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }

      // Send browser notification to the recipient
      const recipientName = employees.find(e => e.id === selectedEmployee)?.full_name || 'Employee';
      sendBrowserNotification(
        'New Feedback Request',
        `${adminProfile?.full_name || 'Admin'} has requested feedback from you.`,
        `feedback-request-${selectedEmployee}`
      );

      toast({
        title: 'Success',
        description: 'Feedback request sent successfully',
      });

      setOpen(false);
      setSelectedEmployee('');
      setTargetEmployee('');
      setMessage('');
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <Send className="mr-2 h-4 w-4" />
          Request Feedback
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Feedback</DialogTitle>
          <DialogDescription>
            Ask an employee to submit feedback about the workplace
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Who should provide feedback? *</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an employee to write feedback" />
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
            <Label>Feedback about whom? (optional)</Label>
            <Select value={targetEmployee} onValueChange={(val) => setTargetEmployee(val === 'general' ? '' : val)}>
              <SelectTrigger>
                <SelectValue placeholder="General feedback, or about a specific employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General feedback</SelectItem>
                {employees.filter(emp => emp.id !== selectedEmployee).map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Message (optional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a note about what feedback you're looking for..."
              rows={3}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !selectedEmployee}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Request'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
