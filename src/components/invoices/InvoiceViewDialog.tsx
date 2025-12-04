import { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Download, Printer } from 'lucide-react';
import logo from '@/assets/logo.png';

interface AdditionalItem {
  description: string;
  quantity: number;
  rate: number;
  total: number;
}

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
  additional_items: AdditionalItem[];
  notes: string | null;
  total_amount: number;
  balance_due: number;
  status: string;
  profiles?: {
    full_name: string;
    position: string | null;
    monthly_salary: number | null;
  };
}

interface InvoiceViewDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InvoiceViewDialog = ({ invoice, open, onOpenChange }: InvoiceViewDialogProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!invoice) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoice_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
            .logo { height: 60px; }
            .invoice-title { font-size: 28px; font-weight: bold; color: #333; }
            .invoice-info { text-align: right; }
            .section { margin-bottom: 20px; }
            .section-title { font-weight: bold; margin-bottom: 10px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
            th { background: #f5f5f5; font-weight: 600; }
            .text-right { text-align: right; }
            .total-row { font-weight: bold; font-size: 18px; background: #f0f7ff; }
            .balance-due { font-size: 24px; font-weight: bold; color: #2563eb; text-align: right; margin-top: 20px; }
            .notes { background: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 20px; }
            .deduction { color: #dc2626; }
            .addition { color: #16a34a; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Invoice Details</span>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print / Download
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div ref={printRef} className="space-y-6 p-4">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <img src={logo} alt="Care Sync" className="h-12 mb-2" />
              <p className="text-sm text-muted-foreground">Care Sync Support Solutions</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold">INVOICE</h2>
              <p className="text-muted-foreground">{invoice.invoice_number}</p>
              <p className="text-sm mt-2">
                Date: {format(new Date(invoice.invoice_date), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>

          <Separator />

          {/* Bill To */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-muted-foreground mb-2">Bill To:</h3>
              <p className="font-medium text-lg">{invoice.profiles?.full_name}</p>
              <p className="text-muted-foreground">{invoice.profiles?.position || 'Employee'}</p>
            </div>
            <div className="text-right">
              <h3 className="font-semibold text-muted-foreground mb-2">Pay Period:</h3>
              <p className="font-medium">
                {format(new Date(invoice.pay_period_start), 'MMMM d')} -{' '}
                {format(new Date(invoice.pay_period_end), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>

          <Separator />

          {/* Invoice Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-3 px-4 text-left font-semibold">Description</th>
                  <th className="py-3 px-4 text-center font-semibold">Qty</th>
                  <th className="py-3 px-4 text-right font-semibold">Rate</th>
                  <th className="py-3 px-4 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {/* Base Salary */}
                <tr className="border-b">
                  <td className="py-3 px-4">Base Salary (Pay Period)</td>
                  <td className="py-3 px-4 text-center">1</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(invoice.base_salary)}</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(invoice.base_salary)}</td>
                </tr>

                {/* Deductions */}
                {invoice.deductions > 0 && (
                  <tr className="border-b text-destructive">
                    <td className="py-3 px-4">
                      Deductions
                      {invoice.deduction_notes && (
                        <span className="block text-sm text-muted-foreground">
                          ({invoice.deduction_notes})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">1</td>
                    <td className="py-3 px-4 text-right">-{formatCurrency(invoice.deductions)}</td>
                    <td className="py-3 px-4 text-right">-{formatCurrency(invoice.deductions)}</td>
                  </tr>
                )}

                {/* Absent Deduction */}
                {invoice.absent_days > 0 && (
                  <tr className="border-b text-destructive">
                    <td className="py-3 px-4">LWOP / Absent Deduction</td>
                    <td className="py-3 px-4 text-center">{invoice.absent_days} days</td>
                    <td className="py-3 px-4 text-right">
                      -{formatCurrency(invoice.absent_deduction / invoice.absent_days)}
                    </td>
                    <td className="py-3 px-4 text-right">-{formatCurrency(invoice.absent_deduction)}</td>
                  </tr>
                )}

                {/* Additional Items */}
                {(() => {
                  const items = typeof invoice.additional_items === 'string' 
                    ? JSON.parse(invoice.additional_items || '[]') 
                    : (invoice.additional_items || []);
                  return items.map((item: AdditionalItem, index: number) => (
                    <tr key={index} className="border-b text-green-600">
                      <td className="py-3 px-4">{item.description}</td>
                      <td className="py-3 px-4 text-center">{item.quantity}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(item.rate)}</td>
                      <td className="py-3 px-4 text-right">+{formatCurrency(item.total)}</td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(invoice.base_salary)}</span>
              </div>
              {(invoice.deductions > 0 || invoice.absent_deduction > 0) && (
                <div className="flex justify-between py-2 border-b text-destructive">
                  <span>Total Deductions</span>
                  <span>-{formatCurrency(invoice.deductions + invoice.absent_deduction)}</span>
                </div>
              )}
              <div className="flex justify-between py-3 text-xl font-bold">
                <span>Balance Due</span>
                <span className="text-primary">{formatCurrency(invoice.balance_due)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Notes:</h4>
              <p className="text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground pt-6 border-t">
            <p>Thank you for your hard work!</p>
            <p className="mt-1">Care Sync Support Solutions</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
