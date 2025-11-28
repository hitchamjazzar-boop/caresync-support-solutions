import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/hooks/useAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Building2,
  DollarSign,
  Clock,
  TrendingUp,
  FileText,
  Wallet,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { ResetPasswordDialog } from '@/components/employees/ResetPasswordDialog';
import { ProfilePhotoUpload } from '@/components/profile/ProfilePhotoUpload';
import { EmployeeAchievementsBadges } from '@/components/profile/EmployeeAchievementsBadges';
import { ProfileAvatarWithBadges } from '@/components/profile/ProfileAvatarWithBadges';

interface Profile {
  id: string;
  full_name: string;
  photo_url: string | null;
  position: string | null;
  department: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  start_date: string;
  hourly_rate: number | null;
  monthly_salary: number | null;
  payment_method: string | null;
  bank_name: string | null;
  account_holder_name: string | null;
  account_number: string | null;
  routing_number: string | null;
}

interface AttendanceRecord {
  id: string;
  clock_in: string;
  clock_out: string | null;
  total_hours: number | null;
  status: string;
}

interface PayrollRecord {
  id: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  deductions: number;
  net_amount: number;
  status: string;
  payment_date: string | null;
}

interface EODReport {
  id: string;
  submitted_at: string;
  tasks_completed: string;
  issues: string | null;
}

export default function EmployeeProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [payroll, setPayroll] = useState<PayrollRecord[]>([]);
  const [eodReports, setEODReports] = useState<EODReport[]>([]);

  useEffect(() => {
    if (!id) return;

    // Wait for admin status to load before checking permissions
    if (adminLoading) return;

    // Check permissions
    if (!isAdmin && user?.id !== id) {
      toast({
        title: 'Access Denied',
        description: 'You can only view your own profile',
        variant: 'destructive',
      });
      navigate('/employees');
      return;
    }

    fetchEmployeeData();
  }, [id, user, isAdmin, adminLoading]);

  const fetchEmployeeData = async () => {
    if (!id) return;

    setLoading(true);

    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch attendance records (last 30 days)
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', id)
        .order('clock_in', { ascending: false })
        .limit(20);

      if (attendanceError) throw attendanceError;
      setAttendance(attendanceData || []);

      // Fetch payroll records
      const { data: payrollData, error: payrollError } = await supabase
        .from('payroll')
        .select('*')
        .eq('user_id', id)
        .order('period_start', { ascending: false })
        .limit(10);

      if (payrollError) throw payrollError;
      setPayroll(payrollData || []);

      // Fetch EOD reports
      const { data: eodData, error: eodError } = await supabase
        .from('eod_reports')
        .select('*')
        .eq('user_id', id)
        .order('submitted_at', { ascending: false })
        .limit(10);

      if (eodError) throw eodError;
      setEODReports(eodData || []);
    } catch (error: any) {
      console.error('Error fetching employee data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load employee data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const totalHours = attendance.reduce(
      (sum, record) => sum + (record.total_hours || 0),
      0
    );
    const completedDays = attendance.filter((r) => r.status === 'completed').length;
    const totalPayroll = payroll.reduce((sum, record) => sum + record.net_amount, 0);
    const paidPayroll = payroll
      .filter((r) => r.status === 'paid')
      .reduce((sum, record) => sum + record.net_amount, 0);

    return { totalHours, completedDays, totalPayroll, paidPayroll };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Employee not found</p>
        <Button onClick={() => navigate('/employees')} className="mt-4">
          Back to Employees
        </Button>
      </div>
    );
  }

  const stats = calculateStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/employees')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Employee Profile</h1>
            <p className="text-muted-foreground">Comprehensive employee information and history</p>
          </div>
        </div>
        {isAdmin && id !== user?.id && (
          <ResetPasswordDialog 
            userId={profile.id} 
            userName={profile.full_name}
            variant="default"
            size="default"
          />
        )}
      </div>

      {/* Profile Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            {user?.id === id ? (
              <ProfilePhotoUpload
                userId={id}
                currentPhotoUrl={profile.photo_url}
                userName={profile.full_name}
                onPhotoUpdated={fetchEmployeeData}
              />
            ) : (
              <ProfileAvatarWithBadges
                userId={id}
                photoUrl={profile.photo_url}
                fullName={profile.full_name}
                className="h-24 w-24"
              />
            )}

            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-bold">{profile.full_name}</h2>
                <p className="text-muted-foreground">{profile.position || 'Staff'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Department:</span>
                  <span>{profile.department || 'Not assigned'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Email:</span>
                  <span className="truncate">{profile.contact_email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Phone:</span>
                  <span>{profile.contact_phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Start Date:</span>
                  <span>{format(parseISO(profile.start_date), 'MMM dd, yyyy')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Compensation:</span>
                  <span>
                    {profile.hourly_rate
                      ? `₱${profile.hourly_rate}/hr`
                      : profile.monthly_salary
                      ? `₱${profile.monthly_salary}/mo`
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHours.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Last 20 records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Days</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedDays}</div>
            <p className="text-xs text-muted-foreground">Last 20 records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{stats.totalPayroll.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">EOD Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eodReports.length}</div>
            <p className="text-xs text-muted-foreground">Last 10 reports</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Personal Info Tab */}
        <TabsContent value="personal" className="space-y-4">
          <EmployeeAchievementsBadges userId={id!} />

          <Card>
            <CardHeader>
              <CardTitle>Employee Details</CardTitle>
              <CardDescription>Complete profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Full Name</Label>
                  <p className="text-sm text-muted-foreground">{profile.full_name}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Position</Label>
                  <p className="text-sm text-muted-foreground">
                    {profile.position || 'Not specified'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Department</Label>
                  <p className="text-sm text-muted-foreground">
                    {profile.department || 'Not assigned'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Contact Email</Label>
                  <p className="text-sm text-muted-foreground">{profile.contact_email}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Contact Phone</Label>
                  <p className="text-sm text-muted-foreground">
                    {profile.contact_phone || 'Not provided'}
                  </p>
                </div>
                {isAdmin && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Address</Label>
                    <p className="text-sm text-muted-foreground">
                      {profile.address || 'Not provided'}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Start Date</Label>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(profile.start_date), 'MMMM dd, yyyy')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Employment Type</Label>
                  <p className="text-sm text-muted-foreground">
                    {profile.hourly_rate ? 'Hourly' : profile.monthly_salary ? 'Salaried' : 'N/A'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Compensation</Label>
                  <p className="text-sm text-muted-foreground">
                    {profile.hourly_rate
                      ? `₱${profile.hourly_rate.toFixed(2)} per hour`
                      : profile.monthly_salary
                      ? `₱${profile.monthly_salary.toFixed(2)} per month`
                      : 'Not set'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {isAdmin && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  <CardTitle>Payment Information</CardTitle>
                </div>
                <CardDescription>Bank account and payment details</CardDescription>
              </CardHeader>
              <CardContent>
                {!profile.payment_method && !profile.bank_name ? (
                  <p className="text-sm text-muted-foreground py-4">
                    No payment information provided yet
                  </p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Payment Method</Label>
                      <p className="text-sm text-muted-foreground">
                        {profile.payment_method === 'bank_account'
                          ? 'Bank Account'
                          : profile.payment_method === 'digital_bank'
                          ? 'Digital Bank'
                          : profile.payment_method === 'e_wallet'
                          ? 'E-Wallet'
                          : 'Not specified'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        {profile.payment_method === 'e_wallet'
                          ? 'E-Wallet Provider'
                          : profile.payment_method === 'digital_bank'
                          ? 'Digital Bank'
                          : 'Bank Name'}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {profile.bank_name || 'Not provided'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Account Holder Name</Label>
                      <p className="text-sm text-muted-foreground">
                        {profile.account_holder_name || 'Not provided'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        {profile.payment_method === 'e_wallet' ? 'Mobile Number' : 'Account Number'}
                      </Label>
                      <p className="text-sm text-muted-foreground font-mono">
                        {profile.account_number || 'Not provided'}
                      </p>
                    </div>
                    {profile.payment_method === 'bank_account' && profile.routing_number && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Branch Code</Label>
                        <p className="text-sm text-muted-foreground">
                          {profile.routing_number}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance History</CardTitle>
              <CardDescription>Recent clock in/out records</CardDescription>
            </CardHeader>
            <CardContent>
              {attendance.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No attendance records found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          {format(parseISO(record.clock_in), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>{format(parseISO(record.clock_in), 'h:mm a')}</TableCell>
                        <TableCell>
                          {record.clock_out
                            ? format(parseISO(record.clock_out), 'h:mm a')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {record.total_hours ? `${record.total_hours.toFixed(2)}h` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              record.status === 'completed'
                                ? 'default'
                                : record.status === 'active'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {record.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll Tab */}
        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payroll History</CardTitle>
              <CardDescription>Payment records and earnings</CardDescription>
            </CardHeader>
            <CardContent>
              {payroll.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No payroll records found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Gross</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Net</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payroll.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          {format(parseISO(record.period_start), 'MMM dd')} -{' '}
                          {format(parseISO(record.period_end), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>₱{record.gross_amount.toFixed(2)}</TableCell>
                        <TableCell className="text-destructive">
                          ₱{record.deductions.toFixed(2)}
                        </TableCell>
                        <TableCell className="font-medium">
                          ₱{record.net_amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {record.payment_date
                            ? format(parseISO(record.payment_date), 'MMM dd, yyyy')
                            : 'Pending'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              record.status === 'paid'
                                ? 'default'
                                : record.status === 'pending'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {record.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>EOD reports and task completion</CardDescription>
            </CardHeader>
            <CardContent>
              {eodReports.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No EOD reports found</p>
              ) : (
                <div className="space-y-4">
                  {eodReports.map((report) => (
                    <Card key={report.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">
                            {format(parseISO(report.submitted_at), 'MMMM dd, yyyy - h:mm a')}
                          </CardTitle>
                          <Badge variant="outline">
                            <TrendingUp className="mr-1 h-3 w-3" />
                            Report
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <p className="text-sm font-medium">Tasks Completed:</p>
                          <p className="text-sm text-muted-foreground">{report.tasks_completed}</p>
                        </div>
                        {report.issues && (
                          <div>
                            <p className="text-sm font-medium">Issues:</p>
                            <p className="text-sm text-muted-foreground">{report.issues}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
