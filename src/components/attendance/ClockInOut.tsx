import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Clock, Coffee, LogOut, Play, Pause, User, Timer, MoreHorizontal, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';

interface ActiveAttendance {
  id: string;
  clock_in: string;
  clock_out: string | null;
  lunch_start: string | null;
  lunch_end: string | null;
  status: string;
}

interface ActiveBreak {
  id: string;
  attendance_id: string;
  break_type: string;
  break_start: string;
  break_end: string | null;
  notes: string | null;
}

interface BreakRecord {
  id: string;
  break_type: string;
  break_start: string;
  break_end: string | null;
}

const BREAK_TYPES = [
  { value: 'lunch', label: 'Lunch Break', icon: Coffee, color: 'text-orange-500' },
  { value: 'coffee', label: 'Coffee Break', icon: Coffee, color: 'text-amber-600' },
  { value: 'bathroom', label: 'Bathroom/CR', icon: User, color: 'text-blue-500' },
  { value: 'personal', label: 'Personal Break', icon: Timer, color: 'text-purple-500' },
  { value: 'other', label: 'Other', icon: MoreHorizontal, color: 'text-muted-foreground' },
] as const;

export const ClockInOut = () => {
  const { user } = useAuth();
  const [activeAttendance, setActiveAttendance] = useState<ActiveAttendance | null>(null);
  const [activeBreak, setActiveBreak] = useState<ActiveBreak | null>(null);
  const [todaysBreaks, setTodaysBreaks] = useState<BreakRecord[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchActiveAttendance = async () => {
      // Fetch active attendance
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (attendanceError) {
        console.error('Error fetching attendance:', attendanceError);
        return;
      }

      setActiveAttendance(attendanceData);

      if (attendanceData) {
        // Fetch active break (one that hasn't ended)
        const { data: breakData } = await supabase
          .from('attendance_breaks')
          .select('*')
          .eq('attendance_id', attendanceData.id)
          .is('break_end', null)
          .maybeSingle();

        setActiveBreak(breakData);

        // Fetch all breaks for today's session
        const { data: allBreaks } = await supabase
          .from('attendance_breaks')
          .select('*')
          .eq('attendance_id', attendanceData.id)
          .order('break_start', { ascending: true });

        setTodaysBreaks(allBreaks || []);
      }
    };

    fetchActiveAttendance();

    // Update current time every second
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => clearInterval(timer);
  }, [user]);

  const calculateTotalBreakTime = (breaks: BreakRecord[]) => {
    return breaks.reduce((total, brk) => {
      if (brk.break_end) {
        const start = new Date(brk.break_start);
        const end = new Date(brk.break_end);
        return total + (end.getTime() - start.getTime());
      } else if (brk.break_start) {
        // Currently on this break
        const start = new Date(brk.break_start);
        return total + (new Date().getTime() - start.getTime());
      }
      return total;
    }, 0);
  };

  const calculateHoursWithBreaks = (clockIn: string, clockOut: string, breaks: BreakRecord[]) => {
    const start = new Date(clockIn);
    const end = new Date(clockOut);
    let totalMinutes = (end.getTime() - start.getTime()) / 1000 / 60;

    // Subtract all break times
    const breakMinutes = calculateTotalBreakTime(breaks) / 1000 / 60;
    totalMinutes -= breakMinutes;

    return (totalMinutes / 60).toFixed(2);
  };

  const handleClockIn = async () => {
    if (!user) return;
    setLoading(true);

    // Check if user already has an active attendance to prevent duplicates
    const { data: existingActive } = await supabase
      .from('attendance')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (existingActive) {
      toast.error('You already have an active session. Please clock out first.');
      setLoading(false);
      return;
    }

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
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      setActiveAttendance(data);
      setTodaysBreaks([]);
      setActiveBreak(null);
    }

    setLoading(false);
  };

  const handleStartBreak = async (breakType: string) => {
    if (!activeAttendance || activeBreak) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('attendance_breaks')
      .insert({
        attendance_id: activeAttendance.id,
        break_type: breakType,
        break_start: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      toast.error('Failed to start break');
      console.error(error);
    } else {
      const breakLabel = BREAK_TYPES.find((b) => b.value === breakType)?.label || 'Break';
      toast.success(`${breakLabel} started`);
      setActiveBreak(data);
      setTodaysBreaks([...todaysBreaks, data]);
    }

    setLoading(false);
  };

  const handleEndBreak = async () => {
    if (!activeBreak) return;
    setLoading(true);

    const breakEndTime = new Date().toISOString();
    const { error } = await supabase
      .from('attendance_breaks')
      .update({ break_end: breakEndTime })
      .eq('id', activeBreak.id);

    if (error) {
      toast.error('Failed to end break');
      console.error(error);
    } else {
      const breakLabel = BREAK_TYPES.find((b) => b.value === activeBreak.break_type)?.label || 'Break';
      toast.success(`${breakLabel} ended - back to work!`);
      
      // Update the break in todaysBreaks
      setTodaysBreaks(
        todaysBreaks.map((b) =>
          b.id === activeBreak.id ? { ...b, break_end: breakEndTime } : b
        )
      );
      setActiveBreak(null);
    }

    setLoading(false);
  };

  const handleClockOut = async () => {
    if (!activeAttendance || !user) return;
    setLoading(true);

    // Check if currently on break
    if (activeBreak) {
      toast.error('Please end your break before clocking out');
      setLoading(false);
      return;
    }

    // Check if EOD report exists
    const { data: eodReport, error: eodError } = await supabase
      .from('eod_reports')
      .select('id')
      .eq('attendance_id', activeAttendance.id)
      .maybeSingle();

    if (eodError) {
      console.error('Error checking EOD report:', eodError);
    }

    if (!eodReport) {
      toast.error('Please submit your EOD report before clocking out', {
        description: 'Go to Reports page to submit your end-of-day report',
        duration: 5000,
      });
      setLoading(false);
      return;
    }

    const clockOutTime = new Date().toISOString();
    
    // Fetch completed breaks for accurate calculation
    const { data: completedBreaks } = await supabase
      .from('attendance_breaks')
      .select('*')
      .eq('attendance_id', activeAttendance.id)
      .not('break_end', 'is', null);

    const totalHours = calculateHoursWithBreaks(
      activeAttendance.clock_in,
      clockOutTime,
      completedBreaks || []
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
      setActiveBreak(null);
      setTodaysBreaks([]);
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

    // Subtract all break times
    elapsed -= calculateTotalBreakTime(todaysBreaks);

    const hours = Math.floor(elapsed / 1000 / 60 / 60);
    const minutes = Math.floor((elapsed / 1000 / 60) % 60);
    const seconds = Math.floor((elapsed / 1000) % 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatBreakDuration = (ms: number) => {
    const minutes = Math.floor(ms / 1000 / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getActiveBreakInfo = () => {
    if (!activeBreak) return null;
    const breakType = BREAK_TYPES.find((b) => b.value === activeBreak.break_type);
    return breakType;
  };

  const activeBreakInfo = getActiveBreakInfo();
  const totalBreakTime = calculateTotalBreakTime(todaysBreaks);
  const completedBreaksCount = todaysBreaks.filter((b) => b.break_end).length;

  const getStatusInfo = () => {
    if (!activeAttendance) {
      return { label: 'Not Clocked In', variant: 'outline' as const, icon: Clock };
    }
    if (activeBreak && activeBreakInfo) {
      return { 
        label: `On ${activeBreakInfo.label}`, 
        variant: 'secondary' as const, 
        icon: activeBreakInfo.icon,
        color: activeBreakInfo.color
      };
    }
    return { label: 'Working...', variant: 'default' as const, icon: Briefcase };
  };

  const statusInfo = getStatusInfo();

  return (
    <Card className="shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Clock className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-3xl">{formatTime(currentTime)}</CardTitle>
        <p className="text-sm text-muted-foreground">{formatDate(currentTime)}</p>
        
        {/* Status Badge */}
        <div className="mt-3 flex justify-center">
          <Badge 
            variant={statusInfo.variant} 
            className={`gap-1.5 px-3 py-1 text-sm ${activeBreak ? 'animate-pulse' : ''}`}
          >
            <statusInfo.icon className={`h-3.5 w-3.5 ${statusInfo.color || ''}`} />
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeAttendance ? (
          <>
            <div className="rounded-lg bg-muted/50 p-4 text-center">
              <p className="text-sm font-medium text-muted-foreground">Time Worked Today</p>
              <p className="text-3xl font-bold text-primary">{getElapsedTime()}</p>
              {activeBreak && activeBreakInfo && (
                <div className="mt-2 flex items-center justify-center gap-1 text-xs">
                  <Pause className={`h-3 w-3 ${activeBreakInfo.color}`} />
                  <span className={activeBreakInfo.color}>
                    On {activeBreakInfo.label.toLowerCase()}
                  </span>
                </div>
              )}
              {totalBreakTime > 0 && !activeBreak && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Total break time: {formatBreakDuration(totalBreakTime)} ({completedBreaksCount} break{completedBreaksCount !== 1 ? 's' : ''})
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
              {todaysBreaks.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Today's Breaks:</p>
                  {todaysBreaks.slice(-3).map((brk) => {
                    const breakInfo = BREAK_TYPES.find((b) => b.value === brk.break_type);
                    const Icon = breakInfo?.icon || Coffee;
                    return (
                      <div key={brk.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1">
                          <Icon className={`h-3 w-3 ${breakInfo?.color || ''}`} />
                          <span>{breakInfo?.label || brk.break_type}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {new Date(brk.break_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {brk.break_end ? (
                            <> - {new Date(brk.break_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                          ) : (
                            <span className="text-amber-500"> (ongoing)</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                  {todaysBreaks.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{todaysBreaks.length - 3} more break(s)
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-2">
              {activeBreak ? (
                <Button
                  onClick={handleEndBreak}
                  disabled={loading}
                  variant="outline"
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  Resume Work
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2" disabled={loading}>
                      <Pause className="h-4 w-4" />
                      Take a Break
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-48">
                    {BREAK_TYPES.map((breakType) => {
                      const Icon = breakType.icon;
                      return (
                        <DropdownMenuItem
                          key={breakType.value}
                          onClick={() => handleStartBreak(breakType.value)}
                          className="gap-2 cursor-pointer"
                        >
                          <Icon className={`h-4 w-4 ${breakType.color}`} />
                          {breakType.label}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Button
                onClick={handleClockOut}
                disabled={loading || !!activeBreak}
                variant="secondary"
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Clock Out
              </Button>

              {activeBreak ? (
                <p className="text-xs text-center text-muted-foreground">
                  Please end your break before clocking out
                </p>
              ) : (
                <p className="text-xs text-center text-muted-foreground">
                  💡 Remember to submit your EOD report before clocking out
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
