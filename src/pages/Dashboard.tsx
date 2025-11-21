import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Clock, FileText, DollarSign } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';

export default function Dashboard() {
  const { isAdmin } = useAdmin();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeAttendance: 0,
    todayReports: 0,
    pendingPayroll: 0,
  });

  useEffect(() => {
    if (!isAdmin) return;

    const fetchStats = async () => {
      const today = new Date().toISOString().split('T')[0];

      const [employeesCount, activeAttendanceCount, todayReportsCount, pendingPayrollCount] =
        await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase
            .from('attendance')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'active'),
          supabase
            .from('eod_reports')
            .select('id', { count: 'exact', head: true })
            .gte('submitted_at', today),
          supabase
            .from('payroll')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending'),
        ]);

      setStats({
        totalEmployees: employeesCount.count || 0,
        activeAttendance: activeAttendanceCount.count || 0,
        todayReports: todayReportsCount.count || 0,
        pendingPayroll: pendingPayrollCount.count || 0,
      });
    };

    fetchStats();

    // Set up real-time subscription for attendance changes
    const channel = supabase
      .channel('attendance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
        },
        () => {
          // Refetch stats when attendance changes
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const statCards = [
    {
      title: 'Total Employees',
      value: stats.totalEmployees,
      icon: Users,
      description: 'Active staff members',
      color: 'text-blue-600',
    },
    {
      title: 'Clocked In Now',
      value: stats.activeAttendance,
      icon: Clock,
      description: 'Currently working',
      color: 'text-green-600',
    },
    {
      title: 'EOD Reports Today',
      value: stats.todayReports,
      icon: FileText,
      description: 'Submitted today',
      color: 'text-amber-600',
    },
    {
      title: 'Pending Payroll',
      value: stats.pendingPayroll,
      icon: DollarSign,
      description: 'Awaiting payment',
      color: 'text-purple-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          {isAdmin ? 'Admin overview of Care Sync operations' : 'Welcome to Care Sync'}
        </p>
      </div>

      {isAdmin ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Welcome to Care Sync</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Use the sidebar to navigate to attendance, schedules, reports, and payroll.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
