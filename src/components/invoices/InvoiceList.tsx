import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Eye, FileText, CheckCircle, XCircle, Clock } from 'lucide-react';
import { InvoiceViewDialog } from './InvoiceViewDialog';
import { useToast } from '@/hooks/use-toast';

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  pay_period_start: string;
  pay_period_end: string;
  base_salary: number;
  deductions: number;
  deduction_notes: string | null;
  absent_days: number;
  absent_deduction: number;
  additional_items: any[];
  notes: string | null;
  total_amount: number;
  balance_due: number;
  status: string;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string;
    position: string | null;
    monthly_salary: number | null;
  } | null;
}

interface InvoiceListProps {
  userId?: string;
  showAllEmployees?: boolean;
}

export const InvoiceList = ({ userId, showAllEmployees = false }: InvoiceListProps) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchInvoices();
  }, [userId, showAllEmployees]);

  const fetchInvoices = async () => {
    setLoading(true);
    
    // First fetch invoices
    let query = supabase
      .from('employee_invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId && !showAllEmployees) {
      query = query.eq('user_id', userId);
    }

    const { data: invoicesData, error } = await query;

    if (invoicesData && invoicesData.length > 0) {
      // Get unique user IDs
      const userIds = [...new Set(invoicesData.map(inv => inv.user_id))];
      
      // Fetch profiles for these users
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, position, monthly_salary')
        .in('id', userIds);

      // Map profiles to invoices
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      
      const invoicesWithProfiles = invoicesData.map(inv => ({
        ...inv,
        profiles: profilesMap.get(inv.user_id) || null,
      }));

      setInvoices(invoicesWithProfiles as Invoice[]);
    } else {
      setInvoices([]);
    }
    setLoading(false);
  };

  const updateInvoiceStatus = async (invoiceId: string, newStatus: string) => {
    const updateData: any = { status: newStatus };
    
    // If marking as paid, set payment date to now
    if (newStatus === 'paid') {
      updateData.updated_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('employee_invoices')
      .update(updateData)
      .eq('id', invoiceId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update invoice status',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: `Invoice marked as ${newStatus}`,
      });
      fetchInvoices();
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      pending: { variant: 'secondary', icon: <Clock className="h-3 w-3 mr-1" /> },
      paid: { variant: 'default', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      cancelled: { variant: 'destructive', icon: <XCircle className="h-3 w-3 mr-1" /> },
    };
    const { variant, icon } = config[status] || { variant: 'outline' as const, icon: null };
    return (
      <Badge variant={variant} className="capitalize flex items-center w-fit">
        {icon}
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg">No Invoices Found</h3>
          <p className="text-muted-foreground">
            {showAllEmployees ? 'No invoices have been created yet.' : 'You have no invoices yet.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            {showAllEmployees ? 'All Employee Invoices' : 'My Invoices'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  {showAllEmployees && <TableHead>Employee</TableHead>}
                  <TableHead>Pay Period</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    {showAllEmployees && (
                      <TableCell>
                        <div>
                          <p className="font-medium">{invoice.profiles?.full_name}</p>
                          <p className="text-sm text-muted-foreground">{invoice.profiles?.position}</p>
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      {format(new Date(invoice.pay_period_start), 'MMM d')} -{' '}
                      {format(new Date(invoice.pay_period_end), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₱{invoice.total_amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {showAllEmployees ? (
                        <Select
                          value={invoice.status}
                          onValueChange={(value) => updateInvoiceStatus(invoice.id, value)}
                        >
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-2" />
                                Pending
                              </span>
                            </SelectItem>
                            <SelectItem value="paid">
                              <span className="flex items-center">
                                <CheckCircle className="h-3 w-3 mr-2" />
                                Paid
                              </span>
                            </SelectItem>
                            <SelectItem value="cancelled">
                              <span className="flex items-center">
                                <XCircle className="h-3 w-3 mr-2" />
                                Cancelled
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        getStatusBadge(invoice.status)
                      )}
                    </TableCell>
                    <TableCell>{format(new Date(invoice.invoice_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedInvoice(invoice)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <InvoiceViewDialog
        invoice={selectedInvoice}
        open={!!selectedInvoice}
        onOpenChange={(open) => !open && setSelectedInvoice(null)}
      />
    </>
  );
};
