import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Candidate } from '@/components/MagicLinkView/types';

interface Job {
  'Establishment Name': string;
  Doj: string;
  DateOfExitEpf: string;
  MemberId: string;
  'father or Husband Name': string;
  name?: string;
  uan?: string;
}

interface UanHistoryResult {
  msg: Job[];
}

const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('default', { month: 'short' });
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

export const generateUanHistoryPdf = (candidate: Candidate, result: UanHistoryResult) => {
  const history = result.msg;
  if (!Array.isArray(history) || history.length === 0) {
    console.error('PDF Generation failed: No history data.', result);
    return;
  }

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const uan = history[0]?.uan || candidate.uan || 'N/A';
  const candidateName = (history[0]?.name || candidate.name || 'N/A').toUpperCase();
  const fatherName = history[0]?.['father or Husband Name'] || 'N/A';
  const generationDate = formatDate(new Date());

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`UAN:`, 14, 15);
  doc.text(`Date:`, 260, 15);

  doc.setFont('helvetica', 'normal');
  doc.text(uan, 28, 15);
  doc.text(candidateName, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
  doc.text(generationDate, 270, 15);

  doc.line(14, 18, 283, 18);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Employment History', 14, 25);

  const tableHead = [
    [
      { content: 'Sn.', styles: { halign: 'center', valign: 'middle' } },
      { content: 'Establishment Name', styles: { halign: 'center', valign: 'middle' } },
      { content: 'Member ID', styles: { halign: 'center', valign: 'middle' } },
      { content: 'Date of Joining', styles: { halign: 'center', valign: 'middle' } },
      { content: 'Date of Exit', styles: { halign: 'center', valign: 'middle' } },
      { content: 'Father/Husband Name', styles: { halign: 'center', valign: 'middle' } },
    ],
  ];

  const tableBody = history.map((job, index) => [
    index + 1,
    job['Establishment Name'] || 'N/A',
    job.MemberId || 'N/A',
    job.Doj ? formatDate(job.Doj) : 'N/A',
    job.DateOfExitEpf === 'NA' ? 'Present' : job.DateOfExitEpf ? formatDate(job.DateOfExitEpf) : 'N/A',
    job['father or Husband Name'] || 'N/A',
  ]);

  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    startY: 30,
    theme: 'grid',
    headStyles: { fillColor: [238, 242, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  doc.save(`UAN_History_${candidateName.replace(/\s/g, '_')}_${uan}.pdf`);
};