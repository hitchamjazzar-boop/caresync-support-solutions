import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

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

  // Company Branding Header
  doc.setFillColor(139, 92, 246); // Primary color
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYSLIP', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Employee Compensation Statement', pageWidth / 2, 30, { align: 'center' });

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Company Information
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Company Name', 14, 55);
  doc.setFont('helvetica', 'normal');
  doc.text('123 Business Street', 14, 60);
  doc.text('City, State 12345', 14, 65);
  doc.text('contact@company.com', 14, 70);

  // Payslip Details Box
  doc.setDrawColor(139, 92, 246);
  doc.setLineWidth(0.5);
  doc.rect(pageWidth - 80, 50, 66, 25);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Payslip ID:', pageWidth - 75, 57);
  doc.text('Payment Date:', pageWidth - 75, 63);
  doc.text('Period:', pageWidth - 75, 69);
  
  doc.setFont('helvetica', 'normal');
  doc.text(payroll.id.slice(0, 8).toUpperCase(), pageWidth - 35, 57);
  doc.text(
    payroll.payment_date ? format(new Date(payroll.payment_date), 'MMM dd, yyyy') : 'Pending',
    pageWidth - 35,
    63
  );
  doc.text(
    `${format(new Date(payroll.period_start), 'MMM dd')} - ${format(new Date(payroll.period_end), 'MMM dd')}`,
    pageWidth - 35,
    69
  );

  // Employee Information
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Information', 14, 85);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  autoTable(doc, {
    startY: 90,
    head: [[]],
    body: [
      ['Employee Name', payroll.profiles?.full_name || 'N/A'],
      ['Position', payroll.profiles?.position || 'N/A'],
      ['Department', payroll.profiles?.department || 'N/A'],
      ['Email', payroll.profiles?.contact_email || 'N/A'],
    ],
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 'auto' },
    },
  });

  // Earnings & Deductions Table
  let finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Earnings & Deductions Breakdown', 14, finalY);

  const earningsData = [];
  
  if (payroll.hourly_rate) {
    earningsData.push(['Hourly Rate', `$${payroll.hourly_rate.toFixed(2)}`]);
    earningsData.push(['Total Hours Worked', `${payroll.total_hours.toFixed(2)} hrs`]);
  } else if (payroll.monthly_salary) {
    earningsData.push(['Monthly Salary', `$${payroll.monthly_salary.toFixed(2)}`]);
  }
  
  earningsData.push(['Gross Amount', `$${payroll.gross_amount.toFixed(2)}`]);
  
  if (payroll.allowances > 0) {
    earningsData.push(['Allowances', `+$${payroll.allowances.toFixed(2)}`]);
  }
  
  if (payroll.deductions > 0) {
    earningsData.push(['Deductions', `-$${payroll.deductions.toFixed(2)}`]);
  }

  autoTable(doc, {
    startY: finalY + 5,
    head: [['Description', 'Amount']],
    body: earningsData,
    theme: 'striped',
    headStyles: {
      fillColor: [139, 92, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 'auto', halign: 'right' },
    },
  });

  // Net Pay Box
  finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFillColor(240, 253, 244); // Light green background
  doc.rect(14, finalY, pageWidth - 28, 20, 'F');
  doc.setDrawColor(139, 92, 246);
  doc.setLineWidth(1);
  doc.rect(14, finalY, pageWidth - 28, 20);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('NET PAY', 20, finalY + 8);
  doc.setFontSize(18);
  doc.setTextColor(22, 163, 74); // Green color
  doc.text(`$${payroll.net_amount.toFixed(2)}`, pageWidth - 20, finalY + 12, { align: 'right' });
  
  doc.setTextColor(0, 0, 0);

  // YTD Totals Section
  finalY += 30;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Year-to-Date Totals (${year})`, 14, finalY);

  autoTable(doc, {
    startY: finalY + 5,
    head: [['Category', 'YTD Total']],
    body: [
      ['Total Hours Worked', `${ytdTotals.totalHours.toFixed(2)} hrs`],
      ['Total Gross Earnings', `$${ytdTotals.totalGross.toFixed(2)}`],
      ['Total Allowances', `$${ytdTotals.totalAllowances.toFixed(2)}`],
      ['Total Deductions', `$${ytdTotals.totalDeductions.toFixed(2)}`],
      ['Total Net Pay', `$${ytdTotals.totalNet.toFixed(2)}`],
    ],
    theme: 'striped',
    headStyles: {
      fillColor: [139, 92, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 120, fontStyle: 'bold' },
      1: { cellWidth: 'auto', halign: 'right' },
    },
  });

  // Footer
  finalY = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text(
    'This is a computer-generated payslip. No signature is required.',
    pageWidth / 2,
    finalY,
    { align: 'center' }
  );
  
  doc.text(
    'For questions regarding this payslip, please contact HR department.',
    pageWidth / 2,
    finalY + 5,
    { align: 'center' }
  );

  // Payment Schedule Note
  doc.setFontSize(8);
  doc.text(
    'Payment Schedule: 1st and 16th of each month (adjusted to Monday if falls on weekend)',
    pageWidth / 2,
    finalY + 12,
    { align: 'center' }
  );

  // Save the PDF
  const fileName = `Payslip_${payroll.profiles?.full_name.replace(/\s+/g, '_')}_${format(
    new Date(payroll.period_start),
    'yyyy-MM-dd'
  )}.pdf`;
  
  doc.save(fileName);
};
