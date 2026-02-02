import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { BreakTimeReport } from '@/components/attendance/BreakTimeReport';
import { Users, Briefcase, Coffee, AlertTriangle, CalendarIcon, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  full_name: string;
  photo_url: string | null;
}

interface BreakRecord {
  id: string;
  break_type: string;
  break_start: string;
  break_end: string | null;
}

interface AttendanceRecord {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out: string | null;
  total_hours: number | null;
  status: string;
  profile: {
    full_name: string;
    photo_url: string | null;
  };
  breaks: BreakRecord[];
}

const BREAK_LIMIT_MINUTES = 15;

type DateRangePreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'custom';

const AttendanceAnalytics = () => {
  const navigate = useNavigate();
  const { isAdmin, hasPermission, loading: adminLoading } = useAdmin();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('today');
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(),
    to: new Date(),
  });
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [showOnlyExceeded, setShowOnlyExceeded] = useState(false);

  const getDateRange = () => {
    const now = new Date();
    switch (dateRangePreset) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'yesterday':
        const yesterday = subDays(now, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      case 'this_week':
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'this_month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'custom':
        return { start: startOfDay(customDateRange.from), end: endOfDay(customDateRange.to) };
      default:
        return { start: startOfDay(now), end: endOfDay(now) };
    }
  };

  useEffect(() => {
    if (!adminLoading && !isAdmin && !hasPermission('attendance')) {
      navigate('/');
    }
  }, [adminLoading, isAdmin, hasPermission, navigate]);

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, photo_url')
        .order('full_name');
      
      if (data) setProfiles(data);
    };

    fetchProfiles();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { start, end } = getDateRange();

      let query = supabase
        .from('attendance')
        .select(`
          id,
          user_id,
          clock_in,
          clock_out,
          total_hours,
          status
        `)
        .gte('clock_in', start.toISOString())
        .lte('clock_in', end.toISOString())
        .order('clock_in', { ascending: false });

      if (selectedEmployee !== 'all') {
        query = query.eq('user_id', selectedEmployee);
      }

      const { data: attendanceData, error } = await query;

      if (error) {
        console.error('Error fetching attendance:', error);
        setLoading(false);
        return;
      }

      if (!attendanceData || attendanceData.length === 0) {
        setRecords([]);
        setLoading(false);
        return;
      }

      // Fetch breaks for all attendance records
      const attendanceIds = attendanceData.map((a) => a.id);
      const { data: breaksData } = await supabase
        .from('attendance_breaks')
        .select('*')
        .in('attendance_id', attendanceIds)
        .order('break_start', { ascending: true });

      // Fetch profiles for all users
      const userIds = [...new Set(attendanceData.map((a) => a.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, photo_url')
        .in('id', userIds);

      // Create lookup maps
      const profileMap = new Map(profilesData?.map((p) => [p.id, p]) || []);
      const breaksMap = new Map<string, BreakRecord[]>();
      breaksData?.forEach((brk) => {
        const existing = breaksMap.get(brk.attendance_id) || [];
        existing.push(brk);
        breaksMap.set(brk.attendance_id, existing);
      });

      // Combine data
      const combinedRecords: AttendanceRecord[] = attendanceData.map((att) => ({
        ...att,
        profile: profileMap.get(att.user_id) || { full_name: 'Unknown', photo_url: null },
        breaks: breaksMap.get(att.id) || [],
      }));

      // Filter by exceeded if needed
      let filteredRecords = combinedRecords;
      if (showOnlyExceeded) {
        filteredRecords = combinedRecords.filter((record) => {
          const totalBreakMinutes = record.breaks.reduce((total, brk) => {
            if (brk.break_end) {
              const start = new Date(brk.break_start);
              const end = new Date(brk.break_end);
              return total + (end.getTime() - start.getTime()) / 1000 / 60;
            }
            return total;
          }, 0);
          return totalBreakMinutes > BREAK_LIMIT_MINUTES;
        });
      }

      setRecords(filteredRecords);
      setLoading(false);
    };

    fetchData();
  }, [dateRangePreset, customDateRange, selectedEmployee, showOnlyExceeded]);

  // Calculate summary stats
  const totalEmployeesToday = new Set(records.map((r) => r.user_id)).size;
  const employeesWorking = records.filter((r) => r.status === 'active' && !r.breaks.some((b) => !b.break_end)).length;
  const employeesOnBreak = records.filter((r) => r.status === 'active' && r.breaks.some((b) => !b.break_end)).length;
  const employeesExceeded = records.filter((r) => {
    const totalBreakMinutes = r.breaks.reduce((total, brk) => {
      if (brk.break_end) {
        const start = new Date(brk.break_start);
        const end = new Date(brk.break_end);
        return total + (end.getTime() - start.getTime()) / 1000 / 60;
      }
      return total;
    }, 0);
    return totalBreakMinutes > BREAK_LIMIT_MINUTES;
  }).length;

  if (adminLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/attendance')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Attendance Analytics</h1>
          <p className="text-muted-foreground">Monitor employee break times and work hours</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tracked</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployeesToday}</div>
            <p className="text-xs text-muted-foreground">employees in period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Currently Working</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{employeesWorking}</div>
            <p className="text-xs text-muted-foreground">active now</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Break</CardTitle>
            <Coffee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{employeesOnBreak}</div>
            <p className="text-xs text-muted-foreground">taking a break</p>
          </CardContent>
        </Card>

        <Card className={employeesExceeded > 0 ? 'border-destructive' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Over Break Limit</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${employeesExceeded > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${employeesExceeded > 0 ? 'text-destructive' : ''}`}>
              {employeesExceeded}
            </div>
            <p className="text-xs text-muted-foreground">exceeded 15min limit</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter the report by date range and employee</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateRangePreset} onValueChange={(v) => setDateRangePreset(v as DateRangePreset)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRangePreset === 'custom' && (
              <div className="space-y-2">
                <Label>Custom Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn('w-60 justify-start text-left font-normal')}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(customDateRange.from, 'MMM d')} - {format(customDateRange.to, 'MMM d, yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={{ from: customDateRange.from, to: customDateRange.to }}
                      onSelect={(range) => {
                        if (range?.from && range?.to) {
                          setCustomDateRange({ from: range.from, to: range.to });
                        } else if (range?.from) {
                          setCustomDateRange({ from: range.from, to: range.from });
                        }
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="exceeded-only"
                checked={showOnlyExceeded}
                onCheckedChange={setShowOnlyExceeded}
              />
              <Label htmlFor="exceeded-only" className="cursor-pointer">
                Show only exceeded
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Table */}
      <Card>
        <CardHeader>
          <CardTitle>Break Time Report</CardTitle>
          <CardDescription>
            Employees are allowed a maximum of 15 minutes of break time per day
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BreakTimeReport records={records} loading={loading} />
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceAnalytics;
