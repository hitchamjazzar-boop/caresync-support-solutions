import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Send, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, format, isSameDay } from 'date-fns';

export const TimesheetSubmission = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<{ start: Date; end: Date } | null>(null);
  const [existingSubmission, setExistingSubmission] = useState<any>(null);
  const [totalHours, setTotalHours] = useState(0);

  useEffect(() => {
    if (!user) return;

    const checkSubmissionStatus = async () => {
      const today = new Date();
      const dayOfMonth = today.getDate();
      
      // Check if today is 1st or 15th
      const isSubmissionDay = dayOfMonth === 1 || dayOfMonth === 15;
      setCanSubmit(isSubmissionDay);

      // Determine period
      let periodStart: Date;
      let periodEnd: Date;

      if (dayOfMonth === 1) {
        // Previous month's second half (16th to end)
        const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 16);
        periodStart = prevMonth;
        periodEnd = endOfMonth(prevMonth);
      } else if (dayOfMonth === 15) {
        // Current month's first half (1st to 15th)
        periodStart = startOfMonth(today);
        periodEnd = new Date(today.getFullYear(), today.getMonth(), 15);
      } else {
        return;
      }

      setCurrentPeriod({ start: periodStart, end: periodEnd });

      // Check for existing submission
      const { data } = await supabase
        .from('timesheet_submissions')
        .select('*')
        .eq('user_id', user.id)
        .eq('period_start', format(periodStart, 'yyyy-MM-dd'))
        .eq('period_end', format(periodEnd, 'yyyy-MM-dd'))
        .maybeSingle();

      setExistingSubmission(data);

      // Calculate total hours for the period
      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('total_hours')
        .eq('user_id', user.id)
        .gte('clock_in', periodStart.toISOString())
        .lte('clock_in', periodEnd.toISOString());

      const hours = attendanceData?.reduce((sum, record) => sum + (record.total_hours || 0), 0) || 0;
      setTotalHours(hours);
    };

    checkSubmissionStatus();
  }, [user]);

  const handleSubmit = async () => {
    if (!currentPeriod || !user) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('timesheet_submissions')
        .insert({
          user_id: user.id,
          period_start: format(currentPeriod.start, 'yyyy-MM-dd'),
          period_end: format(currentPeriod.end, 'yyyy-MM-dd'),
          status: 'pending'
        });

      if (error) throw error;

      toast.success('Timesheet submitted successfully');
      
      // Refresh submission status
      const { data } = await supabase
        .from('timesheet_submissions')
        .select('*')
        .eq('user_id', user.id)
        .eq('period_start', format(currentPeriod.start, 'yyyy-MM-dd'))
        .eq('period_end', format(currentPeriod.end, 'yyyy-MM-dd'))
        .single();

      setExistingSubmission(data);
    } catch (error: any) {
      console.error('Error submitting timesheet:', error);
      toast.error('Failed to submit timesheet');
    } finally {
      setLoading(false);
    }
  };

  if (!canSubmit) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timesheet Submission
          </CardTitle>
          <CardDescription>
            Timesheets can be submitted on the 1st and 15th of each month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Next submission available on {new Date().getDate() < 15 ? '15th' : '1st'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Submit Timesheet
        </CardTitle>
        <CardDescription>
          {currentPeriod && `Period: ${format(currentPeriod.start, 'MMM d')} - ${format(currentPeriod.end, 'MMM d, yyyy')}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Total Hours This Period</p>
            <p className="text-2xl font-bold">{totalHours.toFixed(2)}</p>
          </div>
        </div>

        {existingSubmission ? (
          <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="font-medium">Timesheet Submitted</p>
              <p className="text-sm text-muted-foreground">
                Status: <Badge variant={existingSubmission.status === 'approved' ? 'default' : 'secondary'}>
                  {existingSubmission.status}
                </Badge>
              </p>
              {existingSubmission.admin_notes && (
                <p className="text-sm text-muted-foreground mt-1">
                  Note: {existingSubmission.admin_notes}
                </p>
              )}
            </div>
          </div>
        ) : (
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            {loading ? 'Submitting...' : 'Submit Timesheet for Review'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};