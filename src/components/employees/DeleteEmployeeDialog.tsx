import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2 } from 'lucide-react';

interface DeleteEmployeeDialogProps {
  employeeId: string;
  employeeName: string;
  onSuccess: () => void;
}

export const DeleteEmployeeDialog = ({
  employeeId,
  employeeName,
  onSuccess,
}: DeleteEmployeeDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);

    try {
      // Delete related records first (in order of dependencies)
      // 1. Delete EOD reports
      const { error: eodError } = await supabase
        .from('eod_reports')
        .delete()
        .eq('user_id', employeeId);

      if (eodError) throw eodError;

      // 2. Delete schedules
      const { error: schedulesError } = await supabase
        .from('schedules')
        .delete()
        .eq('user_id', employeeId);

      if (schedulesError) throw schedulesError;

      // 3. Delete payroll records
      const { error: payrollError } = await supabase
        .from('payroll')
        .delete()
        .eq('user_id', employeeId);

      if (payrollError) throw payrollError;

      // 4. Delete attendance records
      const { error: attendanceError } = await supabase
        .from('attendance')
        .delete()
        .eq('user_id', employeeId);

      if (attendanceError) throw attendanceError;

      // 5. Delete user roles
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', employeeId);

      if (rolesError) throw rolesError;

      // 6. Delete profile (this should be handled by cascade, but we do it explicitly)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', employeeId);

      if (profileError) throw profileError;

      // 7. Finally, delete the auth user (requires admin privileges)
      const { error: authError } = await supabase.auth.admin.deleteUser(employeeId);

      if (authError) throw authError;

      toast({
        title: 'Employee Deleted',
        description: `${employeeName} has been removed from the system`,
      });

      setOpen(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete employee. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="w-full">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Employee
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              This action cannot be undone. This will permanently delete{' '}
              <strong>{employeeName}</strong>'s account and remove all associated data
              from the system.
            </p>
            <p className="text-destructive font-medium">
              The following data will be deleted:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Profile information</li>
              <li>Attendance records</li>
              <li>Schedule assignments</li>
              <li>Payroll history</li>
              <li>EOD reports</li>
              <li>User account access</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Employee'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
