import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, Plus, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';

type TaskPriority = 'low' | 'medium' | 'high';
type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

interface IncompleteTask {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  task_date: string;
  default_task_id: string | null;
  client_id: string | null;
}

interface CarryOverTasksSectionProps {
  tasks: IncompleteTask[];
  onCarryOver: (task: IncompleteTask) => void;
  onCarryOverAll: () => void;
  isCarryingOver: boolean;
}

export const CarryOverTasksSection = ({
  tasks,
  onCarryOver,
  onCarryOverAll,
  isCarryingOver,
}: CarryOverTasksSectionProps) => {
  if (tasks.length === 0) return null;

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
    }
  };

  return (
    <Card className="border-dashed border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-amber-500" />
            Incomplete Tasks from Previous Days
          </CardTitle>
          <Button 
            size="sm" 
            onClick={onCarryOverAll}
            disabled={isCarryingOver}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Carry Over All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center justify-between p-3 bg-background rounded-lg border"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{task.title}</span>
                <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                  {task.priority}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {format(new Date(task.task_date), 'MMM d')}
                </Badge>
              </div>
              {task.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                  {task.description}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCarryOver(task)}
              disabled={isCarryingOver}
            >
              <Plus className="h-4 w-4 mr-1" />
              Carry Over
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
