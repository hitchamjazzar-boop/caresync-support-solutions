import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { DollarSign, Calendar, CheckCircle, Clock, AlertCircle, Download, Trash2 } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/contexts/AuthContext';
import { generatePayslipPDF } from '@/lib/payslipGenerator';
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

interface PayrollRecord {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  total_hours: number;
  gross_amount: number;
  deductions: number;
  allowances: number;
  net_amount: number;
  payment_date: string | null;
  status: string;
  hourly_rate: number | null;
  monthly_salary: number | null;
  profiles: {
    full_name: string;
    position: string;
    department: string | null;
    contact_email: string | null;
    photo_url: string | null;
  } | null;
}

export const PayrollList = ({ refresh }: { refresh: number }) => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayrolls();
  }, [user, isAdmin, refresh]);

  const fetchPayrolls = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('payroll')
        .select('*')
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.eq('user_id', user.id);
      }

      const { data: payrollData, error: payrollError } = await query;

      if (payrollError) throw payrollError;

      if (!payrollData || payrollData.length === 0) {
        setPayrolls([]);
        return;
      }

      const userIds = [...new Set(payrollData.map(p => p.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, position, department, contact_email, photo_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      const mergedPayrolls = payrollData.map(payroll => ({
        ...payroll,
        profiles: profilesMap.get(payroll.user_id) || null,
      }));

      setPayrolls(mergedPayrolls as PayrollRecord[]);
    } catch (error) {
      console.error('Error fetching payrolls:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (payrollId: string) => {
    try {
      const { error } = await supabase
        .from('payroll')
        .update({ status: 'paid' })
        .eq('id', payrollId);

      if (error) throw error;

      toast({
        title: 'Payment Confirmed',
        description: 'Payroll marked as paid successfully',
      });

      fetchPayrolls();
    } catch (error: any) {
      console.error('Error updating payroll:', error);
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'processing':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const handleDownloadPayslip = async (payroll: PayrollRecord) => {
    try {
      toast({
        title: 'Generating Payslip',
        description: 'Your payslip PDF is being generated...',
      });
      await generatePayslipPDF(payroll);
      toast({
        title: 'Download Complete',
        description: 'Your payslip has been downloaded successfully',
      });
    } catch (error: any) {
      console.error('Error generating payslip:', error);
      toast({
        title: 'Download Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (payrollId: string) => {
    try {
      const { error } = await supabase
        .from('payroll')
        .delete()
        .eq('id', payrollId);

      if (error) throw error;

      toast({
        title: 'Payroll Deleted',
        description: 'Payroll record has been deleted successfully',
      });

      fetchPayrolls();
    } catch (error: any) {
      console.error('Error deleting payroll:', error);
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading payroll records...</div>;
  }

  if (payrolls.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8 text-muted-foreground">
          No payroll records found. Generate your first payroll above.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Payroll Records</h2>
      {payrolls.map((payroll) => (
        <Card key={payroll.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {payroll.profiles?.photo_url ? (
                  <img
                    src={payroll.profiles.photo_url}
                    alt={payroll.profiles.full_name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-lg font-semibold text-muted-foreground">
                      {payroll.profiles?.full_name.charAt(0) || '?'}
                    </span>
                  </div>
                )}
                <div>
                  <CardTitle className="text-base">{payroll.profiles?.full_name || 'Unknown'}</CardTitle>
                  <p className="text-sm text-muted-foreground">{payroll.profiles?.position || 'N/A'}</p>
                </div>
              </div>
              <Badge variant={getStatusColor(payroll.status)} className="gap-1">
                {getStatusIcon(payroll.status)}
                {payroll.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Period
                </p>
                <p className="text-sm font-medium">
                  {format(new Date(payroll.period_start), 'MMM dd')} - {format(new Date(payroll.period_end), 'MMM dd, yyyy')}
                </p>
              </div>
              {payroll.payment_date && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Payment Date
                  </p>
                  <p className="text-sm font-medium">
                    {format(new Date(payroll.payment_date), 'MMM dd, yyyy')}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Hours Worked</p>
                <p className="text-lg font-bold">{payroll.total_hours.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Gross Amount</p>
                <p className="text-lg font-bold">₱{payroll.gross_amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Deductions</p>
                <p className="text-lg font-bold text-destructive">-₱{payroll.deductions.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Net Amount</p>
                <p className="text-xl font-bold text-primary">
                  ₱{payroll.net_amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {payroll.allowances > 0 && (
              <div className="text-sm text-muted-foreground">
                Allowances: +₱{payroll.allowances.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => handleDownloadPayslip(payroll)}
                variant="outline"
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Payslip
              </Button>

              {isAdmin && payroll.status === 'pending' && (
                <Button
                  onClick={() => markAsPaid(payroll.id)}
                  variant="default"
                  className="flex-1"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark as Paid
                </Button>
              )}

              {isAdmin && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Payroll Record?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this payroll record for{' '}
                        <strong>{payroll.profiles?.full_name}</strong> for the period{' '}
                        {format(new Date(payroll.period_start), 'MMM dd')} -{' '}
                        {format(new Date(payroll.period_end), 'MMM dd, yyyy')}. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(payroll.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
