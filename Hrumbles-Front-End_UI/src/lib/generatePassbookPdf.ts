import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Candidate } from '@/components/MagicLinkView/types';

// Define types for passbook data
interface PassbookEntry {
  year: string;
  month: string;
  description: string;
  employee_share: string;
  employer_share: string;
  pension_share: string;
  status: string;
  date_of_approval: string;
}

interface Employer {
  establishment_name: string;
  member_id: string;
  service_period: string;
  date_of_joining: string;
  total_employee_share: number;
  total_employer_share: number;
  total_pension_share: number;
  passbook_entries: PassbookEntry[];
}

interface PassbookData {
  name?: string; // Make optional to handle undefined
  uan?: string;
  date_of_birth?: string;
  gender?: string;
  employers: Employer[];
}

interface PassbookResult {
  data?: {
    passbook_data?: PassbookData;
  };
}

// Helper function to format date
const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('default', { month: 'short' });
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

// Helper function to format currency
const formatCurrency = (amount: number | string): string => {
  let num: number;
  if (typeof amount === 'string') {
    const cleanedAmount = amount.replace(/[^0-9.-]/g, ''); // Remove all non-numeric characters except decimal
    num = parseFloat(cleanedAmount) || 0; // Default to 0 if parsing fails
  } else {
    num = amount || 0; // Default to 0 for undefined/null
  }
  console.log(`Formatting amount: "${amount}" -> parsed: ${num}`); // Debug log
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(num);
};

export const generatePassbookPdf = (candidate: Candidate, passbookResult: PassbookResult) => {
  const data = passbookResult.data;
  if (!data || !data.passbook_data) {
    console.error('PDF Generation failed: No passbook data in result.', passbookResult);
    return;
  }

  const passbook = data.passbook_data;
  if (!passbook.employers || passbook.employers.length === 0) {
    console.error('PDF Generation failed: No employers data.', passbook);
    return;
  }

  // Initialize PDF document in landscape
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // --- PDF Header ---
  const uan = passbook.uan || 'N/A';
  const candidateName = (passbook.name || candidate.name || 'N/A').toUpperCase();
  const generationDate = formatDate(new Date());

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`UAN:`, 14, 15);
  doc.text(`Date:`, 260, 15);

  doc.setFont('helvetica', 'normal');
  doc.text(uan, 28, 15);
  doc.text(candidateName, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
  doc.text(generationDate, 270, 15);

  doc.line(14, 18, 283, 18); // Horizontal line

  // --- Employer Summary Table ---
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Employer Summary', 14, 25);

  const employerHead = [
    [
      { content: 'Sn.', styles: { halign: 'center', valign: 'middle' } },
      { content: 'Establishment Name', styles: { halign: 'center', valign: 'middle' } },
      { content: 'Member ID', styles: { halign: 'center', valign: 'middle' } },
      { content: 'Service Period', styles: { halign: 'center', valign: 'middle' } },
      { content: 'DOJ', styles: { halign: 'center', valign: 'middle' } },
      { content: 'Employee Share', styles: { halign: 'center', valign: 'middle' } },
      { content: 'Employer Share', styles: { halign: 'center', valign: 'middle' } },
      { content: 'Pension Share', styles: { halign: 'center', valign: 'middle' } },
    ],
  ];

  const employerBody = passbook.employers.map((employer, index) => [
    index + 1,
    employer.establishment_name || 'N/A',
    employer.member_id || 'N/A',
    employer.service_period || 'N/A',
    employer.date_of_joining ? formatDate(employer.date_of_joining) : 'N/A',
    formatCurrency(employer.total_employee_share || 0),
    formatCurrency(employer.total_employer_share || 0),
    formatCurrency(employer.total_pension_share || 0),
  ]);

  autoTable(doc, {
    head: employerHead,
    body: employerBody,
    startY: 30,
    theme: 'grid',
    headStyles: {
      fillColor: [238, 242, 255], // Matches bg-indigo-50
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
  });

  // --- Passbook Entries Table ---
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Passbook Entries', 14, finalY);

  const entriesHead = [
    [
      { content: 'Sn.', styles: { halign: 'center', valign: 'middle' } },
      { content: 'Year', styles: { halign: 'center', valign: 'middle' } },
      { content: 'Month', styles: { halign: 'center', valign: 'middle' } },
      { content: 'Description', styles: { halign: 'center', valign: 'middle' } },
      { content: 'Employee Share', styles: { halign: 'center', valign: 'middle' } },
      { content: 'Employer Share', styles: { halign: 'center', valign: 'middle' } },
      { content: 'Pension Share', styles: { halign: 'center', valign: 'middle' } },
      { content: 'Status', styles: { halign: 'center', valign: 'middle' } },
      { content: 'Date of Approval', styles: { halign: 'center', valign: 'middle' } },
    ],
  ];

  const entriesBody = passbook.employers.flatMap((employer) =>
    employer.passbook_entries.map((entry: PassbookEntry, index: number) => [
      index + 1,
      entry.year,
      entry.month,
      entry.description,
      formatCurrency(entry.employee_share),
      formatCurrency(entry.employer_share),
      formatCurrency(entry.pension_share),
      entry.status,
      entry.date_of_approval ? formatDate(entry.date_of_approval) : 'N/A',
    ])
  );

  if (entriesBody.length === 0) {
    console.warn('No passbook entries found for PDF.');
    entriesBody.push(['-', '-', '-', 'No data', '-', '-', '-', '-', '-']);
  }

  autoTable(doc, {
    head: entriesHead,
    body: entriesBody,
    startY: finalY + 5,
    theme: 'grid',
    headStyles: {
      fillColor: [238, 242, 255], // Matches bg-indigo-50
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
  });

  // --- Save the PDF ---
  doc.save(`Passbook_${candidateName.replace(/\s/g, '_')}_${uan}.pdf`);
};