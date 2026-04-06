import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { printInvoicePDF } from '@/utils/printInvoicePDF';

interface Props { invoiceId: string | null; }

const InvoiceDetails: React.FC<Props> = ({ invoiceId }) => {
  const [invoice, setInvoice] = useState<any>(null);
  const [biller, setBiller] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  // printRef kept for the visible Card layout only — PDF generation uses shared utility
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!invoiceId) return;
    const load = async () => {
      try {
        setIsLoading(true);
        const { data: inv, error } = await supabase.from('hr_invoices').select('*').eq('id', invoiceId).single();
        if (error) throw error;

        let items: any[] = [];
        try { items = typeof inv.items === 'string' ? JSON.parse(inv.items) : (inv.items || []); } catch { items = []; }
        items = items.map((i: any) => ({ ...i, tax_percentage: i.tax_percentage ?? 18 }));

        setInvoice({ ...inv, items, tax_mode: inv.tax_mode || 'GST', tax_applicable: inv.tax_applicable ?? true });

        // Biller: always from hr_organization_profile
        if (inv.organization_id) {
          const [{ data: prof }, { data: org }] = await Promise.all([
            supabase.from('hr_organization_profile').select('*').eq('organization_id', inv.organization_id).single(),
            supabase.from('hr_organizations').select('name').eq('id', inv.organization_id).single(),
          ]);
          setBiller({ ...prof, org_name: org?.name });
        }
      } catch { toast.error('Could not load invoice details.'); }
      finally { setIsLoading(false); }
    };
    load();
  }, [invoiceId]);

  // ── CUSTOMER INFO ──────────────────────────────────────────────────────────
  // Priority: invoice.client_details (snapshot saved at creation) → fallback to client_name only
  const customerInfo = useMemo(() => {
    if (!invoice) return null;
    if (invoice.client_details) return invoice.client_details;
    // Legacy fallback (no snapshot): show just the name
    return { name: invoice.client_name || 'N/A', address: '', city: '', state: '', zipCode: '', country: '', taxId: '', currency: invoice.currency || 'INR' };
  }, [invoice]);

  const formatCustomerAddress = () => {
    if (!customerInfo) return '';
    return [customerInfo.address, customerInfo.city, customerInfo.state && customerInfo.zipCode ? `${customerInfo.state} - ${customerInfo.zipCode}` : customerInfo.state || customerInfo.zipCode, customerInfo.country].filter(Boolean).join(', ');
  };

  const formatBillerAddress = () => {
    if (!biller) return '';
    return [biller.address_line1, biller.address_line2, biller.city, biller.state && biller.zip_code ? `${biller.state} - ${biller.zip_code}` : biller.state || biller.zip_code, biller.country].filter(Boolean).join(', ');
  };

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    if (!invoice?.items?.length) return { subtotal: 0, totalTax: 0, taxBreakdown: {}, grandTotal: 0 };
    const subtotal = invoice.items.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
    const totalTax = invoice.items.reduce((s: number, i: any) => s + Number(i.tax_value || 0), 0);
    const taxBreakdown = invoice.items.reduce((acc: any, i: any) => { const r = i.tax_percentage ?? 18; acc[r] = (acc[r] || 0) + Number(i.tax_value || 0); return acc; }, {});
    const tds = Number(invoice.tds_amount || 0); const tcs = Number(invoice.tcs_amount || 0);
    const adj = tds > 0 ? -tds : tcs > 0 ? tcs : 0;
    return { subtotal, totalTax, taxBreakdown, grandTotal: subtotal + totalTax + adj };
  }, [invoice]);

  const currency = customerInfo?.currency || invoice?.currency || 'INR';
  const fmt = (n: number | string) => {
    const v = Number(n) || 0;
    if (currency === 'USD') return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    if (currency === 'GBP') return `£${v.toLocaleString()}`;
    if (currency === 'EUR') return `€${v.toLocaleString()}`;
    return `₹${v.toLocaleString('en-IN')}`;
  };

  // ── PDF — uses shared printInvoicePDF utility (same renderer everywhere) ──
  const handleDownloadPDF = async () => {
    if (!invoiceId) return;
    try {
      setIsDownloading(true);
      toast.info('Generating PDF...');
      await printInvoicePDF(invoiceId);
      toast.success('PDF downloaded');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!invoiceId || isLoading) return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>;
  if (!invoice) return <div className="p-8 text-center text-red-500">Invoice not found.</div>;

  const taxMode = invoice.tax_mode;
  const taxApplicable = invoice.tax_applicable;

  return (
    <div className="bg-gray-50 p-4 font-sans h-full overflow-y-auto">
      <div className="flex justify-end mb-4 pr-10 pt-2">
        <Button onClick={handleDownloadPDF} disabled={isDownloading} size="sm" className="bg-purple-600 hover:bg-purple-700">
          {isDownloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          {isDownloading ? 'Generating...' : 'Download PDF'}
        </Button>
      </div>

      <div className="flex justify-center">
        <Card className="shadow-none border-none overflow-hidden w-full max-w-[800px] bg-white" ref={printRef}>
          <div className="h-2 w-full bg-gradient-to-r from-purple-600 to-indigo-600" />

          <div className="p-10 text-gray-900">
            {/* HEADER */}
            <div className="flex flex-row justify-between items-center mb-10">
              <div className="flex flex-col items-start">
                {biller?.logo_url ? (
                  <img src={biller.logo_url} alt="Logo" className="h-12 w-auto object-contain mb-3" crossOrigin="anonymous" />
                ) : (
                  <div className="h-10 w-10 bg-purple-600 rounded flex items-center justify-center text-white font-bold text-xl mb-2">
                    {(biller?.company_name || biller?.org_name || 'X').charAt(0)}
                  </div>
                )}
                <h3 className="font-bold text-gray-900 text-base">{biller?.company_name || biller?.org_name}</h3>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed max-w-[250px]">{formatBillerAddress()}</p>
                {biller?.tax_id && <span className="text-[11px] font-medium text-gray-600 mt-1">GST: {biller.tax_id}</span>}
              </div>
              <div className="flex flex-row items-center gap-6">
                <div className={`px-4 py-2 border-2 rounded font-black text-xs uppercase tracking-[0.1em] ${invoice.status === 'Paid' ? 'border-green-600 text-green-600 bg-green-50/30' : invoice.status === 'Partially Paid' ? 'border-blue-600 text-blue-600 bg-blue-50/30' : invoice.status === 'Overdue' ? 'border-red-600 text-red-600 bg-red-50/30' : 'border-gray-300 text-gray-400'}`}>
                  {invoice.status}
                </div>
                <div className="text-right border-l pl-6 border-gray-100">
                  <h1 className="text-4xl font-black tracking-tight text-gray-900 leading-none">INVOICE</h1>
                  <p className="text-gray-500 font-bold text-sm mt-2">#{invoice.invoice_number}</p>
                  {currency !== 'INR' && <span className="inline-block mt-1 text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{currency}</span>}
                </div>
              </div>
            </div>

            <Separator className="my-8" />

            {/* BILL TO & DATES */}
            <div className="grid grid-cols-2 gap-8 mb-10">
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Bill To</h4>
                <h3 className="font-bold text-base text-gray-800">{customerInfo?.name}</h3>
                {formatCustomerAddress() && <p className="text-[11px] text-gray-500 mt-1 leading-relaxed max-w-[250px]">{formatCustomerAddress()}</p>}
                {customerInfo?.taxId && <p className="text-[11px] text-gray-600 mt-2 font-medium">Tax ID: {customerInfo.taxId}</p>}
              </div>
              <div className="flex flex-col items-end">
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-right">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Invoice Date</p>
                    <p className="text-sm font-semibold text-gray-800">{format(new Date(invoice.invoice_date), 'dd MMM, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Due Date</p>
                    <p className="text-sm font-semibold text-gray-800">{format(new Date(invoice.due_date), 'dd MMM, yyyy')}</p>
                  </div>
                  {invoice.payment_terms && (
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Payment Terms</p>
                      <p className="text-sm font-semibold text-gray-800">{invoice.payment_terms}</p>
                    </div>
                  )}
                  <div className="col-span-2 bg-purple-50 px-8 py-3 rounded border border-purple-100 text-center mt-2">
                    <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest mb-1">Invoice Amount</p>
                    <p className="text-2xl font-black text-purple-700">{fmt(summary.grandTotal)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ITEMS TABLE */}
            <div className="mb-8 border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500 font-bold border-b">
                  <tr>
                    <th className="py-4 px-3 text-left uppercase tracking-widest text-[9px] w-[40%]">Description</th>
                    <th className="py-4 px-3 text-right uppercase tracking-widest text-[9px] w-16">Qty</th>
                    <th className="py-4 px-3 text-right uppercase tracking-widest text-[9px] w-20">Rate</th>
                    <th className="py-4 px-3 text-right uppercase tracking-widest text-[9px] w-20">Amount</th>
                    {taxApplicable && <><th className="py-4 px-3 text-right uppercase tracking-widest text-[9px] w-20">Tax %</th><th className="py-4 px-3 text-right uppercase tracking-widest text-[9px] w-20">Tax Amt</th><th className="py-4 px-3 text-right uppercase tracking-widest text-[9px] w-24">Total</th></>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoice.items.map((item: any, idx: number) => {
                    const tp = item.tax_percentage ?? 18;
                    const tv = Number(item.tax_value || (Number(item.amount || 0) * tp / 100));
                    return (
                      <tr key={idx}>
                        <td className="py-4 px-3 text-gray-800">
                          <div className="font-bold">{item.title || item.description || 'N/A'}</div>
                          {item.description && item.title && <div className="text-gray-500 text-[10px] mt-1">{item.description}</div>}
                        </td>
                        <td className="py-4 px-3 text-right text-gray-600">{item.quantity || 1}</td>
                        <td className="py-4 px-3 text-right text-gray-600">{fmt(item.rate || 0)}</td>
                        <td className="py-4 px-3 text-right text-gray-600">{fmt(item.amount || 0)}</td>
                        {taxApplicable && <><td className="py-4 px-3 text-right text-gray-600">{tp}%</td><td className="py-4 px-3 text-right text-gray-600">{fmt(tv)}</td><td className="py-4 px-3 text-right text-gray-900 font-bold">{fmt(Number(item.amount || 0) + tv)}</td></>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* CALCULATIONS */}
            <div className="grid grid-cols-2 gap-12 mb-10">
              <div>
                {Number(invoice.paid_amount || 0) > 0 && (
                  <div className="bg-gray-50/50 rounded-lg p-5 border border-gray-100">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Payment Receipt</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-start text-xs">
                        <div>
                          <span className="font-bold text-gray-700 block">Amount Received</span>
                          <span className="text-[10px] text-gray-500 italic">via {invoice.payment_method || 'Bank Transfer'}{invoice.payment_date ? ` on ${format(new Date(invoice.payment_date), 'dd MMM, yyyy')}` : ''}</span>
                        </div>
                        <span className="font-black text-green-600 text-sm">{fmt(invoice.paid_amount)}</span>
                      </div>
                      {Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0) > 0 && (
                        <div className="pt-3 border-t border-dashed flex justify-between text-xs">
                          <span className="text-gray-500 font-bold">Unpaid Balance</span>
                          <span className="font-black text-red-600">{fmt(Number(invoice.total_amount) - Number(invoice.paid_amount))}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end">
                <div className="w-full space-y-3">
                  <div className="flex justify-between text-xs text-gray-500 font-medium"><span>Subtotal</span><span className="text-gray-900">{fmt(summary.subtotal)}</span></div>
                  {taxApplicable && Object.entries(summary.taxBreakdown).map(([rate, value]: [string, any]) => (
                    <div key={rate} className="space-y-1">
                      {taxMode === 'GST' ? (<><div className="flex justify-between text-xs text-gray-500"><span>CGST ({Number(rate) / 2}%)</span><span>{fmt(value / 2)}</span></div><div className="flex justify-between text-xs text-gray-500"><span>SGST ({Number(rate) / 2}%)</span><span>{fmt(value / 2)}</span></div></>) : (<div className="flex justify-between text-xs text-gray-500"><span>IGST ({rate}%)</span><span>{fmt(value)}</span></div>)}
                    </div>
                  ))}
                  {Number(invoice.tds_amount || 0) > 0 && <div className="flex justify-between text-xs text-red-500 font-medium"><span>TDS Deduction</span><span>(-) {fmt(invoice.tds_amount)}</span></div>}
                  {Number(invoice.tcs_amount || 0) > 0 && <div className="flex justify-between text-xs text-green-500 font-medium"><span>TCS Addition</span><span>(+) {fmt(invoice.tcs_amount)}</span></div>}
                  <div className="flex justify-between text-sm font-bold text-gray-900 pt-3 border-t"><span>Invoice Total</span><span>{fmt(summary.grandTotal)}</span></div>
                  <div className="flex justify-between text-sm font-bold text-green-600"><span>Total Paid</span><span>(-) {fmt(invoice.paid_amount || 0)}</span></div>
                  <div className="flex justify-between text-xl font-black text-white bg-gray-900 p-4 rounded mt-4">
                    <span className="uppercase text-[9px] tracking-[0.2em] flex items-center">Balance Due</span>
                    <span>{fmt(Number(summary.grandTotal) - Number(invoice.paid_amount || 0))}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* NOTES & TERMS */}
            {(invoice.notes || invoice.terms) && (
              <div className="grid grid-cols-2 gap-8 text-[11px] mt-10">
                {invoice.notes && <div><h4 className="font-bold text-gray-800 mb-2 uppercase tracking-widest text-[9px]">Notes</h4><p className="text-gray-500 leading-relaxed whitespace-pre-wrap">{invoice.notes}</p></div>}
                {invoice.terms && <div><h4 className="font-bold text-gray-800 mb-2 uppercase tracking-widest text-[9px]">Terms & Conditions</h4><p className="text-gray-500 leading-relaxed whitespace-pre-wrap">{invoice.terms}</p></div>}
              </div>
            )}

            {/* FOOTER */}
            <div className="mt-12 text-center pt-6 border-t border-gray-100">
              <p className="text-gray-400 text-[10px] tracking-widest uppercase italic">Thank you for your business!</p>
              {biller?.website && <p className="text-purple-600 text-[10px] mt-2 font-bold">{biller.website}</p>}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default InvoiceDetails;
// 