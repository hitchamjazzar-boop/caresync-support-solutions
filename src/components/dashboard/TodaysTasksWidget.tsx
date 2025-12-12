import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ListTodo, CheckCircle2, Clock, ArrowRight } from 'lucide-react';

export const TodaysTasksWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: tasks = [] } = useQuery({
    queryKey: ['daily-tasks-widget', user?.id, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_daily_tasks')
        .select('id, status')
        .eq('user_id', user?.id)
        .eq('task_date', today);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    pending: tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
  };

  const progressPercentage = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ListTodo className="h-4 w-4" />
          Today's Tasks
        </CardTitle>
        <CardDescription>
          {format(new Date(), 'EEEE, MMMM d')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {stats.total === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              No tasks for today yet
            </p>
            <Button size="sm" onClick={() => navigate('/diary')}>
              Open Diary
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">
                  {stats.completed}/{stats.total} completed
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span>{stats.pending} pending</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>{stats.completed} done</span>
              </div>
            </div>

            <Button 
              size="sm" 
              variant="outline" 
              className="w-full"
              onClick={() => navigate('/diary')}
            >
              View Diary
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
