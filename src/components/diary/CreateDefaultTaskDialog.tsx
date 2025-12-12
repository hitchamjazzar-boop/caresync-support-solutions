import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
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

interface CreateDefaultTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateDefaultTaskDialog = ({ open, onOpenChange }: CreateDefaultTaskDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [category, setCategory] = useState('General');
  const [timeEstimate, setTimeEstimate] = useState('');
  const [clientId, setClientId] = useState<string | null>(null);
  const [assignmentType, setAssignmentType] = useState<'all' | 'specific' | 'department'>('all');
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [assignedDepartments, setAssignedDepartments] = useState<string[]>([]);
  const [isDaily, setIsDaily] = useState(true);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('default_tasks')
        .insert({
          title,
          description: description || null,
          instructions: instructions || null,
          priority,
          category,
          time_estimate: timeEstimate ? parseInt(timeEstimate) : null,
          created_by: user?.id,
          client_id: clientId,
          assignment_type: assignmentType,
          assigned_to: assignmentType === 'specific' ? assignedTo : null,
          assigned_departments: assignmentType === 'department' ? assignedDepartments : null,
          is_daily: isDaily,
          due_date: !isDaily && dueDate ? format(dueDate, 'yyyy-MM-dd') : null,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['default-tasks-admin'] });
      queryClient.invalidateQueries({ queryKey: ['default-tasks'] });
      toast({ title: 'Task created successfully' });
      handleClose();
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create task', description: error.message, variant: 'destructive' });
    },
  });

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setInstructions('');
    setPriority('medium');
    setCategory('General');
    setTimeEstimate('');
    setClientId(null);
    setAssignmentType('all');
    setAssignedTo([]);
    setAssignedDepartments([]);
    setIsDaily(true);
    setDueDate(undefined);
    onOpenChange(false);
  };

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
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Default Task</DialogTitle>
          <DialogDescription>
            Add a new default task that employees can add to their daily diary.
          </DialogDescription>
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
            <p className="text-xs text-muted-foreground">
              Provide detailed guidance to help employees complete this task.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as 'low' | 'medium' | 'high')}>
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
                <RadioGroupItem value="daily" id="daily" />
                <Label htmlFor="daily" className="font-normal cursor-pointer">
                  Daily recurring task
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="due-date" id="due-date" />
                <Label htmlFor="due-date" className="font-normal cursor-pointer">
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
                      disabled={(date) => date < new Date()}
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
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
