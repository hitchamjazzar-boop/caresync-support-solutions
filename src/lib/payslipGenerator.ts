import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
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

const formatCurrency = (amount: number): string => {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const generatePayslipPDF = async (payroll: PayrollData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Company Branding Header - CareSync maroon color
  doc.setFillColor(128, 0, 32);
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
  doc.setDrawColor(128, 0, 32);
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
  doc.text('Employee Information', 14, 78);
  
  autoTable(doc, {
    startY: 82,
    head: [[]],
    body: [
      ['Employee Name', payroll.profiles?.full_name || 'N/A'],
      ['Position', payroll.profiles?.position || 'N/A'],
      ['Department', payroll.profiles?.department || 'N/A'],
      ['Email', payroll.profiles?.contact_email || 'N/A'],
    ],
    theme: 'plain',
    styles: { 
      fontSize: 9, 
      cellPadding: 2,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 130 },
    },
  });

  // Earnings & Deductions Table
  let finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Earnings & Deductions Breakdown', 14, finalY);

  const earningsData = [];
  
  // Add total hours worked
  earningsData.push(['Total Hours Worked', `${payroll.total_hours.toFixed(2)} hrs`]);
  
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
    startY: finalY + 4,
    head: [['Description', 'Amount']],
    body: earningsData,
    theme: 'striped',
    headStyles: {
      fillColor: [128, 0, 32],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
      cellPadding: 4,
    },
    styles: { 
      fontSize: 9.5, 
      cellPadding: 4,
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      overflow: 'linebreak',
    },
    columnStyles: {
      0: { cellWidth: 130 },
      1: { cellWidth: 52, halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  // Net Pay Box
  finalY = (doc as any).lastAutoTable.finalY + 12;
  
  doc.setFillColor(240, 253, 244);
  doc.rect(14, finalY, pageWidth - 28, 22, 'F');
  doc.setDrawColor(128, 0, 32);
  doc.setLineWidth(1);
  doc.rect(14, finalY, pageWidth - 28, 22);
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('NET PAY', 20, finalY + 14);
  
  doc.setFontSize(22);
  doc.setTextColor(22, 163, 74);
  doc.text(formatCurrency(payroll.net_amount), pageWidth - 20, finalY + 14, { align: 'right' });
  
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
