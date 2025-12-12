import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ClientSelector } from './ClientSelector';
import { AssignmentSelector } from './AssignmentSelector';

type TaskPriority = 'low' | 'medium' | 'high';

interface DefaultTask {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  priority: TaskPriority;
  category: string;
  time_estimate: number | null;
  is_active: boolean;
  order_position: number;
  created_by: string;
  client_id?: string | null;
  assignment_type?: string | null;
  assigned_to?: string[] | null;
  assigned_departments?: string[] | null;
  is_daily?: boolean | null;
  due_date?: string | null;
}

interface EditDefaultTaskDialogProps {
  task: DefaultTask;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditDefaultTaskDialog = ({ task, open, onOpenChange }: EditDefaultTaskDialogProps) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [instructions, setInstructions] = useState(task.instructions || '');
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [category, setCategory] = useState(task.category);
  const [timeEstimate, setTimeEstimate] = useState(task.time_estimate?.toString() || '');
  const [clientId, setClientId] = useState<string | null>(task.client_id || null);
  const [assignmentType, setAssignmentType] = useState<'all' | 'specific' | 'department'>(
    (task.assignment_type as 'all' | 'specific' | 'department') || 'all'
  );
  const [assignedTo, setAssignedTo] = useState<string[]>(task.assigned_to || []);
  const [assignedDepartments, setAssignedDepartments] = useState<string[]>(
    task.assigned_departments || []
  );
  const [isDaily, setIsDaily] = useState(task.is_daily !== false);
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task.due_date ? parseISO(task.due_date) : undefined
  );

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setInstructions(task.instructions || '');
    setPriority(task.priority);
    setCategory(task.category);
    setTimeEstimate(task.time_estimate?.toString() || '');
    setClientId(task.client_id || null);
    setAssignmentType((task.assignment_type as 'all' | 'specific' | 'department') || 'all');
    setAssignedTo(task.assigned_to || []);
    setAssignedDepartments(task.assigned_departments || []);
    setIsDaily(task.is_daily !== false);
    setDueDate(task.due_date ? parseISO(task.due_date) : undefined);
  }, [task]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('default_tasks')
        .update({
          title,
          description: description || null,
          instructions: instructions || null,
          priority,
          category,
          time_estimate: timeEstimate ? parseInt(timeEstimate) : null,
          client_id: clientId,
          assignment_type: assignmentType,
          assigned_to: assignmentType === 'specific' ? assignedTo : null,
          assigned_departments: assignmentType === 'department' ? assignedDepartments : null,
          is_daily: isDaily,
          due_date: !isDaily && dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
        })
        .eq('id', task.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['default-tasks-admin'] });
      queryClient.invalidateQueries({ queryKey: ['default-tasks'] });
      toast({ title: 'Task updated successfully' });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update task', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    if (!isDaily && !dueDate) {
      toast({ title: 'Due date is required for non-daily tasks', variant: 'destructive' });
      return;
    }
    updateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Default Task</DialogTitle>
          <DialogDescription>Update the task details.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Check emails"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the task"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Step-by-Step Instructions</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="1. Open email client&#10;2. Review unread messages&#10;3. Respond to urgent emails"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as TaskPriority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Communication">Communication</SelectItem>
                  <SelectItem value="Admin Work">Admin Work</SelectItem>
                  <SelectItem value="Client Support">Client Support</SelectItem>
                  <SelectItem value="Documentation">Documentation</SelectItem>
                  <SelectItem value="Training">Training</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeEstimate">Time Estimate (minutes)</Label>
            <Input
              id="timeEstimate"
              type="number"
              value={timeEstimate}
              onChange={(e) => setTimeEstimate(e.target.value)}
              placeholder="e.g., 30"
              min="1"
            />
          </div>

          {/* Task Type - Daily or Due Date */}
          <div className="space-y-3">
            <Label>Task Type</Label>
            <RadioGroup
              value={isDaily ? 'daily' : 'due-date'}
              onValueChange={(v) => setIsDaily(v === 'daily')}
              className="flex flex-col gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="daily" id="edit-daily" />
                <Label htmlFor="edit-daily" className="font-normal cursor-pointer">
                  Daily recurring task
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="due-date" id="edit-due-date" />
                <Label htmlFor="edit-due-date" className="font-normal cursor-pointer">
                  Task with specific due date
                </Label>
              </div>
            </RadioGroup>

            {!isDaily && (
              <div className="ml-6">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !dueDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, 'PPP') : <span>Pick a due date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                      className={cn('p-3 pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          <ClientSelector value={clientId} onChange={setClientId} />

          <AssignmentSelector
            assignmentType={assignmentType}
            assignedTo={assignedTo}
            assignedDepartments={assignedDepartments}
            onAssignmentTypeChange={setAssignmentType}
            onAssignedToChange={setAssignedTo}
            onAssignedDepartmentsChange={setAssignedDepartments}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
