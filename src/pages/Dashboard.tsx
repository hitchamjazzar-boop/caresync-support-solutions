import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Users, Clock, FileText, DollarSign, CheckCircle2, Download, TrendingUp } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ClockInOut } from '@/components/attendance/ClockInOut';
import { format } from 'date-fns';

export default function Dashboard() {
  const { isAdmin } = useAdmin();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeAttendance: 0,
    todayReports: 0,
    pendingPayroll: 0,
  });
  const [approvedPayroll, setApprovedPayroll] = useState<any[]>([]);

  useEffect(() => {
    if (isAdmin) {
      fetchAdminStats();
    } else if (user) {
      fetchEmployeePayroll();
    }
  }, [isAdmin, user]);

  const fetchAdminStats = async () => {
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
          fetchAdminStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchEmployeePayroll = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('payroll')
      .select('*, profiles!inner(full_name)')
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .order('period_end', { ascending: false })
      .limit(3);

    if (!error && data) {
      setApprovedPayroll(data);
    }
  };

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
        <div className="space-y-6">
          {/* Payroll Available Banner */}
          {approvedPayroll.length > 0 && (
            <Alert className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-2xl font-bold text-green-800 dark:text-green-200 mb-2">
                🎉 Payroll Available!
              </AlertTitle>
              <AlertDescription className="space-y-3">
                <p className="text-green-700 dark:text-green-300 text-lg">
                  You have {approvedPayroll.length} approved payroll{approvedPayroll.length > 1 ? 's' : ''} ready for review!
                </p>
                <div className="space-y-2">
                  {approvedPayroll.map((payroll) => (
                    <div key={payroll.id} className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg p-3 border border-green-200 dark:border-green-800">
                      <div>
                        <p className="font-semibold text-green-900 dark:text-green-100">
                          ₱{payroll.net_amount?.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-sm text-green-700 dark:text-green-400">
                          Period: {format(new Date(payroll.period_start), 'MMM dd')} - {format(new Date(payroll.period_end), 'MMM dd, yyyy')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Payment Date: {format(new Date(payroll.payment_date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      {payroll.payslip_url && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(payroll.payslip_url, '_blank')}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Payslip
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button onClick={() => navigate('/payroll')} className="w-full bg-green-600 hover:bg-green-700">
                  View All Payroll
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Clock In/Out Card */}
          <div className="grid gap-6 md:grid-cols-2">
            <ClockInOut />

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  onClick={() => navigate('/weekly-summary')} 
                  variant="default" 
                  className="w-full justify-start"
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Weekly Summary
                </Button>
                <Button 
                  onClick={() => navigate('/attendance')} 
                  variant="outline" 
                  className="w-full justify-start"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  View Attendance History
                </Button>
                <Button 
                  onClick={() => navigate('/reports')} 
                  variant="outline" 
                  className="w-full justify-start"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Submit EOD Report
                </Button>
                <Button 
                  onClick={() => navigate('/payroll')} 
                  variant="outline" 
                  className="w-full justify-start"
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  View Payroll
                </Button>
                <Button 
                  onClick={() => navigate('/profile')} 
                  variant="outline" 
                  className="w-full justify-start"
                >
                  <Users className="mr-2 h-4 w-4" />
                  My Profile
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
