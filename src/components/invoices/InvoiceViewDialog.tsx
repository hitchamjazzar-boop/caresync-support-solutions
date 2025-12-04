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
        <td>${item.description}</td>
        <td class="text-center">${item.quantity}</td>
        <td class="text-right">₱${item.rate.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
        <td class="text-right">₱${item.total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoice_number} - Care Sync</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px 50px; 
              max-width: 800px; 
              margin: 0 auto; 
              background: #fff;
              color: #333;
              font-size: 13px;
            }
            
            /* Header */
            .invoice-title { 
              font-size: 36px; 
              font-weight: 900; 
              color: #000;
              text-decoration: underline;
              margin-bottom: 25px;
              letter-spacing: 2px;
            }
            
            /* Info Section */
            .info-section {
              display: flex;
              justify-content: space-between;
              margin-bottom: 25px;
            }
            .info-column { }
            .info-label {
              font-size: 12px;
              font-weight: 700;
              color: #c45c26;
              margin-bottom: 3px;
            }
            .info-value {
              font-size: 13px;
              color: #333;
              font-weight: 600;
            }
            .info-sub {
              font-size: 12px;
              color: #666;
            }
            .info-right .info-row {
              margin-bottom: 3px;
            }
            .info-right .info-label {
              display: inline;
            }
            .info-right .info-value {
              display: inline;
              font-weight: 500;
            }
            
            /* Table */
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 20px 0; 
            }
            th { 
              padding: 10px 12px; 
              text-align: left; 
              background: #c62828;
              color: white;
              font-weight: 600;
              font-size: 12px;
            }
            th:first-child { }
            th:last-child { }
            td { 
              padding: 12px; 
              border-bottom: 1px solid #e5e5e5; 
              font-size: 13px;
              color: #333;
            }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .deduction { color: #c62828; }
            
            /* Totals */
            .totals-section {
              display: flex;
              justify-content: space-between;
              margin-top: 30px;
            }
            .notes-box {
              flex: 1;
            }
            .notes-label {
              font-weight: 700;
              color: #333;
              margin-bottom: 5px;
            }
            .notes-content {
              font-size: 12px;
              color: #666;
              line-height: 1.5;
            }
            .totals-box {
              width: 280px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
              font-size: 13px;
            }
            .total-row .label {
              color: #666;
            }
            .total-row .value {
              color: #333;
              text-align: right;
            }
            .total-row.deduction .value {
              color: #c62828;
            }
            
            /* Balance Due */
            .balance-due-section {
              background: #8b1a1a;
              color: white;
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 15px 20px;
              margin-top: 20px;
            }
            .balance-label {
              font-size: 16px;
              font-weight: 700;
              letter-spacing: 1px;
            }
            .balance-amount {
              font-size: 24px;
              font-weight: 700;
              color: #ff6b6b;
            }
            
            /* Footer */
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e5e5;
            }
            .footer-text { font-size: 12px; color: #666; }
            .footer-company { 
              font-size: 13px; 
              font-weight: 600; 
              color: #8b1a1a;
              margin-top: 3px;
            }
            
            @media print {
              body { padding: 20px 30px; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-title">INVOICE</div>
          
          <div class="info-section">
            <div class="info-column">
              <div class="info-label">INVOICE FROM:</div>
              <div class="info-value">${invoice.profiles?.full_name || 'Employee'}</div>
              <div class="info-sub">${invoice.profiles?.position || 'Staff'}</div>
            </div>
            <div class="info-column">
              <div class="info-label">BILL TO:</div>
              <div class="info-value">CARE SYNC</div>
              <div class="info-sub">Support Solutions</div>
            </div>
            <div class="info-column info-right">
              <div class="info-row">
                <span class="info-label">NUMBER: </span>
                <span class="info-value">${invoice.invoice_number}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Date: </span>
                <span class="info-value">${format(new Date(invoice.invoice_date), 'MMM. d, yyyy')}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Status: </span>
                <span class="info-value" style="text-transform: uppercase;">${invoice.status}</span>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-center">Quantity</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Base Salary - Pay Period Service</strong><br/>
                  <span style="color: #666; font-size: 12px;">Period Service: ${format(new Date(invoice.pay_period_start), 'MMM. d')} to ${format(new Date(invoice.pay_period_end), 'MMM. d, yyyy')}</span>
                </td>
                <td class="text-center">1</td>
                <td class="text-right">₱${invoice.base_salary.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                <td class="text-right">₱${invoice.base_salary.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
              </tr>
              ${invoice.deductions > 0 ? `
              <tr>
                <td class="deduction">
                  <strong>Deductions</strong>
                  ${invoice.deduction_notes ? `<br/><span style="font-size: 12px;">${invoice.deduction_notes}</span>` : ''}
                </td>
                <td class="text-center">1</td>
                <td class="text-right deduction">-₱${invoice.deductions.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                <td class="text-right deduction">-₱${invoice.deductions.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
              </tr>
              ` : ''}
              ${invoice.absent_days > 0 ? `
              <tr>
                <td class="deduction">
                  <strong>LWOP / Absent Deduction</strong><br/>
                  <span style="font-size: 12px;">${invoice.absent_days} day(s) absent</span>
                </td>
                <td class="text-center">${invoice.absent_days}</td>
                <td class="text-right deduction">-₱${(invoice.absent_deduction / invoice.absent_days).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                <td class="text-right deduction">-₱${invoice.absent_deduction.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
              </tr>
              ` : ''}
              ${additionalItemsRows}
            </tbody>
          </table>

          <div class="totals-section">
            <div class="notes-box">
              ${invoice.notes ? `
                <div class="notes-label">Notes:</div>
                <div class="notes-content">${invoice.notes}</div>
              ` : ''}
            </div>
            <div class="totals-box">
              <div class="total-row">
                <span class="label">SUBTOTAL:</span>
                <span class="value">₱${invoice.base_salary.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div class="total-row deduction">
                <span class="label">DEDUCTION:</span>
                <span class="value">${(invoice.deductions + invoice.absent_deduction) > 0 ? `-₱${(invoice.deductions + invoice.absent_deduction).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : ''}</span>
              </div>
              <div class="total-row">
                <span class="label">TOTAL:</span>
                <span class="value">₱${invoice.balance_due.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div class="balance-due-section">
            <span class="balance-label">BALANCE DUE</span>
            <span class="balance-amount">₱${invoice.balance_due.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
          </div>

          <div class="footer">
            <div class="footer-text">Thank you for your hard work!</div>
            <div class="footer-company">Care Sync Support Solutions</div>
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
    const config: Record<string, { icon: React.ReactNode; className: string }> = {
      pending: { icon: <Clock className="h-3 w-3 mr-1" />, className: 'bg-orange-100 text-orange-600 border-orange-200' },
      paid: { icon: <CheckCircle className="h-3 w-3 mr-1" />, className: 'bg-green-100 text-green-600 border-green-200' },
      cancelled: { icon: <XCircle className="h-3 w-3 mr-1" />, className: 'bg-red-100 text-red-600 border-red-200' },
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
          <h2 className="text-3xl font-black underline tracking-wide">INVOICE</h2>

          {/* Info Section */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs font-bold text-orange-600">INVOICE FROM:</p>
              <p className="font-semibold">{invoice.profiles?.full_name}</p>
              <p className="text-sm text-muted-foreground">{invoice.profiles?.position || 'Employee'}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-orange-600">BILL TO:</p>
              <p className="font-semibold">CARE SYNC</p>
              <p className="text-sm text-muted-foreground">Support Solutions</p>
            </div>
            <div className="text-right space-y-1">
              <p>
                <span className="text-xs font-bold text-orange-600">NUMBER: </span>
                <span className="text-sm">{invoice.invoice_number}</span>
              </p>
              <p>
                <span className="text-xs font-bold text-orange-600">Date: </span>
                <span className="text-sm">{format(new Date(invoice.invoice_date), 'MMM. d, yyyy')}</span>
              </p>
              <div className="flex items-center justify-end gap-2">
                <span className="text-xs font-bold text-orange-600">Status: </span>
                {getStatusBadge(invoice.status)}
              </div>
            </div>
          </div>

          {/* Invoice Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-red-700 text-white">
                  <th className="py-2.5 px-3 text-left font-semibold text-sm">Description</th>
                  <th className="py-2.5 px-3 text-center font-semibold text-sm">Quantity</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-sm">Unit Price</th>
                  <th className="py-2.5 px-3 text-right font-semibold text-sm">Amount</th>
                </tr>
              </thead>
              <tbody>
                {/* Base Salary */}
                <tr className="border-b">
                  <td className="py-3 px-3">
                    <p className="font-medium">Base Salary - Pay Period Service</p>
                    <p className="text-xs text-muted-foreground">
                      Period Service: {format(new Date(invoice.pay_period_start), 'MMM. d')} to {format(new Date(invoice.pay_period_end), 'MMM. d, yyyy')}
                    </p>
                  </td>
                  <td className="py-3 px-3 text-center">1</td>
                  <td className="py-3 px-3 text-right">{formatCurrency(invoice.base_salary)}</td>
                  <td className="py-3 px-3 text-right">{formatCurrency(invoice.base_salary)}</td>
                </tr>

                {/* Deductions */}
                {invoice.deductions > 0 && (
                  <tr className="border-b">
                    <td className="py-3 px-3 text-red-700">
                      <p className="font-medium">Deductions</p>
                      {invoice.deduction_notes && (
                        <p className="text-xs">{invoice.deduction_notes}</p>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">1</td>
                    <td className="py-3 px-3 text-right text-red-700">-{formatCurrency(invoice.deductions)}</td>
                    <td className="py-3 px-3 text-right text-red-700">-{formatCurrency(invoice.deductions)}</td>
                  </tr>
                )}

                {/* Absent Deduction */}
                {invoice.absent_days > 0 && (
                  <tr className="border-b">
                    <td className="py-3 px-3 text-red-700">
                      <p className="font-medium">LWOP / Absent Deduction</p>
                      <p className="text-xs">{invoice.absent_days} day(s) absent</p>
                    </td>
                    <td className="py-3 px-3 text-center">{invoice.absent_days}</td>
                    <td className="py-3 px-3 text-right text-red-700">
                      -{formatCurrency(invoice.absent_deduction / invoice.absent_days)}
                    </td>
                    <td className="py-3 px-3 text-right text-red-700">-{formatCurrency(invoice.absent_deduction)}</td>
                  </tr>
                )}

                {/* Additional Items */}
                {additionalItems.map((item: AdditionalItem, index: number) => (
                  <tr key={index} className="border-b">
                    <td className="py-3 px-3 font-medium">{item.description}</td>
                    <td className="py-3 px-3 text-center">{item.quantity}</td>
                    <td className="py-3 px-3 text-right">{formatCurrency(item.rate)}</td>
                    <td className="py-3 px-3 text-right">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex justify-between gap-8">
            <div className="flex-1">
              {invoice.notes && (
                <>
                  <p className="font-bold text-sm">Notes:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
                </>
              )}
            </div>
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">SUBTOTAL:</span>
                <span>{formatCurrency(invoice.base_salary)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">DEDUCTION:</span>
                <span className="text-red-700">
                  {(invoice.deductions + invoice.absent_deduction) > 0 
                    ? `-${formatCurrency(invoice.deductions + invoice.absent_deduction)}` 
                    : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">TOTAL:</span>
                <span>{formatCurrency(invoice.balance_due)}</span>
              </div>
            </div>
          </div>

          {/* Balance Due */}
          <div className="bg-red-900 flex justify-between items-center px-5 py-4">
            <span className="font-bold tracking-wide text-white">BALANCE DUE</span>
            <span className="text-2xl font-bold text-red-300">{formatCurrency(invoice.balance_due)}</span>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground pt-4">
            <p>Thank you for your hard work!</p>
            <p className="font-semibold text-red-900">Care Sync Support Solutions</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
