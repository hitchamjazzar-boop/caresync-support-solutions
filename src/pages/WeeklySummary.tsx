import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, FileText, DollarSign, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface WeeklySummary {
  totalHours: number;
  completedReports: number;
  upcomingPayments: {
    id: string;
    net_amount: number;
    payment_date: string;
    period_start: string;
    period_end: string;
    status: string;
  }[];
  attendanceRecords: number;
}

export default function WeeklySummary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<WeeklySummary | null>(null);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

  useEffect(() => {
    if (!user) return;

    const fetchWeeklySummary = async () => {
      try {
        setLoading(true);

        // Fetch attendance data for the week
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select('total_hours, id')
          .eq('user_id', user.id)
          .gte('clock_in', weekStart.toISOString())
          .lte('clock_in', weekEnd.toISOString());

        if (attendanceError) throw attendanceError;

        // Calculate total hours
        const totalHours = attendanceData?.reduce((sum, record) => {
          return sum + (parseFloat(record.total_hours?.toString() || '0'));
        }, 0) || 0;

        // Fetch EOD reports for the week
        const { data: reportsData, error: reportsError } = await supabase
          .from('eod_reports')
          .select('id')
          .eq('user_id', user.id)
          .gte('submitted_at', weekStart.toISOString())
          .lte('submitted_at', weekEnd.toISOString());

        if (reportsError) throw reportsError;

        // Fetch upcoming payments (approved or pending payroll)
        const { data: payrollData, error: payrollError } = await supabase
          .from('payroll')
          .select('id, net_amount, payment_date, period_start, period_end, status')
          .eq('user_id', user.id)
          .in('status', ['approved', 'pending'])
          .gte('payment_date', new Date().toISOString().split('T')[0])
          .order('payment_date', { ascending: true })
          .limit(5);

        if (payrollError) throw payrollError;

        setSummary({
          totalHours: Math.round(totalHours * 100) / 100,
          completedReports: reportsData?.length || 0,
          upcomingPayments: payrollData || [],
          attendanceRecords: attendanceData?.length || 0,
        });
      } catch (error) {
        console.error('Error fetching weekly summary:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklySummary();
  }, [user, weekStart, weekEnd]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Weekly Summary</h1>
        <p className="text-muted-foreground">
          {format(weekStart, 'MMM dd')} - {format(weekEnd, 'MMM dd, yyyy')}
        </p>
      </div>

      <Alert>
        <Calendar className="h-4 w-4" />
        <AlertTitle>Week at a Glance</AlertTitle>
        <AlertDescription>
          Your performance summary for the current week. Track your hours, reports, and upcoming payments.
        </AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours Worked</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalHours || 0} hrs</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {summary?.attendanceRecords || 0} day{summary?.attendanceRecords !== 1 ? 's' : ''}
            </p>
            <Button 
              variant="link" 
              className="px-0 mt-2" 
              onClick={() => navigate('/attendance')}
            >
              View Details →
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">EOD Reports Submitted</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.completedReports || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Reports completed this week
            </p>
            <Button 
              variant="link" 
              className="px-0 mt-2" 
              onClick={() => navigate('/reports')}
            >
              View Reports →
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.upcomingPayments?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Scheduled payments
            </p>
            <Button 
              variant="link" 
              className="px-0 mt-2" 
              onClick={() => navigate('/payroll')}
            >
              View Payroll →
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Performance Insights</CardTitle>
          </div>
          <CardDescription>Key highlights from your week</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
            {summary?.totalHours && summary.totalHours >= 40 ? (
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-medium">Hours Tracked</p>
              <p className="text-sm text-muted-foreground">
                {summary?.totalHours && summary.totalHours >= 40
                  ? `Great work! You've logged ${summary.totalHours} hours this week.`
                  : `You've logged ${summary?.totalHours || 0} hours so far this week.`}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
            {summary?.attendanceRecords === summary?.completedReports ? (
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-medium">EOD Reports</p>
              <p className="text-sm text-muted-foreground">
                {summary?.attendanceRecords === summary?.completedReports
                  ? 'All your EOD reports are up to date!'
                  : `You have ${(summary?.attendanceRecords || 0) - (summary?.completedReports || 0)} pending EOD report(s).`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Payments */}
      {summary?.upcomingPayments && summary.upcomingPayments.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <CardTitle>Upcoming Payments</CardTitle>
            </div>
            <CardDescription>Your scheduled payroll payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.upcomingPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="space-y-1">
                    <p className="font-medium">
                      {format(new Date(payment.period_start), 'MMM dd')} -{' '}
                      {format(new Date(payment.period_end), 'MMM dd, yyyy')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Payment Date: {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={payment.status === 'approved' ? 'default' : 'secondary'}
                    >
                      {payment.status}
                    </Badge>
                    <p className="text-lg font-bold">
                      ${parseFloat(payment.net_amount.toString()).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
