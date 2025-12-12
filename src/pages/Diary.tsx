import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  SkipForward, 
  Plus,
  ChevronDown,
  ChevronUp,
  ListTodo,
  Sparkles
} from 'lucide-react';
import { DefaultTaskManager } from '@/components/diary/DefaultTaskManager';
import { TaskCard } from '@/components/diary/TaskCard';
import { SuggestedTasksSection } from '@/components/diary/SuggestedTasksSection';

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
type TaskPriority = 'low' | 'medium' | 'high';

interface DailyTask {
  id: string;
  user_id: string;
  task_date: string;
  default_task_id: string | null;
  title: string;
  description: string | null;
  instructions: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

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
}

const Diary = () => {
  const { user } = useAuth();
  const { isAdmin, hasPermission } = useAdmin();
  const queryClient = useQueryClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const canManageTasks = isAdmin || hasPermission('schedules');

  // Fetch today's tasks for the user
  const { data: dailyTasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['daily-tasks', user?.id, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_daily_tasks')
        .select('*')
        .eq('user_id', user?.id)
        .eq('task_date', today)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as DailyTask[];
    },
    enabled: !!user?.id,
  });

  // Fetch default tasks for suggestions
  const { data: defaultTasks = [] } = useQuery({
    queryKey: ['default-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('default_tasks')
        .select('*')
        .eq('is_active', true)
        .order('order_position', { ascending: true });
      
      if (error) throw error;
      return data as DefaultTask[];
    },
  });

  // Add task from default
  const addTaskMutation = useMutation({
    mutationFn: async (defaultTask: DefaultTask) => {
      const { error } = await supabase
        .from('employee_daily_tasks')
        .insert({
          user_id: user?.id,
          task_date: today,
          default_task_id: defaultTask.id,
          title: defaultTask.title,
          description: defaultTask.description,
          instructions: defaultTask.instructions,
          priority: defaultTask.priority,
          status: 'pending',
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-tasks'] });
      toast({ title: 'Task added to your diary' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add task', description: error.message, variant: 'destructive' });
    },
  });

  // Update task status
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status, notes }: { taskId: string; status: TaskStatus; notes?: string }) => {
      const updateData: Partial<DailyTask> = { status };
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }
      if (notes !== undefined) {
        updateData.notes = notes;
      }
      
      const { error } = await supabase
        .from('employee_daily_tasks')
        .update(updateData)
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-tasks'] });
    },
  });

  // Get tasks not yet added today
  const availableDefaultTasks = defaultTasks.filter(
    dt => !dailyTasks.some(t => t.default_task_id === dt.id)
  );

  const pendingTasks = dailyTasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const completedTasks = dailyTasks.filter(t => t.status === 'completed');
  const skippedTasks = dailyTasks.filter(t => t.status === 'skipped');

  const stats = {
    total: dailyTasks.length,
    completed: completedTasks.length,
    pending: pendingTasks.length,
    skipped: skippedTasks.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ListTodo className="h-6 w-6" />
            My Diary
          </h1>
          <p className="text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
      </div>

      {canManageTasks && (
        <Tabs defaultValue="my-tasks" className="w-full">
          <TabsList>
            <TabsTrigger value="my-tasks">My Tasks</TabsTrigger>
            <TabsTrigger value="manage-defaults">Manage Default Tasks</TabsTrigger>
          </TabsList>
          
          <TabsContent value="my-tasks">
            <DiaryContent 
              dailyTasks={dailyTasks}
              pendingTasks={pendingTasks}
              completedTasks={completedTasks}
              skippedTasks={skippedTasks}
              availableDefaultTasks={availableDefaultTasks}
              stats={stats}
              loadingTasks={loadingTasks}
              onAddTask={(task) => addTaskMutation.mutate(task)}
              onUpdateTask={(taskId, status, notes) => updateTaskMutation.mutate({ taskId, status, notes })}
              isAddingTask={addTaskMutation.isPending}
            />
          </TabsContent>
          
          <TabsContent value="manage-defaults">
            <DefaultTaskManager />
          </TabsContent>
        </Tabs>
      )}

      {!canManageTasks && (
        <DiaryContent 
          dailyTasks={dailyTasks}
          pendingTasks={pendingTasks}
          completedTasks={completedTasks}
          skippedTasks={skippedTasks}
          availableDefaultTasks={availableDefaultTasks}
          stats={stats}
          loadingTasks={loadingTasks}
          onAddTask={(task) => addTaskMutation.mutate(task)}
          onUpdateTask={(taskId, status, notes) => updateTaskMutation.mutate({ taskId, status, notes })}
          isAddingTask={addTaskMutation.isPending}
        />
      )}
    </div>
  );
};

interface DiaryContentProps {
  dailyTasks: DailyTask[];
  pendingTasks: DailyTask[];
  completedTasks: DailyTask[];
  skippedTasks: DailyTask[];
  availableDefaultTasks: DefaultTask[];
  stats: { total: number; completed: number; pending: number; skipped: number };
  loadingTasks: boolean;
  onAddTask: (task: DefaultTask) => void;
  onUpdateTask: (taskId: string, status: TaskStatus, notes?: string) => void;
  isAddingTask: boolean;
}

const DiaryContent = ({
  dailyTasks,
  pendingTasks,
  completedTasks,
  skippedTasks,
  availableDefaultTasks,
  stats,
  loadingTasks,
  onAddTask,
  onUpdateTask,
  isAddingTask,
}: DiaryContentProps) => {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Circle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Pending</span>
            </div>
            <p className="text-2xl font-bold">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Completed</span>
            </div>
            <p className="text-2xl font-bold">{stats.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <SkipForward className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-muted-foreground">Skipped</span>
            </div>
            <p className="text-2xl font-bold">{stats.skipped}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tasks */}
      {loadingTasks ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading tasks...
          </CardContent>
        </Card>
      ) : dailyTasks.length === 0 ? (
        <SuggestedTasksSection 
          tasks={availableDefaultTasks} 
          onAddTask={onAddTask}
          isAdding={isAddingTask}
        />
      ) : (
        <div className="space-y-4">
          {pendingTasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  Pending Tasks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingTasks.map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onUpdateStatus={onUpdateTask}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {completedTasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Completed Tasks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {completedTasks.map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onUpdateStatus={onUpdateTask}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {skippedTasks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <SkipForward className="h-5 w-5 text-gray-500" />
                  Skipped Tasks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {skippedTasks.map((task) => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onUpdateStatus={onUpdateTask}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Add more tasks section */}
          {availableDefaultTasks.length > 0 && (
            <SuggestedTasksSection 
              tasks={availableDefaultTasks} 
              onAddTask={onAddTask}
              isAdding={isAddingTask}
              title="Add More Tasks"
              collapsed
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Diary;
