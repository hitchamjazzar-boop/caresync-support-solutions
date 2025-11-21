import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';

const employeeSchema = z.object({
  full_name: z.string().trim().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  position: z.string().trim().max(100, 'Position must be less than 100 characters').optional().or(z.literal('')),
  department: z.string().trim().max(100, 'Department must be less than 100 characters').optional().or(z.literal('')),
  contact_email: z.string().trim().email('Invalid email').max(255, 'Email must be less than 255 characters').optional().or(z.literal('')),
  contact_phone: z.string().trim().max(20, 'Phone must be less than 20 characters').optional().or(z.literal('')),
  hourly_rate: z.string().regex(/^\d*\.?\d*$/, 'Must be a valid number').optional().or(z.literal('')),
  monthly_salary: z.string().regex(/^\d*\.?\d*$/, 'Must be a valid number').optional().or(z.literal('')),
});

interface Employee {
  id: string;
  full_name: string;
  position: string | null;
  department: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  hourly_rate: number | null;
  monthly_salary: number | null;
  start_date: string;
}

interface EditEmployeeDialogProps {
  employee: Employee;
  onSuccess: () => void;
}

export const EditEmployeeDialog = ({ employee, onSuccess }: EditEmployeeDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: employee.full_name,
    position: employee.position || '',
    department: employee.department || '',
    contact_email: employee.contact_email || '',
    contact_phone: employee.contact_phone || '',
    hourly_rate: employee.hourly_rate?.toString() || '',
    monthly_salary: employee.monthly_salary?.toString() || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    try {
      employeeSchema.parse(formData);
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

    // Validate that only one compensation method is used
    if (formData.hourly_rate && formData.monthly_salary) {
      toast({
        title: 'Invalid Compensation',
        description: 'Please provide either hourly rate or monthly salary, not both',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          position: formData.position || null,
          department: formData.department || null,
          contact_email: formData.contact_email || null,
          contact_phone: formData.contact_phone || null,
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
          monthly_salary: formData.monthly_salary ? parseFloat(formData.monthly_salary) : null,
        })
        .eq('id', employee.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Employee details updated successfully',
      });

      setOpen(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error updating employee:', error);
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          Edit Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Employee Details</DialogTitle>
          <DialogDescription>
            Update employee information and compensation details
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className={errors.full_name ? 'border-destructive' : ''}
              />
              {errors.full_name && (
                <p className="text-sm text-destructive">{errors.full_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="e.g., Staff, Manager"
                className={errors.position ? 'border-destructive' : ''}
              />
              {errors.position && (
                <p className="text-sm text-destructive">{errors.position}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g., Operations, HR"
                className={errors.department ? 'border-destructive' : ''}
              />
              {errors.department && (
                <p className="text-sm text-destructive">{errors.department}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="email@example.com"
                className={errors.contact_email ? 'border-destructive' : ''}
              />
              {errors.contact_email && (
                <p className="text-sm text-destructive">{errors.contact_email}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="contact_phone">Contact Phone</Label>
              <Input
                id="contact_phone"
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
                className={errors.contact_phone ? 'border-destructive' : ''}
              />
              {errors.contact_phone && (
                <p className="text-sm text-destructive">{errors.contact_phone}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="hourly_rate">Hourly Rate (₱)</Label>
              <Input
                id="hourly_rate"
                type="number"
                step="0.01"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value, monthly_salary: '' })}
                placeholder="25.00"
                className={errors.hourly_rate ? 'border-destructive' : ''}
              />
              {errors.hourly_rate && (
                <p className="text-sm text-destructive">{errors.hourly_rate}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly_salary">Monthly Salary (₱)</Label>
              <Input
                id="monthly_salary"
                type="number"
                step="0.01"
                value={formData.monthly_salary}
                onChange={(e) => setFormData({ ...formData, monthly_salary: e.target.value, hourly_rate: '' })}
                placeholder="5000.00"
                className={errors.monthly_salary ? 'border-destructive' : ''}
              />
              {errors.monthly_salary && (
                <p className="text-sm text-destructive">{errors.monthly_salary}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Provide either hourly rate or monthly salary, not both
              </p>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
