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
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, UserMinus } from 'lucide-react';

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
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleOffboard = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          archived_at: new Date().toISOString(),
          archived_by: user?.id ?? null,
        } as any)
        .eq('id', employeeId);

      if (error) throw error;

      toast({
        title: 'Employee Offboarded',
        description: `${employeeName} has been archived. Their history is preserved and can be restored anytime.`,
      });

      setOpen(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error offboarding employee:', error);
      toast({
        title: 'Offboard Failed',
        description: error?.message || 'Failed to offboard employee.',
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
          <UserMinus className="mr-2 h-4 w-4" />
          Offboard Employee
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Offboard {employeeName}?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              This will archive <strong>{employeeName}</strong> and hide them from active
              employee lists. <strong>All historical data is preserved</strong> (attendance,
              EOD reports, payroll, etc.) and the employee can be restored at any time from
              the Archived view.
            </p>
            <p className="text-muted-foreground text-sm">
              The user account remains in the system but will no longer appear in active
              rosters.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleOffboard();
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Offboarding...
              </>
            ) : (
              'Offboard'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
