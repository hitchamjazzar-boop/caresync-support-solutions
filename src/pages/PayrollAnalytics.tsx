import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO, startOfMonth } from 'date-fns';
import { DollarSign, TrendingUp, Users, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PayrollData {
  id: string;
  period_start: string;
  period_end: string;
  gross_amount: number;
  deductions: number;
  net_amount: number;
  status: string;
  user_id: string;
  profiles: {
    department: string | null;
    full_name: string;
  } | null;
}

interface MonthlyData {
  month: string;
  gross: number;
  deductions: number;
  net: number;
  count: number;
}

interface DepartmentData {
  department: string;
  total: number;
  count: number;
}

interface StatusData {
  status: string;
  count: number;
  amount: number;
}

export default function PayrollAnalytics() {
  const [loading, setLoading] = useState(true);
  const [payrollData, setPayrollData] = useState<PayrollData[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  useEffect(() => {
    fetchPayrollData();
  }, [selectedYear]);

  const fetchPayrollData = async () => {
    setLoading(true);
    try {
      const { data: payrollRecords, error: payrollError } = await supabase
        .from('payroll')
        .select('*')
        .gte('period_start', `${selectedYear}-01-01`)
        .lte('period_end', `${selectedYear}-12-31`)
        .order('period_start', { ascending: true });

      if (payrollError) throw payrollError;

      if (!payrollRecords || payrollRecords.length === 0) {
        setPayrollData([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(payrollRecords.map(p => p.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, department, full_name')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const mergedData = payrollRecords.map(payroll => ({
        ...payroll,
        profiles: profilesMap.get(payroll.user_id) || null,
      }));

      setPayrollData(mergedData as PayrollData[]);

      // Get available years
      const { data: allPayroll } = await supabase
        .from('payroll')
        .select('period_start')
        .order('period_start', { ascending: false });

      if (allPayroll) {
        const years = [...new Set(allPayroll.map(p => new Date(p.period_start).getFullYear().toString()))];
        setAvailableYears(years);
      }
    } catch (error) {
      console.error('Error fetching payroll data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMonthlyTrends = (): MonthlyData[] => {
    const monthlyMap = new Map<string, MonthlyData>();

    payrollData.forEach(record => {
      const monthKey = format(startOfMonth(parseISO(record.period_start)), 'MMM yyyy');
      
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month: monthKey,
          gross: 0,
          deductions: 0,
          net: 0,
          count: 0,
        });
      }

      const current = monthlyMap.get(monthKey)!;
      current.gross += Number(record.gross_amount);
      current.deductions += Number(record.deductions);
      current.net += Number(record.net_amount);
      current.count += 1;
    });

    return Array.from(monthlyMap.values());
  };

  const calculateDepartmentCosts = (): DepartmentData[] => {
    const deptMap = new Map<string, DepartmentData>();

    payrollData.forEach(record => {
      const dept = record.profiles?.department || 'Unassigned';
      
      if (!deptMap.has(dept)) {
        deptMap.set(dept, {
          department: dept,
          total: 0,
          count: 0,
        });
      }

      const current = deptMap.get(dept)!;
      current.total += Number(record.net_amount);
      current.count += 1;
    });

    return Array.from(deptMap.values()).sort((a, b) => b.total - a.total);
  };

  const calculateStatusDistribution = (): StatusData[] => {
    const statusMap = new Map<string, StatusData>();

    payrollData.forEach(record => {
      const status = record.status || 'pending';
      
      if (!statusMap.has(status)) {
        statusMap.set(status, {
          status: status.charAt(0).toUpperCase() + status.slice(1),
          count: 0,
          amount: 0,
        });
      }

      const current = statusMap.get(status)!;
      current.count += 1;
      current.amount += Number(record.net_amount);
    });

    return Array.from(statusMap.values());
  };

  const calculateTotals = () => {
    const totalGross = payrollData.reduce((sum, record) => sum + Number(record.gross_amount), 0);
    const totalDeductions = payrollData.reduce((sum, record) => sum + Number(record.deductions), 0);
    const totalNet = payrollData.reduce((sum, record) => sum + Number(record.net_amount), 0);
    const totalRecords = payrollData.length;
    const uniqueEmployees = new Set(payrollData.map(r => r.user_id)).size;

    return { totalGross, totalDeductions, totalNet, totalRecords, uniqueEmployees };
  };

  const monthlyTrends = calculateMonthlyTrends();
  const departmentCosts = calculateDepartmentCosts();
  const statusDistribution = calculateStatusDistribution();
  const totals = calculateTotals();

  const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#6366f1'];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payroll Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into payroll trends and costs
          </p>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map(year => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {payrollData.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            No payroll data found for {selectedYear}. Generate payroll records to see analytics.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totals.totalNet.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  Gross: ${totals.totalGross.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Deductions</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totals.totalDeductions.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  {((totals.totalDeductions / totals.totalGross) * 100).toFixed(1)}% of gross
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Employees Paid</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totals.uniqueEmployees}</div>
                <p className="text-xs text-muted-foreground">
                  {totals.totalRecords} total payments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Payment</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(totals.totalNet / totals.totalRecords).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Per payroll record
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <Tabs defaultValue="trends" className="space-y-4">
            <TabsList>
              <TabsTrigger value="trends">Monthly Trends</TabsTrigger>
              <TabsTrigger value="departments">Department Costs</TabsTrigger>
              <TabsTrigger value="status">Payment Status</TabsTrigger>
            </TabsList>

            <TabsContent value="trends" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Payroll Trends</CardTitle>
                  <CardDescription>
                    Track gross, deductions, and net payments over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="gross"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        name="Gross Amount"
                      />
                      <Line
                        type="monotone"
                        dataKey="deductions"
                        stroke="hsl(var(--destructive))"
                        strokeWidth={2}
                        name="Deductions"
                      />
                      <Line
                        type="monotone"
                        dataKey="net"
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={2}
                        name="Net Amount"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Count by Month</CardTitle>
                  <CardDescription>
                    Number of payroll records processed each month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                        }}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" name="Payment Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="departments" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Department Cost Distribution</CardTitle>
                    <CardDescription>
                      Total payroll costs by department
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={departmentCosts}
                          dataKey="total"
                          nameKey="department"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ department, percent }) =>
                            `${department}: ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {departmentCosts.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Department Breakdown</CardTitle>
                    <CardDescription>
                      Detailed cost analysis by department
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {departmentCosts.map((dept, index) => (
                        <div key={dept.department} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              />
                              <span className="font-medium">{dept.department}</span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {dept.count} {dept.count === 1 ? 'payment' : 'payments'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold">${dept.total.toFixed(2)}</div>
                            <div className="text-sm text-muted-foreground">
                              Avg: ${(dept.total / dept.count).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="status" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Status Distribution</CardTitle>
                    <CardDescription>
                      Breakdown of payments by status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={statusDistribution}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="status" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                          }}
                        />
                        <Bar dataKey="count" fill="hsl(var(--primary))" name="Count" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Status Summary</CardTitle>
                    <CardDescription>
                      Payment counts and amounts by status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {statusDistribution.map((status) => (
                        <div key={status.status} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{status.status}</span>
                            <span className="text-sm text-muted-foreground">
                              {status.count} {status.count === 1 ? 'payment' : 'payments'}
                            </span>
                          </div>
                          <div className="text-2xl font-bold">${status.amount.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
