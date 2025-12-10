import React, { useState, useEffect, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download, Loader2, Building2, Mail, Phone, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface OrganizationInvoiceDetailProps {
  invoiceId: string | null;
}

// Invoice Table Structure
interface InvoiceDetail {
  id: string;
  invoice_number: string;
  created_at: string;
  invoice_date: string;
  due_date: string;
  status: string;
  currency: 'USD' | 'INR';
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  notes: string;
  terms: string;
  items: any[];
  organization_id: string; // Biller (Hrumbles)
  organization_client_id: string; // Customer
}

// Combined structure for Profile + Basic Org Info
interface CompleteOrgDetails {
  id: string;
  name: string; // From hr_organizations (fallback) or profile company_name
  subdomain?: string;
  logo_url?: string;
  website?: string;
  email?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  tax_id?: string;
}

const OrganizationInvoiceDetail: React.FC<OrganizationInvoiceDetailProps> = ({ invoiceId }) => {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [biller, setBiller] = useState<CompleteOrgDetails | null>(null);
  const [customer, setCustomer] = useState<CompleteOrgDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const printRef = useRef<HTMLDivElement>(null);

  // Helper to fetch Org + Profile and merge them
  const fetchCompleteOrgDetails = async (orgId: string): Promise<CompleteOrgDetails | null> => {
    try {
      // 1. Fetch Basic Info
      const { data: orgData, error: orgError } = await supabase
        .from('hr_organizations')
        .select('name, subdomain')
        .eq('id', orgId)
        .single();
      
      if (orgError) throw orgError;

      // 2. Fetch Rich Profile Info
      const { data: profileData } = await supabase
        .from('hr_organization_profile')
        .select('*')
        .eq('organization_id', orgId)
        .single();

      // 3. Merge (Prioritize Profile data)
      return {
        id: orgId,
        name: profileData?.company_name || orgData.name, // Use registered company name if available
        subdomain: orgData.subdomain,
        logo_url: profileData?.logo_url,
        website: profileData?.website,
        email: profileData?.email,
        phone: profileData?.phone,
        address_line1: profileData?.address_line1,
        address_line2: profileData?.address_line2,
        city: profileData?.city,
        state: profileData?.state,
        zip_code: profileData?.zip_code,
        country: profileData?.country,
        tax_id: profileData?.tax_id,
      };
    } catch (error) {
      console.error(`Error fetching details for org ${orgId}:`, error);
      return null;
    }
  };

  useEffect(() => {
    const initData = async () => {
      if (!invoiceId) return;
      
      try {
        setIsLoading(true);

        // 1. Get Invoice
        const { data: invData, error: invError } = await supabase
          .from('hr_invoices')
          .select('*')
          .eq('id', invoiceId)
          .single();

        if (invError) throw invError;
        setInvoice(invData);

        // 2. Get Biller (Hrumbles) Details
        if (invData.organization_id) {
          const billerDetails = await fetchCompleteOrgDetails(invData.organization_id);
          setBiller(billerDetails);
        }

        // 3. Get Customer Details
        if (invData.organization_client_id) {
          const customerDetails = await fetchCompleteOrgDetails(invData.organization_client_id);
          setCustomer(customerDetails);
        }

      } catch (error: any) {
        console.error("Error loading invoice:", error);
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
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true, // Critical for loading images from Supabase Storage
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; 
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${invoice?.invoice_number || 'Invoice'}.pdf`);
      
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("PDF Generation Error:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'Unpaid': return 'bg-red-100 text-red-800 border-red-200';
      case 'Draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return currency === 'USD' 
      ? `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` 
      : `₹${amount.toLocaleString('en-IN')}`;
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

  if (!invoiceId) return null;

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (!invoice) {
    return <div className="p-8 text-center text-red-500">Invoice not found.</div>;
  }

  return (
    <div className="bg-gray-50 p-4 font-sans h-full overflow-y-auto">
      {/* --- HEADER ACTIONS --- */}
      <div className="flex justify-end mb-4 gap-2">
        <Button onClick={handleDownloadPDF} disabled={isDownloading} size="sm" className="bg-purple-600 hover:bg-purple-700">
          {isDownloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          {isDownloading ? 'Generating...' : 'Download PDF'}
        </Button>
      </div>

      {/* --- INVOICE DOCUMENT --- */}
      <div>
        <Card className="shadow-none border-none overflow-hidden" ref={printRef}>
          {/* Branding Bar */}
          <div className="h-2 w-full bg-gradient-to-r from-purple-600 to-indigo-600"></div>
          
          <div className="p-8 bg-white text-gray-900">
            {/* ---------------- HEADER SECTION ---------------- */}
            <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6">

              {/* Left: Biller Details */}
              <div className="text-left flex flex-col items-start">
                {biller?.logo_url ? (
                  <img 
                    src={biller.logo_url} 
                    alt="Logo" 
                    className="h-12 w-auto object-contain mb-3" 
                    crossOrigin="anonymous" // Essential for PDF generation
                  />
                ) : (
                  <div className="h-10 w-10 bg-purple-600 rounded flex items-center justify-center text-white font-bold text-xl mb-2">
                    {biller?.name?.charAt(0) || 'H'}
                  </div>
                )}
                
                <h3 className="font-bold text-gray-900 text-base">{biller?.name}</h3>
                
                <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-[250px]">
                  {formatAddress(biller)}
                </p>
                
                <div className="flex flex-col gap-0.5 mt-2 text-xs text-gray-600">
                  {/* {biller?.email && <span className="flex items-center justify-start gap-1"><Mail className="h-3 w-3" /> {biller.email}</span>}
                  {biller?.phone && <span className="flex items-center justify-start gap-1"><Phone className="h-3 w-3" /> {biller.phone}</span>} */}
                  {biller?.tax_id && <span className="font-medium mt-1">Tax ID: {biller.tax_id}</span>}
                </div>
              </div>


              {/* Right: Invoice Info */}
              <div>
                <div className="text-right flex flex-col items-end">
                   <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">INVOICE</h1>
                </div>
                <p className="text-gray-500 font-medium text-sm">#{invoice.invoice_number}</p>
                {/* <div className="mt-2">
                   <Badge className={`${getStatusColor(invoice.status)} shadow-none`}>{invoice.status}</Badge>
                </div> */}
              </div>
              
 
            </div>

            <Separator className="my-6" />

            {/* ---------------- BILL TO & DATES ---------------- */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              {/* Bill To (Customer) */}
              <div>
                <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Bill To</h4>
                <div className="flex items-start gap-3">
                   
                    <div>
                        <h3 className="font-bold text-base text-gray-800">{customer?.name}</h3>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed max-w-[250px]">
                            {formatAddress(customer)}
                        </p>
                        
                        {customer?.tax_id && (
                          <p className="text-xs text-gray-600 mt-2 font-medium">
                            Tax ID: {customer.tax_id}
                          </p>
                        )}
                        
                        {/* <div className="flex items-center gap-2 mt-2">
                           {customer?.website && (
                             <div className="flex items-center text-[10px] text-blue-600">
                               <Globe className="h-3 w-3 mr-1" /> {customer.website}
                             </div>
                           )}
                        </div> */}
                    </div>
                </div>
              </div>

              {/* Dates & Totals */}
              <div className="flex flex-col items-end justify-start">
  <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-right">
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Invoice Date</p>
      <p className="text-sm font-medium text-gray-800">{format(new Date(invoice.invoice_date), 'dd MMM, yyyy')}</p>
    </div>
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Due Date</p>
      <p className="text-sm font-medium text-gray-800">{format(new Date(invoice.due_date), 'dd MMM, yyyy')}</p>
    </div>
    <div className="col-span-2 bg-purple-50 px-8 py-2 rounded-lg border border-purple-100 text-center">
      <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider mb-0.5">Amount Due</p>
      <p className="text-xl font-bold text-purple-700">{formatCurrency(invoice.total_amount, invoice.currency)}</p>
    </div>
  </div>
</div>
            </div>

            {/* ---------------- ITEMS TABLE ---------------- */}
            <div className="mb-6 overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4 text-left w-[50%] uppercase tracking-wider text-[10px]">Description</th>
                    <th className="py-3 px-4 text-right uppercase tracking-wider text-[10px]">Qty</th>
                    <th className="py-3 px-4 text-right uppercase tracking-wider text-[10px]">Rate</th>
                    <th className="py-3 px-4 text-right uppercase tracking-wider text-[10px]">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoice.items && Array.isArray(invoice.items) && invoice.items.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-3 px-4 text-gray-800 font-medium">{item.description}</td>
                      <td className="py-3 px-4 text-right text-gray-600">{item.quantity}</td>
                      <td className="py-3 px-4 text-right text-gray-600">{formatCurrency(item.rate, invoice.currency)}</td>
                      <td className="py-3 px-4 text-right text-gray-800 font-semibold">{formatCurrency(item.amount, invoice.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ---------------- CALCULATIONS ---------------- */}
            <div className="flex justify-end mb-10">
              <div className="w-1/2 md:w-1/3 space-y-2">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-900">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Tax ({invoice.tax_rate}%)</span>
                  <span className="font-medium text-gray-900">{formatCurrency(invoice.tax_amount, invoice.currency)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-sm font-bold text-gray-900">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.total_amount, invoice.currency)}</span>
                </div>
              </div>
            </div>

            {/* ---------------- FOOTER NOTES ---------------- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {invoice.notes && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-1">Notes</h4>
                  <p className="text-gray-500 bg-gray-50 p-2.5 rounded-md border border-gray-100 leading-relaxed">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <h4 className="font-semibold text-gray-700 mb-1">Terms & Conditions</h4>
                  <p className="text-gray-500 bg-gray-50 p-2.5 rounded-md border border-gray-100 leading-relaxed">{invoice.terms}</p>
                </div>
              )}
            </div>
            
            <div className="mt-8 text-center pt-4 border-t border-gray-100">
                <p className="text-gray-400 text-[10px]">Thank you for your business!</p>
                {biller?.website && <p className="text-purple-600 text-[10px] mt-1 font-medium">{biller.website}</p>}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OrganizationInvoiceDetail;