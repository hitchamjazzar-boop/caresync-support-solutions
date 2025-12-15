import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { X } from 'lucide-react';

const memoSchema = z.object({
  recipient_ids: z.array(z.string()).min(1, 'Please select at least one employee'),
  type: z.enum(['memo', 'reminder', 'warning']),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  content: z.string().min(1, 'Content is required').max(2000, 'Content must be less than 2000 characters'),
  expires_at: z.string().optional(),
  escalate_after_hours: z.number().min(1).max(168).optional(),
  enable_escalation: z.boolean().optional(),
});

type MemoFormData = z.infer<typeof memoSchema>;

interface Employee {
  id: string;
  full_name: string;
  department: string | null;
}

interface SendMemoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preSelectedEmployeeId?: string;
}

export function SendMemoDialog({
  open,
  onOpenChange,
  preSelectedEmployeeId,
}: SendMemoDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, department')
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
    }
  };

  const form = useForm<MemoFormData>({
    resolver: zodResolver(memoSchema),
    defaultValues: {
      recipient_ids: preSelectedEmployeeId ? [preSelectedEmployeeId] : [],
      type: 'memo',
      title: '',
      content: '',
      expires_at: '',
      enable_escalation: false,
      escalate_after_hours: 24,
    },
  });

  useEffect(() => {
    if (preSelectedEmployeeId) {
      form.setValue('recipient_ids', [preSelectedEmployeeId]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preSelectedEmployeeId]);

  const selectedIds = form.watch('recipient_ids');

  const toggleEmployee = (employeeId: string) => {
    const current = form.getValues('recipient_ids');
    if (current.includes(employeeId)) {
      form.setValue('recipient_ids', current.filter(id => id !== employeeId));
    } else {
      form.setValue('recipient_ids', [...current, employeeId]);
    }
  };

  const selectAll = () => {
    form.setValue('recipient_ids', employees.map(e => e.id));
  };

  const clearAll = () => {
    form.setValue('recipient_ids', []);
  };

  const onSubmit = async (data: MemoFormData) => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to send memos',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create a memo for each recipient
      const memos = data.recipient_ids.map(recipientId => ({
        sender_id: user.id,
        recipient_id: recipientId,
        type: data.type,
        title: data.title.trim(),
        content: data.content.trim(),
        expires_at: data.expires_at ? new Date(data.expires_at).toISOString() : null,
        escalate_after_hours: data.enable_escalation ? data.escalate_after_hours : null,
      }));

      const { error } = await supabase
        .from('memos')
        .insert(memos);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Memo sent to ${data.recipient_ids.length} employee${data.recipient_ids.length > 1 ? 's' : ''}`,
      });

      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEmployeeName = (id: string) => {
    return employees.find(e => e.id === id)?.full_name || 'Unknown';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Memo to Employees</DialogTitle>
          <DialogDescription>
            Send a direct memo, reminder, or warning to one or more employees. They will see it prominently on their dashboard.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="recipient_ids"
              render={() => (
                <FormItem>
                  <FormLabel>Employees ({selectedIds.length} selected)</FormLabel>
                  
                  {/* Selected employees badges */}
                  {selectedIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {selectedIds.map(id => (
                        <Badge key={id} variant="secondary" className="gap-1">
                          {getEmployeeName(id)}
                          <X 
                            className="h-3 w-3 cursor-pointer hover:text-destructive" 
                            onClick={() => toggleEmployee(id)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Select/Clear all buttons */}
                  <div className="flex gap-2 mb-2">
                    <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                      Select All
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={clearAll}>
                      Clear All
                    </Button>
                  </div>

                  {/* Employee list with checkboxes */}
                  <ScrollArea className="h-[150px] border rounded-md p-2">
                    <div className="space-y-2">
                      {employees.map((employee) => (
                        <div
                          key={employee.id}
                          className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                          onClick={() => toggleEmployee(employee.id)}
                        >
                          <Checkbox
                            checked={selectedIds.includes(employee.id)}
                            onCheckedChange={() => toggleEmployee(employee.id)}
                          />
                          <span className="text-sm flex-1">
                            {employee.full_name}
                            {employee.department && (
                              <span className="text-muted-foreground ml-1">
                                - {employee.department}
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="memo">📝 Memo (General message)</SelectItem>
                      <SelectItem value="reminder">🔔 Reminder (Action needed)</SelectItem>
                      <SelectItem value="warning">⚠️ Warning (Important/Urgent)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the appropriate type based on urgency
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief title for the memo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detailed message content"
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expires_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiration Date & Time (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Leave empty for memos that don't expire
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="enable_escalation"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Enable Auto-Escalation
                    </FormLabel>
                    <FormDescription>
                      Automatically send a reminder if this memo remains unread
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch('enable_escalation') && (
              <FormField
                control={form.control}
                name="escalate_after_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Escalate After (Hours)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="168"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Send a reminder after this many hours if unread (1-168 hours)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : `Send Memo${selectedIds.length > 1 ? ` to ${selectedIds.length}` : ''}`}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
