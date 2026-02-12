import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { FileText, Download, Calendar, User, Trash2, CalendarIcon, ArrowUpDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface EODReport {
  id: string;
  user_id: string;
  attendance_id: string;
  tasks_completed: string;
  client_updates: string | null;
  content_liked: string | null;
  issues: string | null;
  notes: string | null;
  attachments: any;
  submitted_at: string;
  profiles: {
    full_name: string;
    position: string;
    photo_url: string | null;
  } | null;
}

export const EODReportList = () => {
  const { user } = useAuth();
  const { isAdmin, hasPermission, loading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const [reports, setReports] = useState<EODReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'today' | 'week' | 'all'>('today');
  const [employees, setEmployees] = useState<Array<{ id: string; full_name: string }>>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'name'>('newest');

  // Check if user can view all reports (admin or has reports permission)
  const canViewAllReports = isAdmin || hasPermission('reports');

  useEffect(() => {
    if (!adminLoading && canViewAllReports) {
      fetchEmployees();
    }
  }, [adminLoading, canViewAllReports]);

  useEffect(() => {
    if (!adminLoading) {
      fetchReports();
    }
  }, [user, adminLoading, canViewAllReports, filter, selectedEmployee, dateFrom, dateTo, sortOrder]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchReports = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('eod_reports')
        .select('*');

      // Apply date filter
      const now = new Date();
      if (dateFrom && dateTo) {
        // Custom date range
        query = query
          .gte('submitted_at', dateFrom.toISOString())
          .lte('submitted_at', new Date(dateTo.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString());
      } else if (filter === 'today') {
        const today = now.toISOString().split('T')[0];
        query = query.gte('submitted_at', `${today}T00:00:00`).lte('submitted_at', `${today}T23:59:59`);
      } else if (filter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        query = query.gte('submitted_at', weekAgo.toISOString());
      }

      // Users without reports permission can only see their own reports
      if (!canViewAllReports) {
        query = query.eq('user_id', user.id);
      } else if (selectedEmployee !== 'all') {
        query = query.eq('user_id', selectedEmployee);
      }

      const { data: reportsData, error: reportsError } = await query;

      if (reportsError) throw reportsError;

      if (!reportsData || reportsData.length === 0) {
        setReports([]);
        return;
      }

      // Fetch profiles for all unique user IDs
      const userIds = [...new Set(reportsData.map(r => r.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, position, photo_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Merge profiles with reports
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      let mergedReports = reportsData.map(report => ({
        ...report,
        profiles: profilesMap.get(report.user_id) || null,
      })) as EODReport[];

      // Apply sorting
      mergedReports.sort((a, b) => {
        if (sortOrder === 'newest') {
          return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
        } else if (sortOrder === 'oldest') {
          return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
        } else if (sortOrder === 'name') {
          const nameA = a.profiles?.full_name || '';
          const nameB = b.profiles?.full_name || '';
          return nameA.localeCompare(nameB);
        }
        return 0;
      });

      setReports(mergedReports);
    } catch (error) {
      console.error('Error fetching EOD reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('eod_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: 'Report Deleted',
        description: 'EOD report has been deleted successfully',
      });

      fetchReports();
    } catch (error: any) {
      console.error('Error deleting EOD report:', error);
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const ReportCard = ({ report }: { report: EODReport }) => {
    const attachments = Array.isArray(report.attachments) ? report.attachments : [];
    
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {report.profiles?.photo_url ? (
                <img
                  src={report.profiles.photo_url}
                  alt={report.profiles.full_name}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <CardTitle className="text-base">{report.profiles?.full_name || 'Unknown'}</CardTitle>
                <p className="text-sm text-muted-foreground">{report.profiles?.position || 'N/A'}</p>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(report.submitted_at), 'MMM dd, yyyy')}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(report.submitted_at), 'hh:mm a')}
              </p>
            </div>
            {canViewAllReports && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete EOD Report?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the EOD report from{' '}
                      <strong>{report.profiles?.full_name}</strong> submitted on{' '}
                      {format(new Date(report.submitted_at), 'MMM dd, yyyy')}. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(report.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-sm mb-2">Tasks Completed</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap break-all overflow-hidden">
            {report.tasks_completed}
          </p>
        </div>

        {report.client_updates && (
          <div>
            <h4 className="font-semibold text-sm mb-2">Client Updates</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap break-all overflow-hidden">
              {report.client_updates}
            </p>
          </div>
        )}

        {report.content_liked && (
          <div>
            <h4 className="font-semibold text-sm mb-2">Content Liked</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap break-all overflow-hidden">
              {report.content_liked}
            </p>
          </div>
        )}

        {report.issues && (
          <div>
            <h4 className="font-semibold text-sm mb-2">Issues/Blockers</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap break-all overflow-hidden">
              {report.issues}
            </p>
          </div>
        )}

        {report.notes && (
          <div>
            <h4 className="font-semibold text-sm mb-2">Additional Notes</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap break-all overflow-hidden">
              {report.notes}
            </p>
          </div>
        )}

        {attachments.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-2">Attachments</h4>
            <div className="space-y-2">
              {attachments.map((file: any, index: number) => (
                <a
                  key={index}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm flex-1">{file.name}</span>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </a>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">EOD Reports</h2>
          <Tabs value={filter} onValueChange={(v) => {
            setFilter(v as any);
            setDateFrom(undefined);
            setDateTo(undefined);
          }}>
            <TabsList>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="week">This Week</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Employee Filter (users with reports permission) */}
              {canViewAllReports && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Employee</label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="All employees" />
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
                </div>
              )}

              {/* Date From */}
              <div>
                <label className="text-sm font-medium mb-2 block">From Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !dateFrom && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateFrom}
                      onSelect={(date) => {
                        setDateFrom(date);
                        setFilter('all');
                      }}
                      initialFocus
                      className={cn('p-3 pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date To */}
              <div>
                <label className="text-sm font-medium mb-2 block">To Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !dateTo && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateTo}
                      onSelect={(date) => {
                        setDateTo(date);
                        setFilter('all');
                      }}
                      disabled={(date) => dateFrom ? date < dateFrom : false}
                      initialFocus
                      className={cn('p-3 pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Sort Order */}
              <div>
                <label className="text-sm font-medium mb-2 block">Sort By</label>
                <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">
                      <div className="flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4" />
                        Newest First
                      </div>
                    </SelectItem>
                    <SelectItem value="oldest">
                      <div className="flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4" />
                        Oldest First
                      </div>
                    </SelectItem>
                    <SelectItem value="name">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        By Name (A-Z)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Clear Filters Button */}
            {(selectedEmployee !== 'all' || dateFrom || dateTo) && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedEmployee('all');
                    setDateFrom(undefined);
                    setDateTo(undefined);
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted" />
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-muted rounded" />
                      <div className="h-3 w-24 bg-muted rounded" />
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="h-6 w-24 bg-muted rounded" />
                    <div className="h-3 w-16 bg-muted rounded ml-auto" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-full bg-muted rounded" />
                  <div className="h-3 w-full bg-muted rounded" />
                  <div className="h-3 w-3/4 bg-muted rounded" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-28 bg-muted rounded" />
                  <div className="h-3 w-full bg-muted rounded" />
                  <div className="h-3 w-2/3 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            No EOD reports found for the selected period.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
};
