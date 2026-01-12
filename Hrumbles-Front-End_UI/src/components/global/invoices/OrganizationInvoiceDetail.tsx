import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface OrganizationInvoiceDetailProps {
  invoiceId: string | null;
}

interface InvoiceDetail {
  id: string;
  invoice_number: string;
  created_at: string;
  invoice_date: string;
  due_date: string;
  status: string;
  currency?: 'USD' | 'INR';
  subtotal?: number | string;
  tax_rate?: number | string;
  tax_amount?: number | string;
  total_amount?: number | string;
  paid_amount?: number | string;
  payment_date?: string;
  payment_method?: string;
  notes?: string;
  terms?: string;
  items?: any[] | string;
  organization_id: string;
  organization_client_id: string;
  payment_terms?: string;
  tax_applicable?: boolean;
  tax_mode?: 'GST' | 'IGST';
  tds_amount?: number | string;
  tcs_amount?: number | string;
  client_name?: string;
}

interface CompleteOrgDetails {
  id: string;
  name: string;
  logo_url?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  tax_id?: string;
  website?: string;
}

const OrganizationInvoiceDetail: React.FC<OrganizationInvoiceDetailProps> = ({ invoiceId }) => {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [biller, setBiller] = useState<CompleteOrgDetails | null>(null);
  const [customer, setCustomer] = useState<CompleteOrgDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchCompleteOrgDetails = async (orgId: string): Promise<CompleteOrgDetails | null> => {
    try {
      const { data: orgData, error: orgError } = await supabase.from('hr_organizations').select('name').eq('id', orgId).single();
      if (orgError) throw orgError;
      const { data: profileData } = await supabase.from('hr_organization_profile').select('*').eq('organization_id', orgId).single();
      return {
        id: orgId,
        name: profileData?.company_name || orgData.name,
        logo_url: profileData?.logo_url,
        website: profileData?.website,
        address_line1: profileData?.address_line1,
        address_line2: profileData?.address_line2,
        city: profileData?.city,
        state: profileData?.state,
        zip_code: profileData?.zip_code,
        country: profileData?.country,
        tax_id: profileData?.tax_id,
      };
    } catch (error) {
      return null;
    }
  };

  useEffect(() => {
    const initData = async () => {
      if (!invoiceId) return;
      try {
        setIsLoading(true);
        const { data: invData, error: invError } = await supabase.from('hr_invoices').select('*').eq('id', invoiceId).single();
        if (invError) throw invError;
        
        // Parse items for old/new compatibility
        let parsedInvoice = { ...invData };
        if (typeof invData.items === 'string') {
          try {
            parsedInvoice.items = JSON.parse(invData.items).map((item: any) => ({
              ...item,
              tax_percentage: item.tax_percentage ?? 18
            }));
          } catch {
            parsedInvoice.items = [];
          }
        } else if (Array.isArray(invData.items)) {
          parsedInvoice.items = invData.items.map((item: any) => ({
            ...item,
            tax_percentage: item.tax_percentage ?? 18
          }));
        } else {
          parsedInvoice.items = [];
        }
        
        // Default tax_mode if null
        parsedInvoice.tax_mode = parsedInvoice.tax_mode || 'GST';
        parsedInvoice.tax_applicable = parsedInvoice.tax_applicable ?? true;
        
        setInvoice(parsedInvoice);
        
        if (invData.organization_id) setBiller(await fetchCompleteOrgDetails(invData.organization_id));
        if (invData.organization_client_id) setCustomer(await fetchCompleteOrgDetails(invData.organization_client_id));
      } catch (error: any) {
        toast.error("Could not load invoice details.");
      } finally {
        setIsLoading(false);
      }
    };
    initData();
  }, [invoiceId]);

const handleDownloadPDF = async () => {
  if (!printRef.current) return;
  try {
    setIsDownloading(true);
    toast.info("Generating PDF...");
    const element = printRef.current;
    
    // Clone the element to avoid parent constraints
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.top = '0';
    clone.style.width = `${element.offsetWidth}px`;
    clone.style.height = 'auto';
    clone.style.overflow = 'visible';
    clone.style.backgroundColor = '#ffffff';
    
    // Compress layout to fit single page without reducing font sizes
    const printStyles = clone.querySelectorAll('*');
    printStyles.forEach((el: Element) => {
      const style = (el as HTMLElement).style;
      // Reduce paddings and margins to compress vertical space
      if (style.paddingTop) style.paddingTop = `${Math.max(parseFloat(style.paddingTop) * 0.6, 2)}px`;
      if (style.paddingBottom) style.paddingBottom = `${Math.max(parseFloat(style.paddingBottom) * 0.6, 2)}px`;
      if (style.paddingLeft) style.paddingLeft = `${Math.max(parseFloat(style.paddingLeft) * 0.8, 4)}px`;
      if (style.paddingRight) style.paddingRight = `${Math.max(parseFloat(style.paddingRight) * 0.8, 4)}px`;
      if (style.marginTop) style.marginTop = `${Math.max(parseFloat(style.marginTop) * 0.5, 1)}px`;
      if (style.marginBottom) style.marginBottom = `${Math.max(parseFloat(style.marginBottom) * 0.5, 1)}px`;
      // Tighten line heights
      if (style.lineHeight) style.lineHeight = `${Math.max(parseFloat(style.lineHeight) * 0.9, 1.2)}`;
      // Compress table cells
      if (el.tagName === 'TD' || el.tagName === 'TH') {
        style.padding = '4px 6px'; // Fixed tight padding
        style.lineHeight = '1.1';
      }
      if (el.tagName === 'TABLE') {
        style.width = '100%';
        style.fontSize = '11px'; // Slight adjustment if needed, but keep close to original
      }
      // Reduce space-y in divs
      if (style['--tw-space-y']) {
        const spaceY = parseFloat(style['--tw-space-y']);
        style['--tw-space-y'] = `${spaceY * 0.7}px`;
      }
    });
    
    // Reduce overall container padding to minimal
    clone.style.padding = '15px'; // Reduced significantly
    
    // Force tighter layout for specific sections
    const header = clone.querySelector('.p-10');
    if (header) (header as HTMLElement).style.padding = '20px 15px';
    
    const itemsTable = clone.querySelector('.mb-8');
    if (itemsTable) (itemsTable as HTMLElement).style.marginBottom = '10px';
    
    const calculations = clone.querySelector('.grid.grid-cols-2');
    if (calculations) (calculations as HTMLElement).style.gap = '8px';
    
    const footer = clone.querySelector('.grid.grid-cols-2');
    if (footer) (footer as HTMLElement).style.gap = '4px';
    
    document.body.appendChild(clone);
    
    const canvas = await html2canvas(clone, {
      scale: 2.5, // Balanced for clarity and size
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: element.offsetWidth,
      height: clone.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      allowTaint: true
    });
    
    document.body.removeChild(clone);
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 8; // Tight margins
    const availableHeight = pageHeight - 2 * margin;
    
    const imgWidth = pageWidth - 2 * margin;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // If content exceeds page, scale down proportionally
    let finalScale = 1;
    if (imgHeight > availableHeight) {
      finalScale = availableHeight / imgHeight;
    }
    
    const finalImgWidth = imgWidth * finalScale;
    const finalImgHeight = imgHeight * finalScale;
    
    // Center the scaled image
    const x = (pageWidth - finalImgWidth) / 2;
    const y = margin;
    
    pdf.addImage(imgData, 'PNG', x, y, finalImgWidth, finalImgHeight);
    
    pdf.save(`${invoice?.invoice_number || 'Invoice'}.pdf`);
    toast.success("PDF downloaded successfully");
  } catch (error) {
    toast.error("Failed to generate PDF");
  } finally {
    setIsDownloading(false);
  }
};

  const formatCurrency = (amount: number | string, currency: string) => {
    const num = Number(amount) || 0;
    return currency === 'USD' ? `$${num.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : `₹${num.toLocaleString('en-IN')}`;
  };

  const formatAddress = (org: CompleteOrgDetails | null) => {
    if (!org) return "Address not available";
    const parts = [
      org.address_line1,
      org.address_line2,
      org.city,
      org.state ? `${org.state} - ${org.zip_code}` : org.zip_code,
      org.country
    ];
    return parts.filter(Boolean).join(', ');
  };

  const summary = useMemo(() => {
    if (!invoice?.items || !Array.isArray(invoice.items)) return { subtotal: 0, totalTax: 0, taxBreakdown: {}, adjustment: 0, grandTotal: 0 };

    const subtotal = invoice.items.reduce((acc: number, curr: any) => acc + Number(curr.amount || 0), 0);
    const totalTax = invoice.items.reduce((acc: number, curr: any) => acc + Number(curr.tax_value || 0), 0);
    const taxBreakdown: any = invoice.items.reduce((acc: any, curr: any) => {
      const rate = curr.tax_percentage ?? 18;
      if (!acc[rate]) acc[rate] = 0;
      acc[rate] += Number(curr.tax_value || 0);
      return acc;
    }, {});
    const tdsAmount = Number(invoice.tds_amount || 0);
    const tcsAmount = Number(invoice.tcs_amount || 0);
    const adjustment = tdsAmount > 0 ? -tdsAmount : (tcsAmount > 0 ? tcsAmount : 0);

    return {
      subtotal,
      totalTax,
      taxBreakdown,
      adjustment,
      grandTotal: subtotal + totalTax + adjustment
    };
  }, [invoice]);

  if (!invoiceId || isLoading) return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-purple-600" /></div>;
  if (!invoice) return <div className="p-8 text-center text-red-500">Invoice not found.</div>;

  const currency = invoice.currency || 'INR';
  const taxMode = invoice.tax_mode || 'GST';
  const taxApplicable = invoice.tax_applicable ?? true;

  return (
    <div className="bg-gray-50 p-4 font-sans h-full overflow-y-auto">
      <div className="flex justify-end mb-4 gap-2 pr-10 pt-2">
        <Button onClick={handleDownloadPDF} disabled={isDownloading} size="sm" className="bg-purple-600 hover:bg-purple-700">
          {isDownloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          {isDownloading ? 'Generating...' : 'Download PDF'}
        </Button>
      </div>
      <div className="flex justify-center">
        <Card className="shadow-none border-none overflow-hidden w-full max-w-[800px] bg-white" ref={printRef}>
          <div className="h-2 w-full bg-gradient-to-r from-purple-600 to-indigo-600"></div>
          <div className="p-10 text-gray-900">
            {/* ---------------- HEADER SECTION ---------------- */}
            <div className="flex flex-row justify-between items-center mb-10">
              {/* Left: Biller Details */}
              <div className="flex flex-col items-start">
                {biller?.logo_url ? (
                  <img src={biller.logo_url} alt="Logo" className="h-12 w-auto object-contain mb-3" crossOrigin="anonymous" />
                ) : (
                  <div className="h-10 w-10 bg-purple-600 rounded flex items-center justify-center text-white font-bold text-xl mb-2">{biller?.name?.charAt(0)}</div>
                )}
                <h3 className="font-bold text-gray-900 text-base">{biller?.name}</h3>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed max-w-[250px]">{formatAddress(biller)}</p>
                {biller?.tax_id && <span className="text-[11px] font-medium text-gray-600 mt-1">Tax ID: {biller.tax_id}</span>}
              </div>
              {/* Right: Status Label + Invoice Info (FIXED ALIGNMENT) */}
              <div className="flex flex-row items-center gap-6">
                {/* Status Label on the Left Side of the info block */}
                <div className={` px-4 py-2 border-2 rounded font-black text-xs uppercase tracking-[0.1em] ${invoice.status === 'Paid' ? 'border-green-600 text-green-600 bg-green-50/30' : invoice.status === 'Partially Paid' ? 'border-blue-600 text-blue-600 bg-blue-50/30' : invoice.status === 'Overdue' ? 'border-red-600 text-red-600 bg-red-50/30' : 'border-gray-300 text-gray-400'} `}>
                  {invoice.status}
                </div>
                <div className="text-right border-l pl-6 border-gray-100">
                  <h1 className="text-4xl font-black tracking-tight text-gray-900 leading-none">INVOICE</h1>
                  <p className="text-gray-500 font-bold text-sm mt-2">#{invoice.invoice_number}</p>
                </div>
              </div>
            </div>
            <Separator className="my-8" />
            {/* ---------------- BILL TO & DATES ---------------- */}
            <div className="grid grid-cols-2 gap-8 mb-10">
              <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Bill To</h4>
                <h3 className="font-bold text-base text-gray-800">{customer?.name || invoice.client_name}</h3>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed max-w-[250px]">{formatAddress(customer)}</p>
                {customer?.tax_id && <p className="text-[11px] text-gray-600 mt-2 font-medium">Tax ID: {customer.tax_id}</p>}
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
                    <p className="text-2xl font-black text-purple-700">{formatCurrency(summary.grandTotal, currency)}</p>
                  </div>
                </div>
              </div>
            </div>
            {/* ---------------- ITEMS TABLE ---------------- */}
            <div className="mb-8 border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500 font-bold border-b">
                  <tr>
                    <th className="py-4 px-3 text-left uppercase tracking-widest text-[9px] w-[40%]">Description</th>
                    <th className="py-4 px-3 text-right uppercase tracking-widest text-[9px] w-16">Qty</th>
                    <th className="py-4 px-3 text-right uppercase tracking-widest text-[9px] w-20">Rate</th>
                    <th className="py-4 px-3 text-right uppercase tracking-widest text-[9px] w-20">Amount</th>
                    <th className="py-4 px-3 text-right uppercase tracking-widest text-[9px] w-20">{taxApplicable ? 'Tax Slab' : ''}</th>
                    <th className="py-4 px-3 text-right uppercase tracking-widest text-[9px] w-24">{taxApplicable ? 'Tax Amt' : ''}</th>
                    <th className="py-4 px-3 text-right uppercase tracking-widest text-[9px] w-24">{taxApplicable ? 'Total' : ''}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(invoice.items as any[]).map((item: any, idx: number) => {
                    const taxPercentage = item.tax_percentage ?? 18;
                    const taxValue = Number(item.tax_value || (Number(item.amount || 0) * taxPercentage / 100));
                    const lineTotal = Number(item.amount || 0) + taxValue;
                    return (
                      <tr key={idx}>
                        <td className="py-4 px-3 text-gray-800 font-semibold">
                          <div className="space-y-1">
                            <div className="font-bold">{item.title || 'N/A'}</div>
                            {item.description && <div className="text-gray-600 text-[10px] leading-tight">{item.description}</div>}
                          </div>
                        </td>
                        <td className="py-4 px-3 text-right text-gray-600">{item.quantity || 1}</td>
                        <td className="py-4 px-3 text-right text-gray-600">{formatCurrency(item.rate || 0, currency)}</td>
                        <td className="py-4 px-3 text-right text-gray-600">{formatCurrency(item.amount || 0, currency)}</td>
                        {taxApplicable && (
                          <>
                            <td className="py-4 px-3 text-right text-gray-600">{taxPercentage}%</td>
                            <td className="py-4 px-3 text-right text-gray-600">{formatCurrency(taxValue, currency)}</td>
                            <td className="py-4 px-3 text-right text-gray-900 font-bold">{formatCurrency(lineTotal, currency)}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* ---------------- CALCULATIONS & PAYMENT BREAKDOWN ---------------- */}
            <div className="grid grid-cols-2 gap-12 mb-10">
              <div className="space-y-4">
                {Number(invoice.paid_amount || 0) > 0 && (
                  <div className="bg-gray-50/50 rounded-lg p-5 border border-gray-100">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Payment Receipt Details</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-start text-xs">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-gray-700">Amount Received</span>
                          <span className="text-[10px] text-gray-500 italic">via {invoice.payment_method || 'Bank Transfer'} on {invoice.payment_date ? format(new Date(invoice.payment_date), 'dd MMM, yyyy') : 'N/A'}</span>
                        </div>
                        <span className="font-black text-green-600 text-sm">{formatCurrency(invoice.paid_amount, currency)}</span>
                      </div>
                      {Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0) > 0 && (
                        <div className="pt-3 border-t border-dashed border-gray-200 flex justify-between items-center text-xs">
                          <span className="text-gray-500 font-bold">Unpaid Balance</span>
                          <span className="font-black text-red-600">{formatCurrency(Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0), currency)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end">
                <div className="w-full space-y-3">
                  <div className="flex justify-between text-xs text-gray-500 font-medium">
                    <span>Subtotal</span>
                    <span className="text-gray-900">{formatCurrency(summary.subtotal, currency)}</span>
                  </div>
                  {taxApplicable && Object.entries(summary.taxBreakdown).map(([rate, value]: [string, number]) => (
                    <div key={rate} className="space-y-1">
                      {taxMode === 'GST' ? (
                        <>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>CGST ({Number(rate)/2}%)</span>
                            <span className="text-gray-900">₹{(value/2).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>SGST ({Number(rate)/2}%)</span>
                            <span className="text-gray-900">₹{(value/2).toFixed(2)}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>IGST ({rate}%)</span>
                          <span className="text-gray-900">₹{value.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {Number(invoice.tds_amount || 0) > 0 && (
                    <div className="flex justify-between text-xs text-red-500 font-medium">
                      <span>TDS Deduction</span>
                      <span className="text-red-900">(-) {formatCurrency(invoice.tds_amount, currency)}</span>
                    </div>
                  )}
                  {Number(invoice.tcs_amount || 0) > 0 && (
                    <div className="flex justify-between text-xs text-green-500 font-medium">
                      <span>TCS Addition</span>
                      <span className="text-green-900">(+) {formatCurrency(invoice.tcs_amount, currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-gray-900 pt-3 border-t">
                    <span>Invoice Total</span>
                    <span>{formatCurrency(summary.grandTotal, currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-green-600">
                    <span>Total Paid</span>
                    <span>(-) {formatCurrency(invoice.paid_amount || 0, currency)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-black text-white bg-gray-900 p-4 rounded mt-4">
                    <span className="uppercase text-[9px] tracking-[0.2em] flex items-center">Balance Due</span>
                    <span>{formatCurrency(Number(summary.grandTotal) - Number(invoice.paid_amount || 0), currency)}</span>
                  </div>
                </div>
              </div>
            </div>
            {/* ---------------- FOOTER NOTES ---------------- */}
            <div className="grid grid-cols-2 gap-8 text-[11px] mt-10">
              {invoice.notes && (
                <div>
                  <h4 className="font-bold text-gray-800 mb-2 uppercase tracking-widest text-[9px]">Notes</h4>
                  <p className="text-gray-500 leading-relaxed whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <h4 className="font-bold text-gray-800 mb-2 uppercase tracking-widest text-[9px]">Terms & Conditions</h4>
                  <p className="text-gray-500 leading-relaxed whitespace-pre-wrap">{invoice.terms}</p>
                </div>
              )}
            </div>
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

export default OrganizationInvoiceDetail;