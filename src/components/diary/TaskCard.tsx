import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  SkipForward, 
  ChevronDown, 
  ChevronUp,
  PlayCircle
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
type TaskPriority = 'low' | 'medium' | 'high';

interface DailyTask {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  completed_at: string | null;
  notes: string | null;
}

interface TaskCardProps {
  task: DailyTask;
  onUpdateStatus: (taskId: string, status: TaskStatus, notes?: string) => void;
}

export const TaskCard = ({ task, onUpdateStatus }: TaskCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<TaskStatus | null>(null);
  const [notes, setNotes] = useState('');

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'in_progress': return <PlayCircle className="h-5 w-5 text-blue-500" />;
      case 'skipped': return <SkipForward className="h-5 w-5 text-gray-500" />;
      default: return <Circle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (newStatus === 'completed' || newStatus === 'skipped') {
      setPendingStatus(newStatus);
      setShowNoteDialog(true);
    } else {
      onUpdateStatus(task.id, newStatus);
    }
  };

  const handleConfirmStatus = () => {
    if (pendingStatus) {
      onUpdateStatus(task.id, pendingStatus, notes || undefined);
    }
    setShowNoteDialog(false);
    setNotes('');
    setPendingStatus(null);
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className={task.status === 'completed' ? 'bg-muted/50' : ''}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {getStatusIcon(task.status)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                    {task.title}
                  </h4>
                  <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                    {task.priority}
                  </Badge>
                </div>
                
                {task.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {task.description}
                  </p>
                )}

                {task.notes && (
                  <p className="text-sm text-muted-foreground mt-2 italic">
                    Note: {task.notes}
                  </p>
                )}

                {task.instructions && (
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="mt-2 h-auto py-1 px-2">
                      {isOpen ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-1" />
                          Hide Instructions
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-1" />
                          View Instructions
                        </>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                )}

                <CollapsibleContent className="mt-3">
                  <div className="bg-muted rounded-lg p-3">
                    <h5 className="text-sm font-medium mb-2">Instructions:</h5>
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans">
                      {task.instructions}
                    </pre>
                  </div>
                </CollapsibleContent>
              </div>

              {task.status !== 'completed' && task.status !== 'skipped' && (
                <div className="flex items-center gap-1">
                  {task.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleStatusChange('in_progress')}
                      title="Start Task"
                    >
                      <PlayCircle className="h-5 w-5 text-blue-500" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleStatusChange('completed')}
                    title="Mark Complete"
                  >
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleStatusChange('skipped')}
                    title="Skip Task"
                  >
                    <SkipForward className="h-5 w-5 text-gray-500" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Collapsible>

      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingStatus === 'completed' ? 'Complete Task' : 'Skip Task'}
            </DialogTitle>
            <DialogDescription>
              {pendingStatus === 'completed' 
                ? 'Add any notes about completing this task (optional).'
                : 'Add a reason for skipping this task (optional).'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={pendingStatus === 'completed' 
                ? 'Any notes about how this task went...'
                : 'Reason for skipping...'}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmStatus}>
              {pendingStatus === 'completed' ? 'Mark Complete' : 'Skip Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
