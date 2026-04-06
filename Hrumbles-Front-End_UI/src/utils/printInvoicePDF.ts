/**
 * printInvoicePDF
 * ─────────────────────────────────────────────────────────────────────────
 * Generates a PDF that is visually IDENTICAL to the InvoiceDetails modal view.
 *
 * Every Tailwind class in InvoiceDetails.tsx is translated to its exact
 * inline-CSS equivalent so the output matches the on-screen preview 1:1.
 *
 * SIZE OPTIMISATION (fixes 15 MB → ~1–2 MB):
 *   • scale 1.8 instead of 2.5  → ~2× fewer pixels
 *   • JPEG 0.82 instead of PNG  → ~6–8× smaller per image
 *
 * Called by:
 *   - InvoiceDetails "Download PDF" button
 *   - InvoicesPage action-row download button
 *   - InvoicesPage preview-panel "PDF" button
 */

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SYM: Record<string, string> = { INR: '₹', USD: '$', GBP: '£', EUR: '€' };

function fmtMoney(n: number | string, currency = 'INR') {
  const v = Number(n) || 0;
  const s = SYM[currency] || '₹';
  if (currency === 'USD') return `${s}${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  return `${s}${v.toLocaleString('en-IN')}`;
}

function fmtDate(d?: string | null) {
  if (!d) return '—';
  try { return format(new Date(d), 'dd MMM, yyyy'); } catch { return d; }
}

function joinAddr(...parts: (string | null | undefined)[]) {
  return parts.filter(Boolean).join(', ');
}

// ─── Status badge inline style (mirrors InvoiceDetails conditional classes) ──

function statusStyle(status: string) {
  // px-4=16px py-2=8px border-2=2px rounded font-black text-xs uppercase tracking-[0.1em]
  const base = 'padding:8px 16px;border:2px solid;border-radius:4px;font-weight:900;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;display:inline-block;';
  if (status === 'Paid')           return base + 'border-color:#16a34a;color:#16a34a;background:rgba(240,253,244,0.3)';
  if (status === 'Partially Paid') return base + 'border-color:#2563eb;color:#2563eb;background:rgba(239,246,255,0.3)';
  if (status === 'Overdue')        return base + 'border-color:#dc2626;color:#dc2626;background:rgba(254,242,242,0.3)';
  return base + 'border-color:#d1d5db;color:#9ca3af';
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function printInvoicePDF(invoiceId: string): Promise<void> {

  // ── 1. Fetch invoice ────────────────────────────────────────────────────────
  const { data: inv, error } = await supabase
    .from('hr_invoices').select('*').eq('id', invoiceId).single();
  if (error || !inv) throw new Error('Invoice not found');

  let items: any[] = [];
  try {
    items = typeof inv.items === 'string' ? JSON.parse(inv.items) : (inv.items || []);
  } catch { items = []; }
  items = items.map((i: any) => ({ ...i, tax_percentage: i.tax_percentage ?? 18 }));

  // ── 2. Fetch biller ─────────────────────────────────────────────────────────
  let biller: any = null;
  if (inv.organization_id) {
    const [{ data: prof }, { data: org }] = await Promise.all([
      supabase.from('hr_organization_profile').select('*').eq('organization_id', inv.organization_id).single(),
      supabase.from('hr_organizations').select('name').eq('id', inv.organization_id).single(),
    ]);
    biller = { ...prof, org_name: org?.name };
  }

  // ── 3. Customer info from snapshot ─────────────────────────────────────────
  const cd = inv.client_details || { name: inv.client_name, currency: inv.currency || 'INR' };
  const currency: string = cd.currency || inv.currency || 'INR';
  const fmt = (n: number | string) => fmtMoney(n, currency);

  // ── 4. Summary (mirrors InvoiceDetails useMemo) ─────────────────────────────
  const subtotal  = items.reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalTax  = items.reduce((s, i) => s + Number(i.tax_value || 0), 0);
  const taxBreakdown: Record<string, number> = {};
  const taxApplicable = inv.tax_applicable ?? true;
  const taxMode = inv.tax_mode || 'GST';
  if (taxApplicable) {
    items.forEach((i) => {
      const r = i.tax_percentage ?? 18;
      taxBreakdown[r] = (taxBreakdown[r] || 0) + Number(i.tax_value || 0);
    });
  }
  const tds = Number(inv.tds_amount || 0);
  const tcs = Number(inv.tcs_amount || 0);
  const adj = tds > 0 ? -tds : tcs > 0 ? tcs : 0;
  const grandTotal = subtotal + totalTax + adj;
  const paidAmt    = Number(inv.paid_amount || 0);
  const balance    = grandTotal - paidAmt;

  // ── 5. Addresses ────────────────────────────────────────────────────────────
  const billerAddr = joinAddr(biller?.address_line1, biller?.address_line2, biller?.city,
    biller?.state && biller?.zip_code ? `${biller.state} - ${biller.zip_code}` : (biller?.state || biller?.zip_code),
    biller?.country);

  const clientAddr = joinAddr(cd.address, cd.city,
    cd.state && cd.zipCode ? `${cd.state} - ${cd.zipCode}` : (cd.state || cd.zipCode),
    cd.country);

  // ── 6. Items table rows (mirrors InvoiceDetails tbody) ──────────────────────
  const itemRows = items.map((item) => {
    const tp = item.tax_percentage ?? 18;
    const tv = Number(item.tax_value || (Number(item.amount || 0) * tp / 100));
    const lineTotal = Number(item.amount || 0) + tv;
    const taxCols = taxApplicable ? `
      <td style="padding:16px 12px;text-align:right;color:#4b5563;font-size:12px">${tp}%</td>
      <td style="padding:16px 12px;text-align:right;color:#4b5563;font-size:12px">${fmt(tv)}</td>
      <td style="padding:16px 12px;text-align:right;color:#111827;font-weight:700;font-size:12px">${fmt(lineTotal)}</td>` : '';
    return `
      <tr style="border-top:1px solid #f3f4f6">
        <td style="padding:16px 12px;color:#1f2937;font-size:12px">
          <div style="font-weight:700">${item.title || item.description || 'N/A'}</div>
          ${item.description && item.title
            ? `<div style="color:#6b7280;font-size:10px;margin-top:4px">${item.description}</div>` : ''}
        </td>
        <td style="padding:16px 12px;text-align:right;color:#4b5563;font-size:12px">${item.quantity || 1}</td>
        <td style="padding:16px 12px;text-align:right;color:#4b5563;font-size:12px">${fmt(item.rate || 0)}</td>
        <td style="padding:16px 12px;text-align:right;color:#4b5563;font-size:12px">${fmt(item.amount || 0)}</td>
        ${taxCols}
      </tr>`;
  }).join('');

  // ── 7. Tax header columns ───────────────────────────────────────────────────
  const taxTh = taxApplicable ? `
    <th style="${TH}text-align:right">Tax %</th>
    <th style="${TH}text-align:right">Tax Amt</th>
    <th style="${TH}text-align:right">Total</th>` : '';

  // ── 8. Tax breakdown rows (mirrors InvoiceDetails map) ───────────────────────
  const taxRows = taxApplicable
    ? Object.entries(taxBreakdown).map(([rate, value]) => {
        if (taxMode === 'GST') return `
          <div style="${ROW}"><span>CGST (${Number(rate)/2}%)</span><span style="color:#111827">${fmt(value/2)}</span></div>
          <div style="${ROW}"><span>SGST (${Number(rate)/2}%)</span><span style="color:#111827">${fmt(value/2)}</span></div>`;
        return `<div style="${ROW}"><span>IGST (${rate}%)</span><span style="color:#111827">${fmt(value)}</span></div>`;
      }).join('')
    : '';

  // ── 9. Payment receipt block ─────────────────────────────────────────────────
  const paymentBlock = paidAmt > 0 ? `
    <div style="background:rgba(249,250,251,0.5);border-radius:8px;padding:20px;border:1px solid #f3f4f6">
      <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:16px">Payment Receipt</div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;font-size:12px">
        <div>
          <span style="font-weight:700;color:#374151;display:block">Amount Received</span>
          <span style="font-size:10px;color:#6b7280;font-style:italic">
            via ${inv.payment_method || 'Bank Transfer'}${inv.payment_date ? ` on ${fmtDate(inv.payment_date)}` : ''}
          </span>
        </div>
        <span style="font-weight:900;color:#16a34a;font-size:14px">${fmt(paidAmt)}</span>
      </div>
      ${Number(inv.total_amount || 0) - paidAmt > 0 ? `
        <div style="padding-top:12px;border-top:1px dashed #e5e7eb;margin-top:12px;display:flex;justify-content:space-between;font-size:12px">
          <span style="color:#6b7280;font-weight:700">Unpaid Balance</span>
          <span style="font-weight:900;color:#dc2626">${fmt(Number(inv.total_amount) - paidAmt)}</span>
        </div>` : ''}
    </div>` : '<div></div>';

  // ── 10. Notes / Terms block ──────────────────────────────────────────────────
  const notesBlock = (inv.notes || inv.terms) ? `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;font-size:11px;margin-top:40px">
      ${inv.notes ? `
        <div>
          <div style="font-weight:700;color:#1f2937;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.1em;font-size:9px">Notes</div>
          <p style="color:#6b7280;line-height:1.625;white-space:pre-wrap;margin:0">${inv.notes}</p>
        </div>` : '<div></div>'}
      ${inv.terms ? `
        <div>
          <div style="font-weight:700;color:#1f2937;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.1em;font-size:9px">Terms &amp; Conditions</div>
          <p style="color:#6b7280;line-height:1.625;white-space:pre-wrap;margin:0">${inv.terms}</p>
        </div>` : ''}
    </div>` : '';

  // ── 11. Logo / fallback ──────────────────────────────────────────────────────
  const logoHtml = biller?.logo_url
    ? `<img src="${biller.logo_url}" crossorigin="anonymous"
         style="height:48px;width:auto;object-fit:contain;margin-bottom:12px;display:block" />`
    : `<div style="height:40px;width:40px;background:#9333ea;border-radius:4px;display:flex;
         align-items:center;justify-content:center;margin-bottom:8px;
         font-size:20px;font-weight:700;color:#fff">
         ${(biller?.company_name || biller?.org_name || 'X').charAt(0)}
       </div>`;

  // ── 12. Assemble — mirrors the exact DOM structure of InvoiceDetails ──────────
  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
            color:#111827;background:#fff;width:780px;box-sizing:border-box">

  <!-- h-2 w-full bg-gradient-to-r from-purple-600 to-indigo-600 -->
  <div style="height:8px;width:100%;background:linear-gradient(90deg,#9333ea,#4f46e5)"></div>

  <!-- p-10 text-gray-900 -->
  <div style="padding:40px">

    <!-- flex flex-row justify-between items-center mb-10 -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:40px">

      <!-- LEFT: biller -->
      <div style="display:flex;flex-direction:column;align-items:flex-start">
        ${logoHtml}
        <!-- font-bold text-gray-900 text-base -->
        <div style="font-weight:700;color:#111827;font-size:16px">${biller?.company_name || biller?.org_name || ''}</div>
        ${billerAddr ? `<!-- text-[11px] text-gray-500 mt-1 leading-relaxed max-w-[250px] -->
          <div style="font-size:11px;color:#6b7280;margin-top:4px;line-height:1.625;max-width:250px">${billerAddr}</div>` : ''}
        ${biller?.tax_id ? `<!-- text-[11px] font-medium text-gray-600 mt-1 -->
          <div style="font-size:11px;font-weight:500;color:#4b5563;margin-top:4px">GST: ${biller.tax_id}</div>` : ''}
      </div>

      <!-- RIGHT: status badge + INVOICE label -->
      <!-- flex flex-row items-center gap-6 -->
      <div style="display:flex;flex-direction:row;align-items:center;gap:24px">

        <!-- status badge: px-4 py-2 border-2 rounded font-black text-xs uppercase tracking-[0.1em] -->
        <div style="${statusStyle(inv.status)}">${inv.status}</div>

        <!-- text-right border-l pl-6 border-gray-100 -->
        <div style="text-align:right;border-left:1px solid #f3f4f6;padding-left:24px">
          <!-- text-4xl font-black tracking-tight text-gray-900 leading-none -->
          <div style="font-size:36px;font-weight:900;letter-spacing:-0.025em;color:#111827;line-height:1">INVOICE</div>
          <!-- text-gray-500 font-bold text-sm mt-2 -->
          <div style="color:#6b7280;font-weight:700;font-size:14px;margin-top:8px">#${inv.invoice_number}</div>
          ${currency !== 'INR' ? `
            <!-- inline-block mt-1 text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full -->
            <span style="display:inline-block;margin-top:4px;font-size:10px;font-weight:700;
              background:#f1f5f9;color:#475569;padding:2px 8px;border-radius:9999px">${currency}</span>` : ''}
        </div>
      </div>
    </div>

    <!-- Separator: my-8 → border-t border-gray-200 margin 32px 0 -->
    <div style="border-top:1px solid #e5e7eb;margin:32px 0"></div>

    <!-- Bill To + Dates: grid grid-cols-2 gap-8 mb-10 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:40px">

      <!-- LEFT: bill to -->
      <div>
        <!-- text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 -->
        <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px">Bill To</div>
        <!-- font-bold text-base text-gray-800 -->
        <div style="font-weight:700;font-size:16px;color:#1f2937">${cd.name || inv.client_name}</div>
        ${clientAddr ? `<!-- text-[11px] text-gray-500 mt-1 leading-relaxed max-w-[250px] -->
          <div style="font-size:11px;color:#6b7280;margin-top:4px;line-height:1.625;max-width:250px">${clientAddr}</div>` : ''}
        ${cd.taxId ? `<!-- text-[11px] text-gray-600 mt-2 font-medium -->
          <div style="font-size:11px;color:#4b5563;margin-top:8px;font-weight:500">Tax ID: ${cd.taxId}</div>` : ''}
      </div>

      <!-- RIGHT: dates + amount box -->
      <!-- flex flex-col items-end -->
      <div style="display:flex;flex-direction:column;align-items:flex-end">
        <!-- grid grid-cols-2 gap-x-8 gap-y-4 text-right -->
        <div style="display:grid;grid-template-columns:1fr 1fr;column-gap:32px;row-gap:16px;text-align:right;width:100%">
          <div>
            <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em">Invoice Date</div>
            <!-- text-sm font-semibold text-gray-800 -->
            <div style="font-size:14px;font-weight:600;color:#1f2937;margin-top:2px">${fmtDate(inv.invoice_date)}</div>
          </div>
          <div>
            <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em">Due Date</div>
            <div style="font-size:14px;font-weight:600;color:#1f2937;margin-top:2px">${fmtDate(inv.due_date)}</div>
          </div>
          ${inv.payment_terms ? `
            <!-- col-span-2 -->
            <div style="grid-column:span 2;text-align:right">
              <div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em">Payment Terms</div>
              <div style="font-size:14px;font-weight:600;color:#1f2937;margin-top:2px">${inv.payment_terms}</div>
            </div>` : ''}

          <!-- col-span-2 bg-purple-50 px-8 py-3 rounded border border-purple-100 text-center mt-2 -->
          <div style="grid-column:span 2;background:#faf5ff;padding:12px 32px;border-radius:6px;
            border:1px solid #f3e8ff;text-align:center;margin-top:8px">
            <!-- text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-1 -->
            <div style="font-size:10px;font-weight:700;color:#9333ea;text-transform:uppercase;
              letter-spacing:0.1em;margin-bottom:4px">Invoice Amount</div>
            <!-- text-2xl font-black text-purple-700 -->
            <div style="font-size:24px;font-weight:900;color:#7e22ce">${fmt(grandTotal)}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Items table: mb-8 border rounded-lg overflow-hidden -->
    <div style="margin-bottom:32px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <!-- thead: bg-gray-50 text-gray-500 font-bold border-b -->
        <thead style="background:#f9fafb;color:#6b7280;font-weight:700;border-bottom:1px solid #e5e7eb">
          <tr>
            <!-- py-4 px-3 text-left uppercase tracking-widest text-[9px] w-[40%] -->
            <th style="${TH}width:40%;text-align:left">Description</th>
            <th style="${TH}width:7%;text-align:right">Qty</th>
            <th style="${TH}width:11%;text-align:right">Rate</th>
            <th style="${TH}width:11%;text-align:right">Amount</th>
            ${taxTh}
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
    </div>

    <!-- Calculations: grid grid-cols-2 gap-12 mb-10 -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-bottom:40px">

      <!-- LEFT: payment receipt (only if paid) -->
      ${paymentBlock}

      <!-- RIGHT: totals — flex flex-col items-end -->
      <div style="display:flex;flex-direction:column;align-items:flex-end">
        <div style="width:100%">

          <!-- flex justify-between text-xs text-gray-500 font-medium -->
          <div style="${ROW}"><span>Subtotal</span><span style="color:#111827">${fmt(subtotal)}</span></div>

          ${taxRows}

          ${tds > 0 ? `<!-- TDS -->
            <div style="${ROW}color:#ef4444;font-weight:500">
              <span>TDS Deduction</span><span>(-) ${fmt(tds)}</span>
            </div>` : ''}
          ${tcs > 0 ? `<!-- TCS -->
            <div style="${ROW}color:#22c55e;font-weight:500">
              <span>TCS Addition</span><span>(+) ${fmt(tcs)}</span>
            </div>` : ''}

          <!-- flex justify-between text-sm font-bold text-gray-900 pt-3 border-t -->
          <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;
            color:#111827;padding-top:12px;border-top:1px solid #e5e7eb;margin-top:4px">
            <span>Invoice Total</span><span>${fmt(grandTotal)}</span>
          </div>

          <!-- flex justify-between text-sm font-bold text-green-600 -->
          <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:700;
            color:#16a34a;margin-top:12px">
            <span>Total Paid</span><span>(-) ${fmt(paidAmt)}</span>
          </div>

          <!-- flex justify-between text-xl font-black text-white bg-gray-900 p-4 rounded mt-4 -->
          <div style="display:flex;justify-content:space-between;font-size:20px;font-weight:900;
            color:#fff;background:#111827;padding:16px;border-radius:6px;margin-top:16px;
            align-items:center">
            <!-- uppercase text-[9px] tracking-[0.2em] flex items-center -->
            <span style="text-transform:uppercase;font-size:9px;letter-spacing:0.2em">Balance Due</span>
            <span>${fmt(balance)}</span>
          </div>
        </div>
      </div>
    </div>

    ${notesBlock}

    <!-- Footer: mt-12 text-center pt-6 border-t border-gray-100 -->
    <div style="margin-top:48px;text-align:center;padding-top:24px;border-top:1px solid #f3f4f6">
      <!-- text-gray-400 text-[10px] tracking-widest uppercase italic -->
      <div style="color:#9ca3af;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;font-style:italic">
        Thank you for your business!
      </div>
      ${biller?.website ? `
        <!-- text-purple-600 text-[10px] mt-2 font-bold -->
        <div style="color:#9333ea;font-size:10px;margin-top:8px;font-weight:700">${biller.website}</div>` : ''}
    </div>

  </div><!-- end p-10 -->
</div>`;

  // ── 13. Mount hidden container ────────────────────────────────────────────────
  const container = document.createElement('div');
  container.style.cssText = [
    'position:fixed',
    'left:-9999px',
    'top:0',
    'width:780px',
    'background:#fff',
    'z-index:-9999',
    'pointer-events:none',
  ].join(';');
  container.innerHTML = html;
  document.body.appendChild(container);

  // Wait a tick for layout + any cross-origin images to settle
  await new Promise(r => setTimeout(r, 150));

  try {
    // ── 14. Capture ──────────────────────────────────────────────────────────
    const canvas = await html2canvas(container, {
      scale: 1.8,            // Was 2.5 — ~2× fewer pixels, still crisp
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: 780,
      height: container.scrollHeight,
      scrollX: 0,
      scrollY: 0,
    });

    // ── 15. JPEG compression (key to ~1–2 MB vs 15 MB with PNG) ─────────────
    const imgData = canvas.toDataURL('image/jpeg', 0.82);

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pW = 210, pH = 297, mg = 6;
    const available = pH - 2 * mg;
    const imgW = pW - 2 * mg;
    const imgH = (canvas.height * imgW) / canvas.width;
    const sc  = imgH > available ? available / imgH : 1;

    pdf.addImage(imgData, 'JPEG', (pW - imgW * sc) / 2, mg, imgW * sc, imgH * sc);
    pdf.save(`${(inv.invoice_number || 'Invoice').replace(/\//g, '-')}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

// ─── Inline CSS shorthands (exact Tailwind equivalents) ───────────────────────

/** py-4 px-3 text-[9px] uppercase tracking-widest */
const TH = [
  'padding:16px 12px',
  'font-size:9px',
  'text-transform:uppercase',
  'letter-spacing:0.1em',
  'font-weight:700',
].join(';') + ';';

/** flex justify-between text-xs text-gray-500 font-medium — row in totals */
const ROW = [
  'display:flex',
  'justify-content:space-between',
  'font-size:12px',
  'color:#6b7280',
  'font-weight:500',
  'margin-top:12px',
].join(';') + ';';