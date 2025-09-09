// src/lib/generateComprehensiveReport.ts

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Candidate } from '@/components/MagicLinkView/types';
import { BGVState } from '@/hooks/bg-verification/useBgvVerifications';
import { toast } from 'sonner';

// Helper function to format date
const formatDate = (date: Date | string): string => {
    if (!date || date === 'NA') return 'N/A';
    try {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = d.toLocaleString('default', { month: 'short' });
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    } catch (e) {
        return 'N/A';
    }
};

const addHeader = (doc: jsPDF, candidateName: string, uan: string) => {
  const generationDate = formatDate(new Date());
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`UAN:`, 14, 15);
  doc.text(`Date:`, 260, 15);
  doc.setFont('helvetica', 'normal');
  doc.text(uan, 28, 15);
  doc.text(candidateName.toUpperCase(), doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
  doc.text(generationDate, 270, 15);
  doc.line(14, 18, 283, 18);
  return 25; // Return start Y position for content
};

const addHistorySection = (doc: jsPDF, startY: number, historyData: any) => {
    const history = historyData.msg;
    if (!Array.isArray(history) || history.length === 0) return startY;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Employment History', 14, startY);

    const head = [['Sn.', 'Establishment Name', 'Member ID', 'Date of Joining', 'Date of Exit']];
    const body = history.map((job: any, i: number) => [
        i + 1,
        job['Establishment Name'] || 'N/A',
        job.MemberId || 'N/A',
        formatDate(job.Doj),
        formatDate(job.DateOfExitEpf),
    ]);

    autoTable(doc, { head, body, startY: startY + 5, theme: 'grid' });
    return (doc as any).lastAutoTable.finalY + 10;
};

const addPassbookSection = (doc: jsPDF, startY: number, passbookData: any) => {
    const passbook = passbookData.data?.passbook_data;
    if (!passbook || !passbook.employers || passbook.employers.length === 0) return startY;

    doc.addPage();
    let currentY = addHeader(doc, passbook.name || 'N/A', passbook.uan || 'N/A');

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('EPFO Passbook Summary', 14, currentY);

    const head = [['Establishment', 'Member ID', 'DOJ', 'Employee Share', 'Employer Share', 'Pension Share']];
    const body = passbook.employers.map((emp: any) => [
        emp.establishment_name || 'N/A',
        emp.member_id || 'N/A',
        formatDate(emp.date_of_joining),
        `₹ ${emp.total_employee_share || 0}`,
        `₹ ${emp.total_employer_share || 0}`,
        `₹ ${emp.total_pension_share || 0}`,
    ]);

    autoTable(doc, { head, body, startY: currentY + 5, theme: 'grid' });
    return (doc as any).lastAutoTable.finalY + 10;
};


export const generateComprehensiveReport = (candidate: Candidate, results: BGVState['results']) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const historyResult = results['uan_full_history']?.data;
    const passbookResult = results['latest_passbook_mobile']?.data;
    
    if (!historyResult && !passbookResult) {
        toast.error("No reportable data found", { description: "Complete a UAN History or Passbook verification to generate a report." });
        return;
    }

    const primaryUan = historyResult?.msg?.[0]?.uan || passbookResult?.data?.passbook_data?.uan || candidate.uan || 'N/A';
    const candidateName = historyResult?.msg?.[0]?.name || passbookResult?.data?.passbook_data?.name || candidate.name;
    let currentY = addHeader(doc, candidateName, primaryUan);

    if (historyResult) {
        currentY = addHistorySection(doc, currentY, historyResult);
    }

    if (passbookResult) {
        currentY = addPassbookSection(doc, currentY, passbookResult);
    }
    
    doc.save(`Comprehensive_BGV_Report_${candidateName.replace(/\s/g, '_')}.pdf`);
    toast.success("Comprehensive report downloaded successfully!");
};