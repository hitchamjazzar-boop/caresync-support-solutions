import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Sparkles, 
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

type TaskPriority = 'low' | 'medium' | 'high';

interface DefaultTask {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  priority: TaskPriority;
  category: string;
  time_estimate: number | null;
}

interface SuggestedTasksSectionProps {
  tasks: DefaultTask[];
  onAddTask: (task: DefaultTask) => void;
  isAdding: boolean;
  title?: string;
  collapsed?: boolean;
}

export const SuggestedTasksSection = ({ 
  tasks, 
  onAddTask, 
  isAdding,
  title = "Suggested Tasks",
  collapsed = false
}: SuggestedTasksSectionProps) => {
  const [isOpen, setIsOpen] = useState(!collapsed);

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
    }
  };

  // Group tasks by category
  const groupedTasks = tasks.reduce((acc, task) => {
    if (!acc[task.category]) {
      acc[task.category] = [];
    }
    acc[task.category].push(task);
    return acc;
  }, {} as Record<string, DefaultTask[]>);

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No tasks available</h3>
          <p className="text-muted-foreground">
            No default tasks have been set up yet. Contact your admin to add some.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                {title}
              </CardTitle>
              <CardDescription>
                {collapsed 
                  ? 'Click to view more tasks you can add'
                  : 'Add these tasks to your daily diary'}
              </CardDescription>
            </div>
            {collapsed && (
              isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />
            )}
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {Object.entries(groupedTasks).map(([category, categoryTasks]) => (
              <div key={category}>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  {category}
                </h4>
                <div className="space-y-2">
                  {categoryTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-medium">{task.title}</h5>
                          <Badge variant={getPriorityColor(task.priority)} className="text-xs">
                            {task.priority}
                          </Badge>
                          {task.time_estimate && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {task.time_estimate}m
                            </span>
                          )}
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
                        onClick={() => onAddTask(task)}
                        disabled={isAdding}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
