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
import { Printer, CheckCircle, Clock, XCircle } from 'lucide-react';
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
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const additionalItemsData = typeof invoice.additional_items === 'string' 
      ? JSON.parse(invoice.additional_items || '[]') 
      : (invoice.additional_items || []);

    const additionalItemsRows = additionalItemsData.map((item: AdditionalItem) => `
      <tr>
        <td class="addition">${item.description}</td>
        <td class="text-center">${item.quantity}</td>
        <td class="text-right addition">₱${item.rate.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
        <td class="text-right addition">+₱${item.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    const additionalItemsTotal = additionalItemsData.reduce((sum: number, item: AdditionalItem) => sum + item.total, 0);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoice_number} - Care Sync</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              padding: 40px 50px; 
              max-width: 800px; 
              margin: 0 auto; 
              background: #fff;
              color: #333;
              font-size: 14px;
            }
            
            /* Header */
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-start; 
              margin-bottom: 40px;
            }
            .logo-section { }
            .logo { height: 45px; margin-bottom: 8px; }
            .company-name { 
              font-size: 22px; 
              font-weight: 700; 
              color: #2563eb;
            }
            .company-tagline { 
              font-size: 12px; 
              color: #666; 
              margin-top: 2px;
            }
            .invoice-header { text-align: right; }
            .invoice-title { 
              font-size: 32px; 
              font-weight: 700; 
              color: #2563eb;
              letter-spacing: 2px;
            }
            .invoice-number { 
              font-size: 13px; 
              color: #666; 
              margin-top: 5px;
            }
            .invoice-date { 
              font-size: 13px; 
              margin-top: 8px;
              color: #444;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              margin-top: 10px;
              letter-spacing: 0.5px;
            }
            .status-pending { background: #fff7ed; color: #ea580c; border: 1px solid #fdba74; }
            .status-paid { background: #f0fdf4; color: #16a34a; border: 1px solid #86efac; }
            .status-cancelled { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; }
            
            /* Bill Section */
            .bill-section { 
              display: flex; 
              justify-content: space-between; 
              margin: 30px 0;
              padding: 20px 0;
              border-top: 1px solid #e5e7eb;
              border-bottom: 1px solid #e5e7eb;
            }
            .section-title { 
              font-size: 10px; 
              font-weight: 600; 
              color: #9ca3af; 
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 8px;
            }
            .employee-name { 
              font-size: 18px; 
              font-weight: 600; 
              color: #1f2937; 
            }
            .employee-position { 
              font-size: 13px; 
              color: #2563eb; 
              margin-top: 2px;
            }
            .pay-period { 
              font-size: 14px; 
              font-weight: 500;
              color: #374151;
            }
            
            /* Table */
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 20px 0; 
            }
            th { 
              padding: 12px 8px; 
              text-align: left; 
              font-weight: 600;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #6b7280;
              border-bottom: 2px solid #e5e7eb;
            }
            td { 
              padding: 14px 8px; 
              border-bottom: 1px solid #f3f4f6; 
              font-size: 13px;
              color: #374151;
            }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .deduction { color: #dc2626; }
            .addition { color: #16a34a; }
            
            /* Totals */
            .totals-section {
              display: flex;
              justify-content: flex-end;
              margin-top: 20px;
            }
            .totals-box {
              width: 250px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              font-size: 13px;
              color: #6b7280;
            }
            .total-row span:last-child {
              color: #374151;
              font-weight: 500;
            }
            .total-row.deduction span:last-child {
              color: #dc2626;
            }
            .total-row.final {
              border-top: 1px solid #e5e7eb;
              margin-top: 8px;
              padding-top: 12px;
            }
            .balance-label {
              font-size: 14px;
              color: #2563eb;
              font-weight: 600;
            }
            .balance-amount {
              font-size: 18px;
              font-weight: 700;
              color: #2563eb;
            }
            
            /* Notes */
            .notes-section {
              background: #fffbeb;
              border-left: 3px solid #f59e0b;
              padding: 12px 16px;
              margin-top: 25px;
              font-size: 12px;
            }
            .notes-title { 
              font-weight: 600; 
              color: #92400e;
              margin-bottom: 4px;
            }
            .notes-content { color: #78350f; line-height: 1.5; }
            
            /* Footer */
            .footer {
              text-align: center;
              margin-top: 50px;
              padding-top: 25px;
              border-top: 1px solid #e5e7eb;
            }
            .footer-text { font-size: 13px; color: #6b7280; }
            .footer-company { 
              font-size: 14px; 
              font-weight: 600; 
              color: #2563eb;
              margin-top: 4px;
            }
            .footer-contact {
              font-size: 11px;
              color: #9ca3af;
              margin-top: 8px;
            }
            
            @media print {
              body { padding: 20px 30px; }
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
              <div class="status-badge status-${invoice.status}">${invoice.status.toUpperCase()}</div>
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
                <th class="text-center">Qty</th>
                <th class="text-right">Rate</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Base Salary (Pay Period)</td>
                <td class="text-center">1</td>
                <td class="text-right">₱${invoice.base_salary.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                <td class="text-right">₱${invoice.base_salary.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
              </tr>
              ${invoice.deductions > 0 ? `
              <tr>
                <td class="deduction">Deductions${invoice.deduction_notes ? ` (${invoice.deduction_notes})` : ''}</td>
                <td class="text-center">1</td>
                <td class="text-right deduction">-₱${invoice.deductions.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                <td class="text-right deduction">-₱${invoice.deductions.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
              </tr>
              ` : ''}
              ${invoice.absent_days > 0 ? `
              <tr>
                <td class="deduction">LWOP / Absent Deduction</td>
                <td class="text-center">${invoice.absent_days} days</td>
                <td class="text-right deduction">-₱${(invoice.absent_deduction / invoice.absent_days).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                <td class="text-right deduction">-₱${invoice.absent_deduction.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
              </tr>
              ` : ''}
              ${additionalItemsRows}
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
              ${additionalItemsTotal > 0 ? `
              <div class="total-row">
                <span>Additions</span>
                <span style="color: #16a34a;">+₱${additionalItemsTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              ` : ''}
              <div class="total-row final">
                <span class="balance-label">Balance Due</span>
                <span class="balance-amount">₱${invoice.balance_due.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
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
    const config: Record<string, { variant: 'default' | 'secondary' | 'destructive'; icon: React.ReactNode; className: string }> = {
      pending: { variant: 'secondary', icon: <Clock className="h-3 w-3 mr-1" />, className: 'bg-orange-100 text-orange-600 border-orange-200' },
      paid: { variant: 'default', icon: <CheckCircle className="h-3 w-3 mr-1" />, className: 'bg-green-100 text-green-600 border-green-200' },
      cancelled: { variant: 'destructive', icon: <XCircle className="h-3 w-3 mr-1" />, className: 'bg-red-100 text-red-600 border-red-200' },
    };
    const { icon, className } = config[status] || { icon: null, className: '' };
    return (
      <Badge variant="outline" className={`capitalize flex items-center ${className}`}>
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
              <h2 className="text-2xl font-bold text-primary tracking-wide">INVOICE</h2>
              <p className="text-muted-foreground text-sm">{invoice.invoice_number}</p>
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
          <div className="grid md:grid-cols-2 gap-6 py-4 border-y">
            <div>
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Bill To</h3>
              <p className="font-semibold text-lg">{invoice.profiles?.full_name}</p>
              <p className="text-primary text-sm">{invoice.profiles?.position || 'Employee'}</p>
            </div>
            <div className="text-right">
              <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pay Period</h3>
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
                <tr className="border-b-2">
                  <th className="py-3 px-2 text-left font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Description</th>
                  <th className="py-3 px-2 text-center font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Qty</th>
                  <th className="py-3 px-2 text-right font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Rate</th>
                  <th className="py-3 px-2 text-right font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody>
                {/* Base Salary */}
                <tr className="border-b">
                  <td className="py-3 px-2 text-sm">Base Salary (Pay Period)</td>
                  <td className="py-3 px-2 text-center text-sm">1</td>
                  <td className="py-3 px-2 text-right text-sm">{formatCurrency(invoice.base_salary)}</td>
                  <td className="py-3 px-2 text-right text-sm">{formatCurrency(invoice.base_salary)}</td>
                </tr>

                {/* Deductions */}
                {invoice.deductions > 0 && (
                  <tr className="border-b">
                    <td className="py-3 px-2 text-sm text-red-600">
                      Deductions
                      {invoice.deduction_notes && (
                        <span className="block text-xs text-muted-foreground">
                          ({invoice.deduction_notes})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center text-sm">1</td>
                    <td className="py-3 px-2 text-right text-sm text-red-600">-{formatCurrency(invoice.deductions)}</td>
                    <td className="py-3 px-2 text-right text-sm text-red-600">-{formatCurrency(invoice.deductions)}</td>
                  </tr>
                )}

                {/* Absent Deduction */}
                {invoice.absent_days > 0 && (
                  <tr className="border-b">
                    <td className="py-3 px-2 text-sm text-red-600">LWOP / Absent Deduction</td>
                    <td className="py-3 px-2 text-center text-sm">{invoice.absent_days} days</td>
                    <td className="py-3 px-2 text-right text-sm text-red-600">
                      -{formatCurrency(invoice.absent_deduction / invoice.absent_days)}
                    </td>
                    <td className="py-3 px-2 text-right text-sm text-red-600">-{formatCurrency(invoice.absent_deduction)}</td>
                  </tr>
                )}

                {/* Additional Items */}
                {additionalItems.map((item: AdditionalItem, index: number) => (
                  <tr key={index} className="border-b">
                    <td className="py-3 px-2 text-sm text-green-600">{item.description}</td>
                    <td className="py-3 px-2 text-center text-sm">{item.quantity}</td>
                    <td className="py-3 px-2 text-right text-sm text-green-600">{formatCurrency(item.rate)}</td>
                    <td className="py-3 px-2 text-right text-sm text-green-600">+{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between py-2 text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(invoice.base_salary)}</span>
              </div>
              {(invoice.deductions > 0 || invoice.absent_deduction > 0) && (
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-muted-foreground">Total Deductions</span>
                  <span className="text-red-600">-{formatCurrency(invoice.deductions + invoice.absent_deduction)}</span>
                </div>
              )}
              <div className="flex justify-between py-3 border-t mt-2">
                <span className="text-primary font-semibold">Balance Due</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(invoice.balance_due)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border-l-3 border-amber-500 p-4">
              <h4 className="font-semibold mb-1 text-amber-800 dark:text-amber-200 text-sm">Notes:</h4>
              <p className="text-amber-700 dark:text-amber-300 text-sm whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground pt-6 border-t">
            <p>Thank you for your hard work!</p>
            <p className="mt-1 text-primary font-semibold">Care Sync Support Solutions</p>
            <p className="mt-2 text-xs">For questions about this invoice, please contact HR</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
