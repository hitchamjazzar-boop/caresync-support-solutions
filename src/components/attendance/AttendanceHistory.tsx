import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Calendar, Clock, Edit, Coffee, User, Timer, MoreHorizontal, Briefcase, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const BREAK_TYPES = [
  { value: 'lunch', label: 'Lunch', icon: Coffee, color: 'text-orange-500' },
  { value: 'coffee', label: 'Coffee', icon: Coffee, color: 'text-amber-600' },
  { value: 'bathroom', label: 'CR', icon: User, color: 'text-blue-500' },
  { value: 'personal', label: 'Personal', icon: Timer, color: 'text-purple-500' },
  { value: 'other', label: 'Other', icon: MoreHorizontal, color: 'text-muted-foreground' },
] as const;

interface BreakRecord {
  id: string;
  attendance_id: string;
  break_type: string;
  break_start: string;
  break_end: string | null;
}

interface AttendanceRecord {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  lunch_start: string | null;
  lunch_end: string | null;
  total_hours: number | null;
  status: string;
  created_at: string;
}

export const AttendanceHistory = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');
  const [employees, setEmployees] = useState<Array<{ id: string; full_name: string }>>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [breaksMap, setBreaksMap] = useState<Record<string, BreakRecord[]>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);

      // Check if user is admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      setIsAdmin(!!roleData);

      // Fetch all profiles for name mapping
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name');
      
      if (profilesData) {
        const map = profilesData.reduce((acc, profile) => {
          acc[profile.id] = profile.full_name;
          return acc;
        }, {} as Record<string, string>);
        setProfilesMap(map);
        
        if (roleData) {
          setEmployees(profilesData);
        }
      }

      // Calculate date range based on selected period
      const now = new Date();
      let startDate: Date;

      if (selectedPeriod === 'week') {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
      } else {
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
      }

      // Fetch attendance records without join
      let query = supabase
        .from('attendance')
        .select('*')
        .gte('clock_in', startDate.toISOString())
        .order('clock_in', { ascending: false });

      // If not admin, filter to own records
      if (!roleData) {
        query = query.eq('user_id', user.id);
      } else if (selectedEmployee !== 'all') {
        query = query.eq('user_id', selectedEmployee);
      }

      const { data, error } = await query;

      if (error) {
        toast.error('Failed to load attendance records');
        console.error(error);
      } else {
        setRecords(data || []);
        
        // Fetch breaks for all attendance records
        if (data && data.length > 0) {
          const attendanceIds = data.map((r) => r.id);
          const { data: breaksData } = await supabase
            .from('attendance_breaks')
            .select('*')
            .in('attendance_id', attendanceIds)
            .order('break_start', { ascending: true });

          if (breaksData) {
            const breaksByAttendance = breaksData.reduce((acc, brk) => {
              if (!acc[brk.attendance_id]) {
                acc[brk.attendance_id] = [];
              }
              acc[brk.attendance_id].push(brk);
              return acc;
            }, {} as Record<string, BreakRecord[]>);
            setBreaksMap(breaksByAttendance);
          }
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [user, selectedPeriod, selectedEmployee, refreshKey]);

  // Auto-refresh every 30 seconds to catch break status changes
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(k => k + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update current time every second for live timers
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const calculateLunchDuration = (lunchStart: string | null, lunchEnd: string | null) => {
    if (!lunchStart || !lunchEnd) return '-';
    const start = new Date(lunchStart);
    const end = new Date(lunchEnd);
    const minutes = (end.getTime() - start.getTime()) / 1000 / 60;
    return `${Math.round(minutes)} min`;
  };

  const calculateTotalBreakTime = (breaks: BreakRecord[]) => {
    const now = new Date().getTime();
    return breaks.reduce((total, brk) => {
      if (brk.break_end) {
        const start = new Date(brk.break_start);
        const end = new Date(brk.break_end);
        return total + (end.getTime() - start.getTime());
      } else {
        // Include ongoing break time
        const start = new Date(brk.break_start);
        return total + (now - start.getTime());
      }
    }, 0);
  };

  const formatBreakDuration = (ms: number) => {
    const minutes = Math.floor(ms / 1000 / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getBreaksSummary = (attendanceId: string) => {
    const breaks = breaksMap[attendanceId] || [];
    if (breaks.length === 0) return null;
    
    const totalTime = calculateTotalBreakTime(breaks);
    const hasOngoingBreak = breaks.some(brk => !brk.break_end);
    const breakCounts = breaks.reduce((acc, brk) => {
      acc[brk.break_type] = (acc[brk.break_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { totalTime, breakCounts, breaks, hasOngoingBreak };
  };

  const getElapsedTime = (clockIn: string, breaks: BreakRecord[]) => {
    const start = new Date(clockIn);
    let elapsed = currentTime.getTime() - start.getTime();

    // Subtract completed break times only
    breaks.forEach(brk => {
      if (brk.break_end) {
        const breakStart = new Date(brk.break_start);
        const breakEnd = new Date(brk.break_end);
        elapsed -= (breakEnd.getTime() - breakStart.getTime());
      }
    });

    const hours = Math.floor(elapsed / 1000 / 60 / 60);
    const minutes = Math.floor((elapsed / 1000 / 60) % 60);
    const seconds = Math.floor((elapsed / 1000) % 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getBreakElapsedTime = (breakStart: string) => {
    const start = new Date(breakStart);
    const elapsed = currentTime.getTime() - start.getTime();
    const minutes = Math.floor(elapsed / 1000 / 60);
    const seconds = Math.floor((elapsed / 1000) % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTotalHours = () => {
    return records
      .filter((r) => r.total_hours)
      .reduce((sum, r) => sum + (r.total_hours || 0), 0)
      .toFixed(2);
  };

  const getStatusBadge = (status: string, attendanceId: string, clockIn: string) => {
    if (status === 'active') {
      // Check if currently on a break
      const breaks = breaksMap[attendanceId] || [];
      const activeBreak = breaks.find(brk => !brk.break_end);
      
      if (activeBreak) {
        const breakInfo = BREAK_TYPES.find(b => b.value === activeBreak.break_type);
        const Icon = breakInfo?.icon || Coffee;
        return (
          <div className="flex flex-col items-start gap-1">
            <Badge variant="secondary" className="gap-1 animate-pulse">
              <Icon className={`h-3 w-3 ${breakInfo?.color || ''}`} />
              On {breakInfo?.label || 'Break'}
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              Break: {getBreakElapsedTime(activeBreak.break_start)}
            </span>
          </div>
        );
      }
      
      return (
        <div className="flex flex-col items-start gap-1">
          <Badge variant="default" className="gap-1">
            <Briefcase className="h-3 w-3" />
            Working
          </Badge>
          <span className="text-xs text-primary font-mono font-medium">
            {getElapsedTime(clockIn, breaks)}
          </span>
        </div>
      );
    }
    
    switch (status) {
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      case 'corrected':
        return <Badge variant="outline">Corrected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Attendance History
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Total Hours: <span className="font-semibold text-foreground">{getTotalHours()}</span>
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRefreshKey(k => k + 1)}
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {isAdmin && (
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as 'week' | 'month')}>
              <TabsList>
                <TabsTrigger value="week">This Week</TabsTrigger>
                <TabsTrigger value="month">This Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No attendance records found for this period</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {isAdmin && <TableHead>Employee</TableHead>}
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Breaks</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => {
                  const breaksSummary = getBreaksSummary(record.id);
                  
                  return (
                    <TableRow key={record.id}>
                      {isAdmin && (
                        <TableCell className="font-medium">
                          {profilesMap[record.user_id] || 'Unknown'}
                        </TableCell>
                      )}
                      <TableCell className="font-medium">{formatDate(record.clock_in)}</TableCell>
                      <TableCell>{formatTime(record.clock_in)}</TableCell>
                      <TableCell>{formatTime(record.clock_out)}</TableCell>
                      <TableCell>
                        {breaksSummary ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1.5 cursor-help">
                                  <span className={`text-sm ${breaksSummary.hasOngoingBreak ? 'text-amber-600 font-medium' : ''}`}>
                                    {formatBreakDuration(breaksSummary.totalTime)}
                                  </span>
                                  {breaksSummary.hasOngoingBreak && (
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-warning"></span>
                                    </span>
                                  )}
                                  <div className="flex -space-x-1">
                                    {Object.entries(breaksSummary.breakCounts).slice(0, 3).map(([type, count]) => {
                                      const breakInfo = BREAK_TYPES.find(b => b.value === type);
                                      const Icon = breakInfo?.icon || Coffee;
                                      return (
                                        <div 
                                          key={type} 
                                          className={`h-4 w-4 rounded-full bg-muted flex items-center justify-center ${breakInfo?.color || ''}`}
                                        >
                                          <Icon className="h-2.5 w-2.5" />
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-xs">
                                <div className="space-y-1 text-xs">
                                  <p className="font-medium">Break Details:</p>
                                  {breaksSummary.breaks.map((brk) => {
                                    const breakInfo = BREAK_TYPES.find(b => b.value === brk.break_type);
                                    const duration = brk.break_end 
                                      ? formatBreakDuration(new Date(brk.break_end).getTime() - new Date(brk.break_start).getTime())
                                      : 'ongoing';
                                    return (
                                      <div key={brk.id} className="flex justify-between gap-4">
                                        <span>{breakInfo?.label || brk.break_type}</span>
                                        <span className="text-muted-foreground">
                                          {new Date(brk.break_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          {' - '}
                                          {brk.break_end 
                                            ? new Date(brk.break_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                            : '...'
                                          }
                                          {' '}({duration})
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          // Fallback to old lunch column for legacy data
                          calculateLunchDuration(record.lunch_start, record.lunch_end)
                        )}
                      </TableCell>
                      <TableCell>
                        {record.total_hours ? (
                          <span className="font-semibold">{record.total_hours.toFixed(2)}</span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status, record.id, record.clock_in)}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Button variant="ghost" size="sm" className="gap-1">
                            <Edit className="h-3 w-3" />
                            Edit
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
