/**
 * downloadInvoicePDF
 * Fetches invoice + biller data and generates a PDF using jsPDF.
 * Can be called from anywhere (action buttons, preview panel, etc.)
 * without needing a rendered DOM element.
 */

import jsPDF from 'jspdf';
import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';

const CURRENCY_SYMBOLS: Record<string, string> = { INR: '₹', USD: '$', GBP: '£', EUR: '€' };

const fmt = (amount: number | string, currency = 'INR') => {
  const n = Number(amount) || 0;
  const sym = CURRENCY_SYMBOLS[currency] || '₹';
  return `${sym}${n.toLocaleString('en-IN')}`;
};

const truncate = (str: string, max: number) => (str?.length > max ? str.slice(0, max - 2) + '..' : str || '');

export const downloadInvoicePDF = async (invoiceId: string): Promise<void> => {
  // ── Fetch invoice ──────────────────────────────────────────────────────────
  const { data: inv, error } = await supabase.from('hr_invoices').select('*').eq('id', invoiceId).single();
  if (error || !inv) throw new Error('Invoice not found');

  let items: any[] = [];
  try { items = typeof inv.items === 'string' ? JSON.parse(inv.items) : (inv.items || []); } catch { items = []; }
  items = items.map((i: any) => ({ ...i, tax_percentage: i.tax_percentage ?? 18 }));

  // ── Fetch biller ───────────────────────────────────────────────────────────
  let biller: any = null;
  if (inv.organization_id) {
    const [{ data: prof }, { data: org }] = await Promise.all([
      supabase.from('hr_organization_profile').select('*').eq('organization_id', inv.organization_id).single(),
      supabase.from('hr_organizations').select('name').eq('id', inv.organization_id).single(),
    ]);
    biller = { ...prof, org_name: org?.name };
  }

  // ── Customer info from snapshot ────────────────────────────────────────────
  const cd = inv.client_details || { name: inv.client_name, currency: inv.currency || 'INR' };
  const currency = cd.currency || inv.currency || 'INR';

  // ── Summary ────────────────────────────────────────────────────────────────
  const subtotal = items.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
  const totalTax = items.reduce((s: number, i: any) => s + Number(i.tax_value || 0), 0);
  const tds = Number(inv.tds_amount || 0); const tcs = Number(inv.tcs_amount || 0);
  const adjustment = tds > 0 ? -tds : tcs > 0 ? tcs : 0;
  const grandTotal = subtotal + totalTax + adjustment;
  const taxApplicable = inv.tax_applicable ?? true;
  const taxMode = inv.tax_mode || 'GST';

  // ── Tax breakdown ──────────────────────────────────────────────────────────
  const taxBreakdown: Record<string, number> = taxApplicable
    ? items.reduce((acc: any, i: any) => { const r = i.tax_percentage ?? 18; acc[r] = (acc[r] || 0) + Number(i.tax_value || 0); return acc; }, {})
    : {};

  // ── PDF Setup ──────────────────────────────────────────────────────────────
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW = 210, margin = 14;
  const CW = PW - margin * 2;
  let y = margin;

  const purple: [number, number, number] = [109, 40, 217];
  const gray: [number, number, number] = [100, 100, 100];
  const dark: [number, number, number] = [30, 30, 30];
  const lightGray: [number, number, number] = [245, 245, 248];
  const white: [number, number, number] = [255, 255, 255];

  const setFont = (size: number, style: 'normal' | 'bold' = 'normal', color: [number, number, number] = dark) => {
    doc.setFontSize(size); doc.setFont('helvetica', style); doc.setTextColor(...color);
  };

  // ── Accent bar ─────────────────────────────────────────────────────────────
  doc.setFillColor(...purple);
  doc.rect(0, 0, PW, 4, 'F');

  y = 12;

  // ── HEADER: Logo placeholder + Company name ────────────────────────────────
  const billerName = biller?.company_name || biller?.org_name || 'Your Company';
  setFont(16, 'bold', purple);
  doc.text(billerName, margin, y);
  y += 6;

  const billerAddress = [biller?.address_line1, biller?.address_line2, biller?.city, biller?.state, biller?.zip_code, biller?.country].filter(Boolean).join(', ');
  if (billerAddress) { setFont(8, 'normal', gray); doc.text(truncate(billerAddress, 80), margin, y); y += 4; }
  if (biller?.tax_id) { setFont(8, 'normal', gray); doc.text(`GST: ${biller.tax_id}`, margin, y); y += 4; }

  // INVOICE title (right side)
  setFont(22, 'bold', dark);
  doc.text('INVOICE', PW - margin, 14, { align: 'right' });
  setFont(9, 'normal', gray);
  doc.text(`#${inv.invoice_number}`, PW - margin, 22, { align: 'right' });

  // Status badge
  const statusColors: Record<string, [number, number, number]> = { 'Paid': [22, 163, 74], 'Partially Paid': [37, 99, 235], 'Overdue': [220, 38, 38], 'Unpaid': [202, 138, 4], 'Draft': [107, 114, 128], 'Cancelled': [107, 114, 128], 'Void': [107, 114, 128] };
  const sColor = statusColors[inv.status] || [107, 114, 128];
  doc.setFillColor(...sColor);
  doc.setDrawColor(...sColor);
  const sText = inv.status;
  setFont(8, 'bold', white);
  const sW = doc.getTextWidth(sText) + 6;
  doc.roundedRect(PW - margin - sW, 25, sW, 6, 1, 1, 'F');
  doc.text(sText, PW - margin - sW / 2, 29.5, { align: 'center' });

  y = Math.max(y, 36);

  // ── Divider ────────────────────────────────────────────────────────────────
  doc.setDrawColor(220, 220, 225); doc.setLineWidth(0.3);
  doc.line(margin, y, PW - margin, y); y += 6;

  // ── BILL TO + DATES ────────────────────────────────────────────────────────
  const colMid = margin + CW * 0.55;
  setFont(7, 'bold', gray); doc.text('BILL TO', margin, y);
  setFont(7, 'bold', gray); doc.text('INVOICE DETAILS', colMid, y); y += 4;

  setFont(10, 'bold', dark); doc.text(truncate(cd.name || inv.client_name, 40), margin, y);
  const clientAddr = [cd.address, cd.city, cd.state, cd.zipCode, cd.country].filter(Boolean).join(', ');
  if (clientAddr) { setFont(8, 'normal', gray); doc.text(truncate(clientAddr, 45), margin, y + 5); }
  if (cd.taxId) { setFont(8, 'normal', gray); doc.text(`Tax ID: ${cd.taxId}`, margin, y + 10); }

  // Invoice date / due date
  const dateRows = [
    ['Invoice Date:', inv.invoice_date ? format(new Date(inv.invoice_date), 'dd MMM yyyy') : '-'],
    ['Due Date:', inv.due_date ? format(new Date(inv.due_date), 'dd MMM yyyy') : '-'],
    ...(inv.payment_terms ? [['Payment Terms:', inv.payment_terms]] : []),
  ];
  setFont(8, 'normal', gray);
  dateRows.forEach(([label, val], i) => {
    doc.text(label, colMid, y + i * 5); doc.text(val, PW - margin, y + i * 5, { align: 'right' });
  });
  y += Math.max(clientAddr ? 16 : 10, dateRows.length * 5 + 2);

  // Invoice total highlight box
  doc.setFillColor(245, 240, 255); doc.setDrawColor(220, 210, 240);
  doc.roundedRect(colMid, y - 2, CW * 0.45, 14, 2, 2, 'FD');
  setFont(7, 'bold', purple); doc.text('INVOICE AMOUNT', colMid + (CW * 0.45) / 2, y + 3, { align: 'center' });
  setFont(13, 'bold', purple); doc.text(fmt(grandTotal, currency), colMid + (CW * 0.45) / 2, y + 10, { align: 'center' });
  y += 18;

  doc.setDrawColor(220, 220, 225); doc.line(margin, y, PW - margin, y); y += 6;

  // ── ITEMS TABLE ────────────────────────────────────────────────────────────
  const colWidths = taxApplicable
    ? [CW * 0.38, CW * 0.08, CW * 0.12, CW * 0.12, CW * 0.1, CW * 0.1, CW * 0.1]
    : [CW * 0.5, CW * 0.1, CW * 0.2, CW * 0.2];
  const colHeaders = taxApplicable
    ? ['Description', 'Qty', 'Rate', 'Amount', 'Tax%', 'Tax Amt', 'Total']
    : ['Description', 'Qty', 'Rate', 'Amount'];

  // Header row
  doc.setFillColor(...lightGray);
  doc.rect(margin, y, CW, 7, 'F');
  setFont(7, 'bold', gray);
  let cx = margin + 2;
  colHeaders.forEach((h, i) => {
    doc.text(h, cx + (i > 0 ? colWidths[i] - 2 : 0), y + 5, { align: i > 0 ? 'right' : 'left' });
    cx += colWidths[i];
  });
  y += 7;

  // Item rows
  items.forEach((item: any, idx: number) => {
    const rowH = item.description && item.title ? 9 : 7;
    if (y + rowH > 270) { doc.addPage(); y = margin; }
    if (idx % 2 === 1) { doc.setFillColor(250, 250, 252); doc.rect(margin, y, CW, rowH, 'F'); }
    const tp = item.tax_percentage ?? 18;
    const tv = Number(item.tax_value || (Number(item.amount || 0) * tp / 100));
    const lineTotal = Number(item.amount || 0) + tv;

    setFont(8, 'bold', dark);
    cx = margin + 2;
    doc.text(truncate(item.title || item.description || 'N/A', 38), cx, y + 5);
    cx += colWidths[0];
    setFont(8, 'normal', gray);
    const rowVals = taxApplicable
      ? [(item.quantity || 1).toString(), fmt(item.rate || 0, currency), fmt(item.amount || 0, currency), `${tp}%`, fmt(tv, currency), fmt(lineTotal, currency)]
      : [(item.quantity || 1).toString(), fmt(item.rate || 0, currency), fmt(item.amount || 0, currency)];
    rowVals.forEach((v, i) => {
      doc.text(v, cx + colWidths[i + 1] - 2, y + 5, { align: 'right' });
      cx += colWidths[i + 1];
    });
    if (item.description && item.title) { setFont(7, 'normal', gray); doc.text(truncate(item.description, 50), margin + 2, y + 8.5); }
    doc.setDrawColor(235, 235, 240); doc.line(margin, y + rowH, PW - margin, y + rowH);
    y += rowH;
  });

  y += 6;

  // ── TOTALS ─────────────────────────────────────────────────────────────────
  if (y + 50 > 270) { doc.addPage(); y = margin; }
  const totX = margin + CW * 0.55; const totW = CW * 0.45;

  const totRows: [string, string, boolean, string?][] = [
    ['Subtotal', fmt(subtotal, currency), false],
  ];

  if (taxApplicable) {
    Object.entries(taxBreakdown).forEach(([rate, value]: [string, any]) => {
      if (taxMode === 'GST') {
        totRows.push([`CGST (${Number(rate) / 2}%)`, fmt(value / 2, currency), false]);
        totRows.push([`SGST (${Number(rate) / 2}%)`, fmt(value / 2, currency), false]);
      } else {
        totRows.push([`IGST (${rate}%)`, fmt(value, currency), false]);
      }
    });
  }
  if (tds > 0) totRows.push([`TDS Deduction`, `(-) ${fmt(tds, currency)}`, false, 'red']);
  if (tcs > 0) totRows.push([`TCS Addition`, `(+) ${fmt(tcs, currency)}`, false, 'green']);

  totRows.forEach(([label, val, _bold, color]) => {
    setFont(8, 'normal', color === 'red' ? [180, 30, 30] : color === 'green' ? [22, 130, 60] : gray);
    doc.text(label, totX, y); doc.text(val, PW - margin, y, { align: 'right' }); y += 5;
  });

  doc.setDrawColor(200, 200, 210); doc.line(totX, y, PW - margin, y); y += 4;

  setFont(9, 'bold', dark); doc.text('Invoice Total', totX, y); doc.text(fmt(grandTotal, currency), PW - margin, y, { align: 'right' }); y += 5;
  setFont(9, 'bold', [22, 130, 60]); doc.text('Paid', totX, y); doc.text(`(-) ${fmt(inv.paid_amount || 0, currency)}`, PW - margin, y, { align: 'right' }); y += 5;

  const balance = Number(grandTotal) - Number(inv.paid_amount || 0);
  doc.setFillColor(30, 30, 30);
  doc.roundedRect(totX, y, totW, 10, 1.5, 1.5, 'F');
  setFont(8, 'bold', white); doc.text('BALANCE DUE', totX + 4, y + 6.5);
  setFont(10, 'bold', white); doc.text(fmt(balance, currency), PW - margin - 2, y + 6.5, { align: 'right' });
  y += 16;

  // ── Payment receipt if partially paid ─────────────────────────────────────
  if (Number(inv.paid_amount || 0) > 0) {
    doc.setFillColor(240, 250, 245); doc.setDrawColor(200, 235, 215);
    doc.roundedRect(margin, y, CW, 14, 2, 2, 'FD');
    setFont(7, 'bold', gray); doc.text('PAYMENT RECEIVED', margin + 4, y + 4);
    setFont(9, 'bold', [22, 130, 60]); doc.text(fmt(inv.paid_amount, currency), PW - margin - 4, y + 10, { align: 'right' });
    const pmInfo = [`via ${inv.payment_method || 'Bank Transfer'}`, inv.payment_date ? `on ${format(new Date(inv.payment_date), 'dd MMM yyyy')}` : ''].filter(Boolean).join(' ');
    setFont(7, 'normal', gray); doc.text(pmInfo, margin + 4, y + 10);
    y += 20;
  }

  // ── Notes & Terms ──────────────────────────────────────────────────────────
  if (inv.notes || inv.terms) {
    if (y + 20 > 265) { doc.addPage(); y = margin; }
    doc.setDrawColor(220, 220, 225); doc.line(margin, y, PW - margin, y); y += 6;
    const half = CW / 2 - 4;
    if (inv.notes) {
      setFont(7, 'bold', gray); doc.text('NOTES', margin, y);
      setFont(7, 'normal', dark);
      const lines = doc.splitTextToSize(inv.notes, half);
      doc.text(lines.slice(0, 4), margin, y + 5);
    }
    if (inv.terms) {
      const tx = inv.notes ? margin + half + 8 : margin;
      setFont(7, 'bold', gray); doc.text('TERMS & CONDITIONS', tx, y);
      setFont(7, 'normal', dark);
      const lines = doc.splitTextToSize(inv.terms, half);
      doc.text(lines.slice(0, 4), tx, y + 5);
    }
    y += 30;
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  const footerY = 285;
  doc.setDrawColor(220, 220, 225); doc.line(margin, footerY - 4, PW - margin, footerY - 4);
  setFont(7, 'normal', gray); doc.text('Thank you for your business!', PW / 2, footerY, { align: 'center' });
  if (biller?.website) { setFont(7, 'bold', purple); doc.text(biller.website, PW / 2, footerY + 4, { align: 'center' }); }

  // ── Save ───────────────────────────────────────────────────────────────────
  doc.save(`${inv.invoice_number?.replace(/\//g, '-') || 'Invoice'}.pdf`);
};