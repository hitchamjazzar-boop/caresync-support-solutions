import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Plus, Trash2, Calculator } from 'lucide-react';

interface Employee {
  id: string;
  full_name: string;
  position: string | null;
  monthly_salary: number | null;
}

interface AdditionalItem {
  description: string;
  quantity: number;
  rate: number;
  total: number;
}

interface CreateInvoiceFormProps {
  onInvoiceCreated: () => void;
}

export const CreateInvoiceForm = ({ onInvoiceCreated }: CreateInvoiceFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [payCycle, setPayCycle] = useState<'first' | 'second'>('first');
  const [baseSalary, setBaseSalary] = useState(0);
  const [deductions, setDeductions] = useState(0);
  const [deductionNotes, setDeductionNotes] = useState('');
  const [absentDays, setAbsentDays] = useState(0);
  const [notes, setNotes] = useState('');
  const [additionalItems, setAdditionalItems] = useState<AdditionalItem[]>([]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, position, monthly_salary')
      .order('full_name');

    if (data) {
      setEmployees(data);
    }
    setLoading(false);
  };

  const handleEmployeeSelect = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId);
    if (employee) {
      setSelectedEmployee(employee);
      const monthlySalary = employee.monthly_salary || 0;
      setBaseSalary(monthlySalary / 2); // Half of monthly salary per pay cycle
    }
  };

  const getPayPeriodDates = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    if (payCycle === 'first') {
      return {
        start: new Date(year, month, 1),
        end: new Date(year, month, 15),
      };
    } else {
      return {
        start: new Date(year, month, 16),
        end: endOfMonth(now),
      };
    }
  };

  const generateInvoiceNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}-${random}`;
  };

  const calculateAbsentDeduction = () => {
    if (!selectedEmployee?.monthly_salary || absentDays === 0) return 0;
    const dailyRate = selectedEmployee.monthly_salary / 30; // Assuming 30 days per month
    return dailyRate * absentDays;
  };

  const calculateAdditionalItemsTotal = () => {
    return additionalItems.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTotalAmount = () => {
    const absentDeduction = calculateAbsentDeduction();
    const additionalTotal = calculateAdditionalItemsTotal();
    return baseSalary - deductions - absentDeduction + additionalTotal;
  };

  const addAdditionalItem = () => {
    setAdditionalItems([
      ...additionalItems,
      { description: '', quantity: 1, rate: 0, total: 0 },
    ]);
  };

  const updateAdditionalItem = (index: number, field: keyof AdditionalItem, value: string | number) => {
    const updated = [...additionalItems];
    if (field === 'description') {
      updated[index].description = value as string;
    } else {
      const numValue = Number(value) || 0;
      updated[index][field] = numValue;
      if (field === 'quantity' || field === 'rate') {
        updated[index].total = updated[index].quantity * updated[index].rate;
      }
    }
    setAdditionalItems(updated);
  };

  const removeAdditionalItem = (index: number) => {
    setAdditionalItems(additionalItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedEmployee || !user) {
      toast({
        title: 'Error',
        description: 'Please select an employee',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    const payPeriod = getPayPeriodDates();
    const absentDeduction = calculateAbsentDeduction();
    const totalAmount = calculateTotalAmount();

    const invoiceData = {
      user_id: selectedEmployee.id,
      invoice_number: generateInvoiceNumber(),
      invoice_date: new Date().toISOString().split('T')[0],
      pay_period_start: format(payPeriod.start, 'yyyy-MM-dd'),
      pay_period_end: format(payPeriod.end, 'yyyy-MM-dd'),
      base_salary: baseSalary,
      deductions,
      deduction_notes: deductionNotes || null,
      absent_days: absentDays,
      absent_deduction: absentDeduction,
      additional_items: additionalItems.length > 0 ? JSON.stringify(additionalItems) : '[]',
      notes: notes || null,
      total_amount: totalAmount,
      balance_due: totalAmount,
      status: 'pending',
      created_by: user.id,
    };

    const { error } = await supabase.from('employee_invoices').insert(invoiceData);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to create invoice',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Invoice created successfully',
      });
      // Reset form
      setSelectedEmployee(null);
      setBaseSalary(0);
      setDeductions(0);
      setDeductionNotes('');
      setAbsentDays(0);
      setNotes('');
      setAdditionalItems([]);
      onInvoiceCreated();
    }

    setSubmitting(false);
  };

  const payPeriod = getPayPeriodDates();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Create New Invoice
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Employee Selection */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Select Employee</Label>
            <Select onValueChange={handleEmployeeSelect} value={selectedEmployee?.id || ''}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Pay Cycle</Label>
            <Select value={payCycle} onValueChange={(v) => setPayCycle(v as 'first' | 'second')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="first">1st - 15th (First Half)</SelectItem>
                <SelectItem value="second">16th - End of Month (Second Half)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Employee Info (Auto-populated) */}
        {selectedEmployee && (
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label className="text-muted-foreground">Employee Name</Label>
                  <p className="font-medium">{selectedEmployee.full_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Position</Label>
                  <p className="font-medium">{selectedEmployee.position || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Monthly Salary</Label>
                  <p className="font-medium">
                    ₱{(selectedEmployee.monthly_salary || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Pay Period</Label>
                  <p className="font-medium">
                    {format(payPeriod.start, 'MMM d, yyyy')} - {format(payPeriod.end, 'MMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Base Salary (This Period)</Label>
                  <p className="font-medium text-primary">
                    ₱{baseSalary.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manual Adjustments */}
        <div className="space-y-4">
          <h3 className="font-semibold">Adjustments</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Deductions (₱)</Label>
              <Input
                type="number"
                min="0"
                value={deductions}
                onChange={(e) => setDeductions(Number(e.target.value) || 0)}
                placeholder="Late, penalties, advances..."
              />
            </div>
            <div className="space-y-2">
              <Label>Absent Days (LWOP)</Label>
              <Input
                type="number"
                min="0"
                value={absentDays}
                onChange={(e) => setAbsentDays(Number(e.target.value) || 0)}
              />
              {absentDays > 0 && selectedEmployee?.monthly_salary && (
                <p className="text-sm text-muted-foreground">
                  Deduction: ₱{calculateAbsentDeduction().toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Deduction Notes</Label>
            <Textarea
              value={deductionNotes}
              onChange={(e) => setDeductionNotes(e.target.value)}
              placeholder="Explain deductions (late, penalties, advances, etc.)"
              rows={2}
            />
          </div>
        </div>

        {/* Additional Line Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Additional Line Items</h3>
            <Button type="button" variant="outline" size="sm" onClick={addAdditionalItem}>
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </div>

          {additionalItems.map((item, index) => (
            <div key={index} className="grid gap-4 md:grid-cols-5 items-end border p-3 rounded-lg">
              <div className="md:col-span-2 space-y-2">
                <Label>Description</Label>
                <Input
                  value={item.description}
                  onChange={(e) => updateAdditionalItem(index, 'description', e.target.value)}
                  placeholder="Bonus, allowance, etc."
                />
              </div>
              <div className="space-y-2">
                <Label>Qty</Label>
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateAdditionalItem(index, 'quantity', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Rate (₱)</Label>
                <Input
                  type="number"
                  min="0"
                  value={item.rate}
                  onChange={(e) => updateAdditionalItem(index, 'rate', e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Label>Total</Label>
                  <p className="font-medium">₱{item.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAdditionalItem(index)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Additional Notes</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes for this invoice..."
            rows={3}
          />
        </div>

        {/* Summary */}
        {selectedEmployee && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Base Salary</span>
                  <span>₱{baseSalary.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
                {deductions > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Deductions</span>
                    <span>-₱{deductions.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {absentDays > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Absent Deduction ({absentDays} days)</span>
                    <span>-₱{calculateAbsentDeduction().toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {additionalItems.length > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Additional Items</span>
                    <span>+₱{calculateAdditionalItemsTotal().toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                  <span>Total Amount / Balance Due</span>
                  <span className="text-primary">
                    ₱{calculateTotalAmount().toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!selectedEmployee || submitting}
          className="w-full"
          size="lg"
        >
          {submitting ? 'Creating Invoice...' : 'Create Invoice'}
        </Button>
      </CardContent>
    </Card>
  );
};
