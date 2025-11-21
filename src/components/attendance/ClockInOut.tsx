import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Coffee, LogOut, Play } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ActiveAttendance {
  id: string;
  clock_in: string;
  clock_out: string | null;
  lunch_start: string | null;
  lunch_end: string | null;
  status: string;
}

export const ClockInOut = () => {
  const { user } = useAuth();
  const [activeAttendance, setActiveAttendance] = useState<ActiveAttendance | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Fetch active attendance
    const fetchActiveAttendance = async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error('Error fetching attendance:', error);
      } else {
        setActiveAttendance(data);
      }
    };

    fetchActiveAttendance();

    // Update current time every second
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => clearInterval(timer);
  }, [user]);

  const calculateHours = (clockIn: string, clockOut: string, lunchStart?: string | null, lunchEnd?: string | null) => {
    const start = new Date(clockIn);
    const end = new Date(clockOut);
    let totalMinutes = (end.getTime() - start.getTime()) / 1000 / 60;

    // Subtract lunch break if both start and end are recorded
    if (lunchStart && lunchEnd) {
      const lunchStartTime = new Date(lunchStart);
      const lunchEndTime = new Date(lunchEnd);
      const lunchMinutes = (lunchEndTime.getTime() - lunchStartTime.getTime()) / 1000 / 60;
      totalMinutes -= lunchMinutes;
    }

    return (totalMinutes / 60).toFixed(2);
  };

  const handleClockIn = async () => {
    if (!user) return;
    setLoading(true);

    const { error } = await supabase.from('attendance').insert({
      user_id: user.id,
      clock_in: new Date().toISOString(),
      status: 'active',
    });

    if (error) {
      toast.error('Failed to clock in');
      console.error(error);
    } else {
      toast.success('Clocked in successfully!');
      // Refetch attendance
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      setActiveAttendance(data);
    }

    setLoading(false);
  };

  const handleLunchStart = async () => {
    if (!activeAttendance || activeAttendance.lunch_start) return;
    setLoading(true);

    const { error } = await supabase
      .from('attendance')
      .update({ lunch_start: new Date().toISOString() })
      .eq('id', activeAttendance.id);

    if (error) {
      toast.error('Failed to start lunch break');
    } else {
      toast.success('Lunch break started');
      setActiveAttendance({ ...activeAttendance, lunch_start: new Date().toISOString() });
    }

    setLoading(false);
  };

  const handleLunchEnd = async () => {
    if (!activeAttendance || !activeAttendance.lunch_start || activeAttendance.lunch_end) return;
    setLoading(true);

    const { error } = await supabase
      .from('attendance')
      .update({ lunch_end: new Date().toISOString() })
      .eq('id', activeAttendance.id);

    if (error) {
      toast.error('Failed to end lunch break');
    } else {
      toast.success('Lunch break ended');
      setActiveAttendance({ ...activeAttendance, lunch_end: new Date().toISOString() });
    }

    setLoading(false);
  };

  const handleClockOut = async () => {
    if (!activeAttendance) return;
    setLoading(true);

    const clockOutTime = new Date().toISOString();
    const totalHours = calculateHours(
      activeAttendance.clock_in,
      clockOutTime,
      activeAttendance.lunch_start,
      activeAttendance.lunch_end
    );

    const { error } = await supabase
      .from('attendance')
      .update({
        clock_out: clockOutTime,
        total_hours: parseFloat(totalHours),
        status: 'completed',
      })
      .eq('id', activeAttendance.id);

    if (error) {
      toast.error('Failed to clock out');
    } else {
      toast.success(`Clocked out successfully! Total hours: ${totalHours}`);
      setActiveAttendance(null);
    }

    setLoading(false);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getElapsedTime = () => {
    if (!activeAttendance) return '00:00:00';
    
    const start = new Date(activeAttendance.clock_in);
    const now = new Date();
    let elapsed = now.getTime() - start.getTime();

    // Subtract lunch time if on lunch break
    if (activeAttendance.lunch_start) {
      const lunchStart = new Date(activeAttendance.lunch_start);
      if (activeAttendance.lunch_end) {
        const lunchEnd = new Date(activeAttendance.lunch_end);
        elapsed -= (lunchEnd.getTime() - lunchStart.getTime());
      } else {
        // Currently on lunch, subtract current lunch time
        elapsed -= (now.getTime() - lunchStart.getTime());
      }
    }

    const hours = Math.floor(elapsed / 1000 / 60 / 60);
    const minutes = Math.floor((elapsed / 1000 / 60) % 60);
    const seconds = Math.floor((elapsed / 1000) % 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const isOnLunchBreak = activeAttendance?.lunch_start && !activeAttendance?.lunch_end;

  return (
    <Card className="shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Clock className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-3xl">{formatTime(currentTime)}</CardTitle>
        <p className="text-sm text-muted-foreground">{formatDate(currentTime)}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeAttendance ? (
          <>
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-sm font-medium text-muted-foreground">Time Worked Today</p>
              <p className="text-3xl font-bold text-primary">{getElapsedTime()}</p>
              {isOnLunchBreak && (
                <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  ☕ On lunch break
                </p>
              )}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Clocked in at:</span>
                <span className="font-medium">
                  {new Date(activeAttendance.clock_in).toLocaleTimeString()}
                </span>
              </div>
              {activeAttendance.lunch_start && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lunch started:</span>
                  <span className="font-medium">
                    {new Date(activeAttendance.lunch_start).toLocaleTimeString()}
                  </span>
                </div>
              )}
              {activeAttendance.lunch_end && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lunch ended:</span>
                  <span className="font-medium">
                    {new Date(activeAttendance.lunch_end).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              {!activeAttendance.lunch_start ? (
                <Button
                  onClick={handleLunchStart}
                  disabled={loading}
                  variant="outline"
                  className="gap-2"
                >
                  <Coffee className="h-4 w-4" />
                  Start Lunch Break
                </Button>
              ) : !activeAttendance.lunch_end ? (
                <Button
                  onClick={handleLunchEnd}
                  disabled={loading}
                  variant="outline"
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  End Lunch Break
                </Button>
              ) : null}

              <Button
                onClick={handleClockOut}
                disabled={loading || isOnLunchBreak}
                variant="secondary"
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Clock Out
              </Button>

              {isOnLunchBreak && (
                <p className="text-xs text-center text-muted-foreground">
                  Please end your lunch break before clocking out
                </p>
              )}
            </div>
          </>
        ) : (
          <Button onClick={handleClockIn} disabled={loading} size="lg" className="w-full gap-2">
            <Clock className="h-5 w-5" />
            Clock In
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
