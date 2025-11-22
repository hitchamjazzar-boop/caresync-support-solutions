import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

interface CertificateGeneratorProps {
  employeeName: string;
  employeePosition: string;
  employeePhoto: string | null;
}

export const CertificateGenerator = ({ 
  employeeName, 
  employeePosition,
  employeePhoto 
}: CertificateGeneratorProps) => {
  
  const generateCertificate = async () => {
    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Background
      pdf.setFillColor(252, 252, 253);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Decorative border
      pdf.setDrawColor(147, 51, 234); // primary color
      pdf.setLineWidth(2);
      pdf.rect(10, 10, pageWidth - 20, pageHeight - 20);
      
      pdf.setLineWidth(0.5);
      pdf.rect(12, 12, pageWidth - 24, pageHeight - 24);

      // Header
      pdf.setFontSize(36);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(147, 51, 234);
      pdf.text('CERTIFICATE OF EXCELLENCE', pageWidth / 2, 35, { align: 'center' });

      // Subtitle
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text('Employee of the Month', pageWidth / 2, 50, { align: 'center' });

      // Add employee photo if available
      if (employeePhoto) {
        try {
          // Load image as base64
          const img = await loadImage(employeePhoto);
          const imgSize = 40;
          pdf.addImage(img, 'JPEG', (pageWidth - imgSize) / 2, 60, imgSize, imgSize);
        } catch (error) {
          console.error('Error loading image:', error);
        }
      }

      // Employee details
      const detailsY = employeePhoto ? 115 : 75;
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(80, 80, 80);
      pdf.text('This certificate is proudly presented to', pageWidth / 2, detailsY, { align: 'center' });

      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(employeeName, pageWidth / 2, detailsY + 15, { align: 'center' });

      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(100, 100, 100);
      pdf.text(employeePosition, pageWidth / 2, detailsY + 25, { align: 'center' });

      // Recognition text
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(80, 80, 80);
      const recognitionText = 'In recognition of outstanding performance, dedication, and contribution';
      pdf.text(recognitionText, pageWidth / 2, detailsY + 40, { align: 'center' });
      pdf.text('to the success of our organization', pageWidth / 2, detailsY + 47, { align: 'center' });

      // Date
      const currentDate = new Date().toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(currentDate, pageWidth / 2, detailsY + 62, { align: 'center' });

      // Signature line
      const signatureY = pageHeight - 35;
      pdf.setLineWidth(0.5);
      pdf.setDrawColor(150, 150, 150);
      pdf.line(pageWidth / 2 - 40, signatureY, pageWidth / 2 + 40, signatureY);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text('Authorized Signature', pageWidth / 2, signatureY + 5, { align: 'center' });

      // Save the PDF
      pdf.save(`${employeeName.replace(/\s+/g, '_')}_Employee_of_the_Month_Certificate.pdf`);
      toast.success('Certificate downloaded successfully!');
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast.error('Failed to generate certificate');
    }
  };

  const loadImage = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg'));
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  return (
    <Button onClick={generateCertificate} variant="outline">
      <Download className="mr-2 h-4 w-4" />
      Download Certificate
    </Button>
  );
};
