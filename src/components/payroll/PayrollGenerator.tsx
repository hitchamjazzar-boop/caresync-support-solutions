import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';

const payrollSchema = z.object({
  employeeId: z.string().min(1, 'Please select an employee'),
  periodStart: z.string().min(1, 'Start date is required'),
  periodEnd: z.string().min(1, 'End date is required'),
  salary: z.string().min(1, 'Salary is required').regex(/^\d+\.?\d*$/, 'Must be a valid number'),
  deductions: z.string().regex(/^\d*\.?\d*$/, 'Must be a valid number'),
});

interface Employee {
  id: string;
  full_name: string;
  hourly_rate: number | null;
  monthly_salary: number | null;
}

export const PayrollGenerator = ({ onSuccess }: { onSuccess: () => void }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    periodStart: '',
    periodEnd: '',
    salary: '',
    deductions: '0',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, hourly_rate, monthly_salary')
      .not('hourly_rate', 'is', null)
      .or('monthly_salary.not.is.null');

    if (data) setEmployees(data);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const calculateHours = async (employeeId: string, periodStart: string, periodEnd: string): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('total_hours')
        .eq('user_id', employeeId)
        .gte('clock_in', `${periodStart}T00:00:00`)
        .lte('clock_in', `${periodEnd}T23:59:59`)
        .eq('status', 'completed');

      if (error) throw error;

      return data?.reduce((sum, record) => sum + (record.total_hours || 0), 0) || 0;
    } catch (error) {
      console.error('Error calculating hours:', error);
      return 0;
    }
  };

  const validateForm = () => {
    try {
      payrollSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const getNextPaymentDate = () => {
    const today = new Date();
    const day = today.getDate();
    
    let paymentDate: Date;
    if (day < 16) {
      paymentDate = new Date(today.getFullYear(), today.getMonth(), 16);
    } else {
      paymentDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    }

    // Adjust for weekends
    const dayOfWeek = paymentDate.getDay();
    if (dayOfWeek === 0) { // Sunday
      paymentDate.setDate(paymentDate.getDate() + 1);
    } else if (dayOfWeek === 6) { // Saturday
      paymentDate.setDate(paymentDate.getDate() + 2);
    }

    return paymentDate.toISOString().split('T')[0];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please check the form for errors',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedEmployee) {
      toast({
        title: 'No Employee Selected',
        description: 'Please select an employee',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const salary = parseFloat(formData.salary) || 0;
      let grossAmount = 0;
      let totalHours = 0;

      // Calculate hours for hourly employees
      if (selectedEmployee.hourly_rate) {
        totalHours = await calculateHours(formData.employeeId, formData.periodStart, formData.periodEnd);
        grossAmount = totalHours * salary;
      } else {
        grossAmount = salary;
      }

      const deductions = parseFloat(formData.deductions) || 0;
      const netAmount = grossAmount - deductions;

      const paymentDate = getNextPaymentDate();

      const { error } = await supabase.from('payroll').insert({
        user_id: formData.employeeId,
        period_start: formData.periodStart,
        period_end: formData.periodEnd,
        total_hours: totalHours,
        hourly_rate: selectedEmployee.hourly_rate ? salary : null,
        monthly_salary: selectedEmployee.monthly_salary ? salary : null,
        gross_amount: grossAmount,
        deductions,
        allowances: 0,
        net_amount: netAmount,
        payment_date: paymentDate,
        status: 'pending',
      });

      if (error) throw error;

      toast({
        title: 'Payroll Generated',
        description: `Payment scheduled for ${new Date(paymentDate).toLocaleDateString()}`,
      });

      onSuccess();
      setFormData({
        employeeId: '',
        periodStart: '',
        periodEnd: '',
        salary: '',
        deductions: '0',
      });
      setSelectedEmployee(null);
    } catch (error: any) {
      console.error('Error generating payroll:', error);
      toast({
        title: 'Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeChange = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    setSelectedEmployee(employee || null);
    
    // Pre-fill salary with current rate/salary
    const defaultSalary = employee?.hourly_rate || employee?.monthly_salary || '';
    setFormData({ ...formData, employeeId, salary: defaultSalary.toString() });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Payroll</CardTitle>
        <CardDescription>
          Select employee and period to generate payroll. Hours are calculated automatically for hourly employees.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="employee">Employee</Label>
            <Select value={formData.employeeId} onValueChange={handleEmployeeChange}>
              <SelectTrigger className={errors.employeeId ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.employeeId && (
              <p className="text-sm text-destructive">{errors.employeeId}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="periodStart">Period Start</Label>
              <Input
                id="periodStart"
                type="date"
                required
                value={formData.periodStart}
                onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
                className={errors.periodStart ? 'border-destructive' : ''}
              />
              {errors.periodStart && (
                <p className="text-sm text-destructive">{errors.periodStart}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodEnd">Period End</Label>
              <Input
                id="periodEnd"
                type="date"
                required
                value={formData.periodEnd}
                onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
                className={errors.periodEnd ? 'border-destructive' : ''}
              />
              {errors.periodEnd && (
                <p className="text-sm text-destructive">{errors.periodEnd}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="salary">
              Salary {selectedEmployee?.hourly_rate && '(Hourly Rate)'}
            </Label>
            <Input
              id="salary"
              type="number"
              step="0.01"
              placeholder={selectedEmployee?.hourly_rate ? "Hourly rate" : "Salary amount"}
              value={formData.salary}
              onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
              className={errors.salary ? 'border-destructive' : ''}
            />
            {errors.salary && (
              <p className="text-sm text-destructive">{errors.salary}</p>
            )}
            {selectedEmployee?.hourly_rate && (
              <p className="text-xs text-muted-foreground">
                Hours will be calculated automatically from attendance records
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="deductions">Deductions</Label>
            <Input
              id="deductions"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.deductions}
              onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
              className={errors.deductions ? 'border-destructive' : ''}
            />
            {errors.deductions && (
              <p className="text-sm text-destructive">{errors.deductions}</p>
            )}
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Payroll...
              </>
            ) : (
              'Generate Payroll'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
