import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calculator } from 'lucide-react';
import { z } from 'zod';

const payrollSchema = z.object({
  employeeId: z.string().min(1, 'Please select an employee'),
  periodStart: z.string().min(1, 'Start date is required'),
  periodEnd: z.string().min(1, 'End date is required'),
  deductions: z.string().regex(/^\d*\.?\d*$/, 'Must be a valid number'),
  allowances: z.string().regex(/^\d*\.?\d*$/, 'Must be a valid number'),
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
  const [calculating, setCalculating] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [calculatedHours, setCalculatedHours] = useState<number>(0);
  const [formData, setFormData] = useState({
    employeeId: '',
    periodStart: '',
    periodEnd: '',
    deductions: '0',
    allowances: '0',
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

  const calculateHours = async () => {
    if (!formData.employeeId || !formData.periodStart || !formData.periodEnd) {
      toast({
        title: 'Missing Information',
        description: 'Please select employee and date range',
        variant: 'destructive',
      });
      return;
    }

    setCalculating(true);
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('total_hours')
        .eq('user_id', formData.employeeId)
        .gte('clock_in', `${formData.periodStart}T00:00:00`)
        .lte('clock_in', `${formData.periodEnd}T23:59:59`)
        .eq('status', 'completed');

      if (error) throw error;

      const totalHours = data?.reduce((sum, record) => sum + (record.total_hours || 0), 0) || 0;
      setCalculatedHours(totalHours);

      toast({
        title: 'Hours Calculated',
        description: `Total hours: ${totalHours.toFixed(2)}`,
      });
    } catch (error: any) {
      console.error('Error calculating hours:', error);
      toast({
        title: 'Calculation Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCalculating(false);
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
      let grossAmount = 0;

      if (selectedEmployee.hourly_rate) {
        grossAmount = calculatedHours * selectedEmployee.hourly_rate;
      } else if (selectedEmployee.monthly_salary) {
        grossAmount = selectedEmployee.monthly_salary;
      }

      const deductions = parseFloat(formData.deductions) || 0;
      const allowances = parseFloat(formData.allowances) || 0;
      const netAmount = grossAmount + allowances - deductions;

      const paymentDate = getNextPaymentDate();

      const { error } = await supabase.from('payroll').insert({
        user_id: formData.employeeId,
        period_start: formData.periodStart,
        period_end: formData.periodEnd,
        total_hours: calculatedHours,
        hourly_rate: selectedEmployee.hourly_rate,
        monthly_salary: selectedEmployee.monthly_salary,
        gross_amount: grossAmount,
        deductions,
        allowances,
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
        deductions: '0',
        allowances: '0',
      });
      setCalculatedHours(0);
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
    setFormData({ ...formData, employeeId });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Payroll</CardTitle>
        <CardDescription>
          Calculate and generate payroll for employees. Payment schedule: 1st and 16th of each month
          (adjusted to Monday if falls on weekend)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="employee">Employee *</Label>
            <Select value={formData.employeeId} onValueChange={handleEmployeeChange}>
              <SelectTrigger className={errors.employeeId ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name} - {emp.hourly_rate ? `$${emp.hourly_rate}/hr` : `$${emp.monthly_salary}/mo`}
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
              <Label htmlFor="periodStart">Period Start *</Label>
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
              <Label htmlFor="periodEnd">Period End *</Label>
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

          {selectedEmployee?.hourly_rate && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Hours Worked</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={calculateHours}
                  disabled={calculating}
                >
                  {calculating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <Calculator className="mr-2 h-4 w-4" />
                      Calculate Hours
                    </>
                  )}
                </Button>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{calculatedHours.toFixed(2)} hours</p>
                <p className="text-sm text-muted-foreground">
                  Gross: ${(calculatedHours * selectedEmployee.hourly_rate).toFixed(2)}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deductions">Deductions ($)</Label>
              <Input
                id="deductions"
                type="number"
                step="0.01"
                value={formData.deductions}
                onChange={(e) => setFormData({ ...formData, deductions: e.target.value })}
                className={errors.deductions ? 'border-destructive' : ''}
              />
              {errors.deductions && (
                <p className="text-sm text-destructive">{errors.deductions}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="allowances">Allowances ($)</Label>
              <Input
                id="allowances"
                type="number"
                step="0.01"
                value={formData.allowances}
                onChange={(e) => setFormData({ ...formData, allowances: e.target.value })}
                className={errors.allowances ? 'border-destructive' : ''}
              />
              {errors.allowances && (
                <p className="text-sm text-destructive">{errors.allowances}</p>
              )}
            </div>
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
