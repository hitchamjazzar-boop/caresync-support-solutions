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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

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
  profiles?: {
    full_name: string;
  };
}

export const AttendanceHistory = () => {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');
  const [employees, setEmployees] = useState<Array<{ id: string; full_name: string }>>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');

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

      // Fetch employee list if admin
      if (roleData) {
        const { data: employeeData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .order('full_name');
        
        setEmployees(employeeData || []);
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

      // Fetch attendance records with profile info
      let query = supabase
        .from('attendance')
        .select('*, profiles(full_name)')
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
      }

      setLoading(false);
    };

    fetchData();
  }, [user, selectedPeriod, selectedEmployee]);

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

  const getTotalHours = () => {
    return records
      .filter((r) => r.total_hours)
      .reduce((sum, r) => sum + (r.total_hours || 0), 0)
      .toFixed(2);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
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
          <div className="flex flex-col sm:flex-row gap-2">
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
                  <TableHead>Lunch</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    {isAdmin && (
                      <TableCell className="font-medium">
                        {record.profiles?.full_name || 'Unknown'}
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{formatDate(record.clock_in)}</TableCell>
                    <TableCell>{formatTime(record.clock_in)}</TableCell>
                    <TableCell>{formatTime(record.clock_out)}</TableCell>
                    <TableCell>{calculateLunchDuration(record.lunch_start, record.lunch_end)}</TableCell>
                    <TableCell>
                      {record.total_hours ? (
                        <span className="font-semibold">{record.total_hours.toFixed(2)}</span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Edit className="h-3 w-3" />
                          Edit
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
