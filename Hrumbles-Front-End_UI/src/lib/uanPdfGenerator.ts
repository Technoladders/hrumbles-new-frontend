import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Candidate } from '@/components/MagicLinkView/types';

// Define a more specific type for the data we expect, matching the API response
interface FullHistoryEmploymentEntry {
  'Establishment Name': string;
  MemberId: string;
  Doj: string;
  DateOfExitEpf: string;
  uan: string;
}

interface FullHistoryData {
  msg: FullHistoryEmploymentEntry[] | string;
}

// Helper function to format the date
const formatDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

export const generateUanHistoryPdf = (candidate: Candidate, historyData: FullHistoryData) => {
  if (!Array.isArray(historyData.msg)) {
    console.error("PDF Generation failed: History data is not an array.");
    return;
  }

  // Initialize PDF document. 'l' for landscape is better for this wide table.
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // --- PDF Header ---
  const uan = historyData.msg[0]?.uan || 'N/A';
  const candidateName = candidate.name.toUpperCase();
  const generationDate = formatDate(new Date());

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`UAN :`, 14, 15);
  doc.text(`Date`, 260, 15);

  doc.setFont('helvetica', 'normal');
  doc.text(uan, 28, 15);
  doc.text(candidateName, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
  doc.text(generationDate, 270, 15);
  
  doc.line(14, 18, 283, 18); // Horizontal line

  // --- PDF Table ---
  const head = [
    [
      { content: 'Sn.', styles: { halign: 'center', valign: 'middle' } },
      { content: 'Member Id', styles: { halign: 'center', valign: 'middle' } },
      { content: 'Establishment Name', styles: { halign: 'center', valign: 'middle' } },
      { content: 'Establishment ID', styles: { halign: 'center', valign: 'middle' } },
      { content: 'DOJ', styles: { halign: 'center', valign: 'middle' } },
      { content: 'DOE', styles: { halign: 'center', valign: 'middle' } },
    ],
  ];

  const body = historyData.msg.map((entry, index) => {
    // Assumption: Establishment ID is the first 15 characters of the Member ID.
    const establishmentId = entry.MemberId ? entry.MemberId.substring(0, 15) : 'N/A';
    const doe = entry.DateOfExitEpf || 'NOT AVAILABLE';

    return [
      index + 1,
      entry.MemberId,
      entry['Establishment Name'],
      establishmentId,
      entry.Doj, // DOJ
      doe, // DOE
    ];
  });

  autoTable(doc, {
    head: head,
    body: body,
    startY: 22,
    theme: 'grid',
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
  });

  // --- Save the PDF ---
  doc.save(`UAN_History_${candidate.name.replace(/\s/g, '_')}.pdf`);
};