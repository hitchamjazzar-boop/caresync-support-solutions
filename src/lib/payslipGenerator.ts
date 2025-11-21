import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import logoImage from '@/assets/logo.png';

interface PayrollData {
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
  hourly_rate: number | null;
  monthly_salary: number | null;
  profiles: {
    full_name: string;
    position: string;
    department: string | null;
    contact_email: string | null;
  } | null;
}

interface YTDTotals {
  totalGross: number;
  totalDeductions: number;
  totalAllowances: number;
  totalNet: number;
  totalHours: number;
}

const formatCurrency = (amount: number): string => {
  return `PHP ${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fetchYTDTotals = async (userId: string, currentYear: number): Promise<YTDTotals> => {
  const { data, error } = await supabase
    .from('payroll')
    .select('gross_amount, deductions, allowances, net_amount, total_hours')
    .eq('user_id', userId)
    .gte('period_start', `${currentYear}-01-01`)
    .lte('period_end', `${currentYear}-12-31`);

  if (error) {
    console.error('Error fetching YTD totals:', error);
    return { totalGross: 0, totalDeductions: 0, totalAllowances: 0, totalNet: 0, totalHours: 0 };
  }

  const totals = data.reduce(
    (acc, record) => ({
      totalGross: acc.totalGross + Number(record.gross_amount),
      totalDeductions: acc.totalDeductions + Number(record.deductions),
      totalAllowances: acc.totalAllowances + Number(record.allowances),
      totalNet: acc.totalNet + Number(record.net_amount),
      totalHours: acc.totalHours + Number(record.total_hours),
    }),
    { totalGross: 0, totalDeductions: 0, totalAllowances: 0, totalNet: 0, totalHours: 0 }
  );

  return totals;
};

export const generatePayslipPDF = async (payroll: PayrollData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const year = new Date(payroll.period_start).getFullYear();

  // Fetch YTD totals
  const ytdTotals = await fetchYTDTotals(payroll.user_id, year);

  // Company Branding Header - CareSync maroon color
  doc.setFillColor(128, 0, 32); // CareSync maroon color
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Add CareSync Logo
  try {
    doc.addImage(logoImage, 'PNG', 14, 6, 28, 28);
  } catch (error) {
    console.error('Error adding logo:', error);
  }
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYSLIP', pageWidth / 2, 22, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Employee Compensation Statement', pageWidth / 2, 32, { align: 'center' });

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Company Information
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('CareSync Support Solutions', 14, 52);
  doc.setFont('helvetica', 'normal');
  doc.text('support@caresyncsupportsolutions.com', 14, 57);
  doc.text('Australia Wide', 14, 62);

  // Payslip Details Box
  doc.setDrawColor(128, 0, 32); // CareSync maroon
  doc.setLineWidth(0.5);
  doc.rect(pageWidth - 80, 48, 66, 20);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Payslip ID:', pageWidth - 75, 54);
  doc.text('Payment Date:', pageWidth - 75, 59);
  doc.text('Period:', pageWidth - 75, 64);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(payroll.id.slice(0, 8).toUpperCase(), pageWidth - 35, 54);
  doc.text(
    payroll.payment_date ? format(new Date(payroll.payment_date), 'MMM dd, yyyy') : 'Pending',
    pageWidth - 35,
    59
  );
  doc.text(
    `${format(new Date(payroll.period_start), 'MMM dd')} - ${format(new Date(payroll.period_end), 'MMM dd')}`,
    pageWidth - 35,
    64
  );

  // Employee Information
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Information', 14, 80);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  autoTable(doc, {
    startY: 84,
    head: [[]],
    body: [
      ['Employee Name', payroll.profiles?.full_name || 'N/A'],
      ['Position', payroll.profiles?.position || 'N/A'],
      ['Department', payroll.profiles?.department || 'N/A'],
      ['Email', payroll.profiles?.contact_email || 'N/A'],
    ],
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45 },
      1: { cellWidth: 'auto' },
    },
  });

  // Earnings & Deductions Table
  let finalY = (doc as any).lastAutoTable.finalY + 8;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Earnings & Deductions Breakdown', 14, finalY);

  const earningsData = [];
  
  // Add total hours at the top
  earningsData.push(['Total Hours Worked', `${payroll.total_hours.toLocaleString('en-PH', { minimumFractionDigits: 2 })} hrs`]);
  
  if (payroll.hourly_rate) {
    earningsData.push(['Hourly Rate', formatCurrency(payroll.hourly_rate)]);
  } else if (payroll.monthly_salary) {
    earningsData.push(['Payroll Period Salary', formatCurrency(payroll.monthly_salary)]);
  }
  
  earningsData.push(['Gross Amount', formatCurrency(payroll.gross_amount)]);
  
  if (payroll.allowances > 0) {
    earningsData.push(['Allowances', `+${formatCurrency(payroll.allowances)}`]);
  }
  
  if (payroll.deductions > 0) {
    earningsData.push(['Deductions', `-${formatCurrency(payroll.deductions)}`]);
  }

  autoTable(doc, {
    startY: finalY + 3,
    head: [['Description', 'Amount']],
    body: earningsData,
    theme: 'striped',
    headStyles: {
      fillColor: [128, 0, 32], // CareSync maroon
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 'auto', halign: 'right' },
    },
  });

  // Net Pay Box
  finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFillColor(240, 253, 244); // Light green background
  doc.rect(14, finalY, pageWidth - 28, 20, 'F');
  doc.setDrawColor(128, 0, 32); // CareSync maroon
  doc.setLineWidth(0.8);
  doc.rect(14, finalY, pageWidth - 28, 20);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('NET PAY', 20, finalY + 8);
  doc.setFontSize(18);
  doc.setTextColor(22, 163, 74); // Green color
  doc.text(formatCurrency(payroll.net_amount), pageWidth - 20, finalY + 13, { align: 'right' });
  
  doc.setTextColor(0, 0, 0);

  // Footer
  finalY += 35;
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text(
    'This is a computer-generated payslip and does not require a physical signature.',
    pageWidth / 2,
    finalY,
    { align: 'center' }
  );
  
  doc.text(
    'For any questions or concerns regarding this payslip, please contact the HR department.',
    pageWidth / 2,
    finalY + 4,
    { align: 'center' }
  );

  // Payment Schedule Note
  doc.setFontSize(7);
  doc.text(
    'Payment Schedule: 1st and 16th of each month (adjusted to the following Monday if falls on weekend)',
    pageWidth / 2,
    finalY + 10,
    { align: 'center' }
  );

  // Save the PDF
  const fileName = `Payslip_${payroll.profiles?.full_name.replace(/\s+/g, '_')}_${format(
    new Date(payroll.period_start),
    'yyyy-MM-dd'
  )}.pdf`;
  
  doc.save(fileName);
};
