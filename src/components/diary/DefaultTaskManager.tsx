import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, GripVertical, Clock } from 'lucide-react';
import { CreateDefaultTaskDialog } from './CreateDefaultTaskDialog';
import { EditDefaultTaskDialog } from './EditDefaultTaskDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
}

export const DefaultTaskManager = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<DefaultTask | null>(null);
  const [deletingTask, setDeletingTask] = useState<DefaultTask | null>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['default-tasks-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('default_tasks')
        .select('*')
        .order('order_position', { ascending: true });
      
      if (error) throw error;
      return data as DefaultTask[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('default_tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['default-tasks-admin'] });
      queryClient.invalidateQueries({ queryKey: ['default-tasks'] });
      toast({ title: 'Task deleted successfully' });
      setDeletingTask(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete task', description: error.message, variant: 'destructive' });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ taskId, isActive }: { taskId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('default_tasks')
        .update({ is_active: isActive })
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['default-tasks-admin'] });
      queryClient.invalidateQueries({ queryKey: ['default-tasks'] });
    },
  });

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Default Daily Tasks</CardTitle>
            <CardDescription>
              Manage default tasks that employees can add to their daily diary
            </CardDescription>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">Loading tasks...</p>
        ) : tasks.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No default tasks yet. Create one to get started.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Time Est.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{task.title}</p>
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{task.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {task.time_estimate ? (
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {task.time_estimate}m
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActiveMutation.mutate({ 
                        taskId: task.id, 
                        isActive: !task.is_active 
                      })}
                    >
                      <Badge variant={task.is_active ? 'default' : 'secondary'}>
                        {task.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingTask(task)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingTask(task)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <CreateDefaultTaskDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen} 
      />

      {editingTask && (
        <EditDefaultTaskDialog
          task={editingTask}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
        />
      )}

      <AlertDialog open={!!deletingTask} onOpenChange={(open) => !open && setDeletingTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingTask?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingTask && deleteMutation.mutate(deletingTask.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
