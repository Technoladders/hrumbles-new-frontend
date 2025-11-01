// src/lib/generateUanHistoryPdfGridlines.ts

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Candidate } from '@/lib/types';

const formatDate = (dateStr?: string): string => {
  if (!dateStr || dateStr === 'NA') return 'Present';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleString('default', { month: 'short' });
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

export const generateUanHistoryPdfGridlines = (candidate: Candidate, result: any, meta: { inputValue: string }) => {
  const history = result?.data?.employment_data;
  if (!Array.isArray(history) || history.length === 0) {
    console.error('PDF Generation failed: No history data from Gridlines.', result);
    return;
  }

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const uan = meta.inputValue || candidate.uan || 'N/A';
  const candidateName = (history[0]?.name || candidate.name || 'N/A').toUpperCase();
  const generationDate = formatDate(new Date().toISOString());

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
  doc.text('Employment History Verified', 14, 25);

  const tableHead = [
    [
      { content: 'Sn.', styles: { halign: 'center', valign: 'middle' } },
      { content: 'Establishment Name', styles: { halign: 'center', valign: 'middle' } },
      { content: 'Member ID', styles: { halign: 'center', valign: 'middle' } },
      { content: 'Date of Joining', styles: { halign: 'center', valign: 'middle' } },
      { content: 'Date of Exit', styles: { halign: 'center', valign: 'middle' } },
      { content: 'Guardian Name', styles: { halign: 'center', valign: 'middle' } },
    ],
  ];

  const tableBody = history.map((job, index) => [
    index + 1,
    job.establishment_name || 'N/A',
    job.member_id || 'N/A',
    formatDate(job.date_of_joining),
    formatDate(job.date_of_exit),
    job.guardian_name || 'N/A',
  ]);

  autoTable(doc, {
    head: tableHead,
    body: tableBody,
    startY: 30,
    theme: 'grid',
    headStyles: { fillColor: [238, 242, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  doc.save(`UAN_History_Gridlines_${candidateName.replace(/\s/g, '_')}_${uan}.pdf`);
};