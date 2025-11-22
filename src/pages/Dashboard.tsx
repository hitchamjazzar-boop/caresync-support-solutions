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
import { AnnouncementBanner } from '@/components/announcements/AnnouncementBanner';
import { MemoAlert } from '@/components/memos/MemoAlert';
import { OrgChartDisplay } from '@/components/orgchart/OrgChartDisplay';
import { format } from 'date-fns';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';

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
      
      // Set up real-time subscription for payroll changes
      const channel = supabase
        .channel('payroll-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'payroll',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Payroll change detected:', payload);
            fetchEmployeePayroll();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
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

    try {
      const { data, error } = await supabase
        .from('payroll')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['approved', 'paid'])
        .order('period_end', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching payroll:', error);
        return;
      }

      console.log('Fetched employee payroll:', data);
      setApprovedPayroll(data || []);
    } catch (err) {
      console.error('Exception fetching payroll:', err);
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

      <AnnouncementBanner />

      <MemoAlert />

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
        <SidebarProvider>
          <div className="flex min-h-screen w-full">
            <Sidebar className="border-r">
              <SidebarHeader className="border-b p-4">
                <h2 className="text-lg font-semibold">Organization Chart</h2>
              </SidebarHeader>
              <SidebarContent className="p-4">
                <div className="transform scale-75 origin-top-left">
                  <OrgChartDisplay />
                </div>
              </SidebarContent>
            </Sidebar>
            
            <div className="flex-1 space-y-6 p-6">
              <div className="flex items-center justify-between">
                <SidebarTrigger />
              </div>

              <div className="space-y-6">
                {/* Payroll Available Banner */}
                {approvedPayroll.length > 0 ? (
                  <Alert className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                    <AlertTitle className="text-2xl font-bold text-green-800 dark:text-green-200 mb-2">
                      💰 Latest Payroll Update
                    </AlertTitle>
                    <AlertDescription className="space-y-3">
                      <div className="space-y-2">
                        {approvedPayroll.map((payroll) => {
                          const isPaid = payroll.status === 'paid';
                          return (
                            <div key={payroll.id} className={`flex items-center justify-between rounded-lg p-3 border ${
                              isPaid 
                                ? 'bg-white dark:bg-gray-900 border-green-200 dark:border-green-800' 
                                : 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                            }`}>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-semibold text-green-900 dark:text-green-100">
                                    ₱{payroll.net_amount?.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </p>
                                  {isPaid ? (
                                    <span className="text-xs font-semibold px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
                                      ✓ PAID
                                    </span>
                                  ) : (
                                    <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                                      PENDING PAYMENT
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-green-700 dark:text-green-400">
                                  Period: {format(new Date(payroll.period_start), 'MMM dd')} - {format(new Date(payroll.period_end), 'MMM dd, yyyy')}
                                </p>
                                {payroll.payment_date && (
                                  <p className="text-xs text-muted-foreground">
                                    {isPaid ? 'Paid on:' : 'Payment date:'} {format(new Date(payroll.payment_date), 'MMM dd, yyyy')}
                                  </p>
                                )}
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => navigate('/payroll')}
                                className="ml-2"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                      <Button onClick={() => navigate('/payroll')} className="w-full bg-green-600 hover:bg-green-700">
                        View All Payroll
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900 dark:to-slate-900 border-gray-200 dark:border-gray-700">
                    <DollarSign className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                    <AlertTitle className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                      No Payroll Available Yet
                    </AlertTitle>
                    <AlertDescription className="text-gray-700 dark:text-gray-300">
                      <p className="mb-2">You don't have any approved or paid payroll records at the moment.</p>
                      <p className="text-sm text-muted-foreground">Your payroll information will appear here once it has been processed by the admin.</p>
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
            </div>
          </div>
        </SidebarProvider>
      )}
    </div>
  );
}
