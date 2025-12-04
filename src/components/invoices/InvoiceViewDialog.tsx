import { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Download, Printer, CheckCircle, Clock, XCircle } from 'lucide-react';
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
  additional_items: AdditionalItem[] | string;
  notes: string | null;
  total_amount: number;
  balance_due: number;
  status: string;
  updated_at?: string;
  profiles?: {
    full_name: string;
    position: string | null;
    monthly_salary: number | null;
  } | null;
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
          <title>Invoice ${invoice.invoice_number} - Care Sync</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              padding: 40px; 
              max-width: 800px; 
              margin: 0 auto; 
              background: #fff;
              color: #1a1a1a;
            }
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-start; 
              margin-bottom: 40px;
              padding-bottom: 30px;
              border-bottom: 3px solid #2563eb;
            }
            .logo-section { display: flex; flex-direction: column; }
            .logo { height: 50px; margin-bottom: 10px; }
            .company-name { 
              font-size: 24px; 
              font-weight: 700; 
              color: #2563eb;
              letter-spacing: -0.5px;
            }
            .company-tagline { 
              font-size: 12px; 
              color: #666; 
              margin-top: 4px;
            }
            .invoice-header { text-align: right; }
            .invoice-title { 
              font-size: 36px; 
              font-weight: 700; 
              color: #2563eb;
              letter-spacing: -1px;
            }
            .invoice-number { 
              font-size: 14px; 
              color: #666; 
              margin-top: 5px;
            }
            .invoice-date { 
              font-size: 13px; 
              margin-top: 10px;
              color: #444;
            }
            .status-badge {
              display: inline-block;
              padding: 6px 14px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
              margin-top: 10px;
            }
            .status-pending { background: #fef3c7; color: #92400e; }
            .status-paid { background: #d1fae5; color: #065f46; }
            .status-cancelled { background: #fee2e2; color: #991b1b; }
            .bill-section { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 30px;
              background: #f8fafc;
              padding: 20px;
              border-radius: 8px;
            }
            .section-title { 
              font-size: 11px; 
              font-weight: 600; 
              color: #666; 
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 8px;
            }
            .employee-name { font-size: 18px; font-weight: 600; color: #1a1a1a; }
            .employee-position { font-size: 13px; color: #666; }
            .pay-period { font-size: 14px; font-weight: 500; }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 25px 0; 
            }
            th { 
              padding: 14px 12px; 
              text-align: left; 
              background: #2563eb;
              color: white;
              font-weight: 600;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            th:first-child { border-radius: 8px 0 0 0; }
            th:last-child { border-radius: 0 8px 0 0; }
            td { 
              padding: 14px 12px; 
              border-bottom: 1px solid #e5e7eb; 
              font-size: 14px;
            }
            tr:last-child td { border-bottom: none; }
            .text-right { text-align: right; }
            .text-center { text-center: center; }
            .deduction { color: #dc2626; }
            .addition { color: #16a34a; }
            .totals-section {
              display: flex;
              justify-content: flex-end;
              margin-top: 20px;
            }
            .totals-box {
              width: 280px;
              background: #f8fafc;
              border-radius: 8px;
              padding: 20px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              font-size: 14px;
            }
            .total-row.final {
              border-top: 2px solid #2563eb;
              margin-top: 10px;
              padding-top: 15px;
              font-size: 20px;
              font-weight: 700;
              color: #2563eb;
            }
            .notes-section {
              background: #fffbeb;
              border-left: 4px solid #f59e0b;
              padding: 15px 20px;
              margin-top: 30px;
              border-radius: 0 8px 8px 0;
            }
            .notes-title { 
              font-weight: 600; 
              font-size: 13px;
              color: #92400e;
              margin-bottom: 8px;
            }
            .notes-content { font-size: 13px; color: #78350f; line-height: 1.5; }
            .footer {
              text-align: center;
              margin-top: 50px;
              padding-top: 30px;
              border-top: 1px solid #e5e7eb;
            }
            .footer-text { font-size: 14px; color: #666; }
            .footer-company { 
              font-size: 16px; 
              font-weight: 600; 
              color: #2563eb;
              margin-top: 5px;
            }
            .footer-contact {
              font-size: 12px;
              color: #999;
              margin-top: 10px;
            }
            @media print {
              body { padding: 20px; }
              .header { border-bottom-width: 2px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-section">
              <img src="${logo}" alt="Care Sync" class="logo" />
              <div class="company-name">Care Sync</div>
              <div class="company-tagline">Support Solutions</div>
            </div>
            <div class="invoice-header">
              <div class="invoice-title">INVOICE</div>
              <div class="invoice-number">${invoice.invoice_number}</div>
              <div class="invoice-date">Date: ${format(new Date(invoice.invoice_date), 'MMMM d, yyyy')}</div>
              <div class="status-badge status-${invoice.status}">${invoice.status}</div>
            </div>
          </div>

          <div class="bill-section">
            <div>
              <div class="section-title">Bill To</div>
              <div class="employee-name">${invoice.profiles?.full_name || 'Employee'}</div>
              <div class="employee-position">${invoice.profiles?.position || 'Staff'}</div>
            </div>
            <div style="text-align: right;">
              <div class="section-title">Pay Period</div>
              <div class="pay-period">${format(new Date(invoice.pay_period_start), 'MMMM d')} - ${format(new Date(invoice.pay_period_end), 'MMMM d, yyyy')}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Rate</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Base Salary (Pay Period)</td>
                <td style="text-align: center;">1</td>
                <td style="text-align: right;">₱${invoice.base_salary.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                <td style="text-align: right;">₱${invoice.base_salary.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
              </tr>
              ${invoice.deductions > 0 ? `
              <tr class="deduction">
                <td>Deductions${invoice.deduction_notes ? ` (${invoice.deduction_notes})` : ''}</td>
                <td style="text-align: center;">1</td>
                <td style="text-align: right;">-₱${invoice.deductions.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                <td style="text-align: right;">-₱${invoice.deductions.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
              </tr>
              ` : ''}
              ${invoice.absent_days > 0 ? `
              <tr class="deduction">
                <td>LWOP / Absent Deduction</td>
                <td style="text-align: center;">${invoice.absent_days} days</td>
                <td style="text-align: right;">-₱${(invoice.absent_deduction / invoice.absent_days).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                <td style="text-align: right;">-₱${invoice.absent_deduction.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
              </tr>
              ` : ''}
              ${(() => {
                const items = typeof invoice.additional_items === 'string' 
                  ? JSON.parse(invoice.additional_items || '[]') 
                  : (invoice.additional_items || []);
                return items.map((item: AdditionalItem) => `
                  <tr class="addition">
                    <td>${item.description}</td>
                    <td style="text-align: center;">${item.quantity}</td>
                    <td style="text-align: right;">₱${item.rate.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                    <td style="text-align: right;">+₱${item.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                  </tr>
                `).join('');
              })()}
            </tbody>
          </table>

          <div class="totals-section">
            <div class="totals-box">
              <div class="total-row">
                <span>Subtotal</span>
                <span>₱${invoice.base_salary.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              ${(invoice.deductions > 0 || invoice.absent_deduction > 0) ? `
              <div class="total-row deduction">
                <span>Total Deductions</span>
                <span>-₱${(invoice.deductions + invoice.absent_deduction).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              ` : ''}
              <div class="total-row final">
                <span>Balance Due</span>
                <span>₱${invoice.balance_due.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          ${invoice.notes ? `
          <div class="notes-section">
            <div class="notes-title">Notes</div>
            <div class="notes-content">${invoice.notes}</div>
          </div>
          ` : ''}

          <div class="footer">
            <div class="footer-text">Thank you for your hard work!</div>
            <div class="footer-company">Care Sync Support Solutions</div>
            <div class="footer-contact">For questions about this invoice, please contact HR</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive'; icon: React.ReactNode }> = {
      pending: { variant: 'secondary', icon: <Clock className="h-3 w-3 mr-1" /> },
      paid: { variant: 'default', icon: <CheckCircle className="h-3 w-3 mr-1" /> },
      cancelled: { variant: 'destructive', icon: <XCircle className="h-3 w-3 mr-1" /> },
    };
    const { variant, icon } = config[status] || { variant: 'secondary' as const, icon: null };
    return (
      <Badge variant={variant} className="capitalize flex items-center">
        {icon}
        {status}
      </Badge>
    );
  };

  const additionalItems = typeof invoice.additional_items === 'string' 
    ? JSON.parse(invoice.additional_items || '[]') 
    : (invoice.additional_items || []);

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
              <p className="font-semibold text-primary">Care Sync</p>
              <p className="text-sm text-muted-foreground">Support Solutions</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-primary">INVOICE</h2>
              <p className="text-muted-foreground">{invoice.invoice_number}</p>
              <p className="text-sm mt-2">
                Date: {format(new Date(invoice.invoice_date), 'MMMM d, yyyy')}
              </p>
              <div className="mt-2">
                {getStatusBadge(invoice.status)}
              </div>
            </div>
          </div>

          <Separator />

          {/* Bill To */}
          <div className="grid md:grid-cols-2 gap-6 bg-muted/30 p-4 rounded-lg">
            <div>
              <h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider mb-2">Bill To:</h3>
              <p className="font-medium text-lg">{invoice.profiles?.full_name}</p>
              <p className="text-muted-foreground">{invoice.profiles?.position || 'Employee'}</p>
            </div>
            <div className="text-right">
              <h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider mb-2">Pay Period:</h3>
              <p className="font-medium">
                {format(new Date(invoice.pay_period_start), 'MMMM d')} -{' '}
                {format(new Date(invoice.pay_period_end), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>

          {/* Invoice Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="py-3 px-4 text-left font-semibold text-sm rounded-tl-lg">Description</th>
                  <th className="py-3 px-4 text-center font-semibold text-sm">Qty</th>
                  <th className="py-3 px-4 text-right font-semibold text-sm">Rate</th>
                  <th className="py-3 px-4 text-right font-semibold text-sm rounded-tr-lg">Amount</th>
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
                {additionalItems.map((item: AdditionalItem, index: number) => (
                  <tr key={index} className="border-b text-green-600">
                    <td className="py-3 px-4">{item.description}</td>
                    <td className="py-3 px-4 text-center">{item.quantity}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(item.rate)}</td>
                    <td className="py-3 px-4 text-right">+{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="flex justify-end">
            <div className="w-72 bg-muted/30 rounded-lg p-4 space-y-2">
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
              <div className="flex justify-between py-3 text-xl font-bold border-t-2 border-primary mt-2">
                <span>Balance Due</span>
                <span className="text-primary">{formatCurrency(invoice.balance_due)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 p-4 rounded-r-lg">
              <h4 className="font-semibold mb-2 text-amber-800 dark:text-amber-200">Notes:</h4>
              <p className="text-amber-700 dark:text-amber-300 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground pt-6 border-t">
            <p className="font-medium">Thank you for your hard work!</p>
            <p className="mt-1 text-primary font-semibold">Care Sync Support Solutions</p>
            <p className="mt-2 text-xs">For questions about this invoice, please contact HR</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
