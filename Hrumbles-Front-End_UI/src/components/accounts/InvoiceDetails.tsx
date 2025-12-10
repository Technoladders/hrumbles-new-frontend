import React, { useState, useRef, useEffect } from 'react';
import { Invoice, InvoiceStatus, useAccountsStore } from '@/lib/accounts-data';
import { Button } from '@/components/ui/button';
import {
  Download, CheckCircle, FileText, AlertTriangle,
  Clock, Loader2, Globe, Mail, Phone, MapPin
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Separator } from '@/components/ui/separator';

const USD_TO_INR_RATE = 84;

interface InvoiceDetailsProps {
  invoice: Invoice;
  onStatusChange: (id: string, status: InvoiceStatus) => void;
  onClose: () => void;
}

const InvoiceDetails: React.FC<InvoiceDetailsProps> = ({
  invoice,
  onStatusChange,
  onClose
}) => {
  const { exportInvoice, fetchOrganizationProfile, organizationProfile } = useAccountsStore();
  const [isExporting, setIsExporting] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Fetch Organization Profile on mount
  useEffect(() => {
    fetchOrganizationProfile();
  }, [fetchOrganizationProfile]);

  const convertToINR = (amount: number) => {
    return invoice.currency === 'USD' ? amount * USD_TO_INR_RATE : amount;
  };

  const formatAmount = (amount: number) => {
    return invoice.currency === 'USD' 
      ? `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatAmountWithTooltip = (amount: number) => {
    const inrAmount = convertToINR(amount);
    return (
      <div className="group relative inline-block">
        {invoice.currency === 'USD' ? (
          <>
            <span>{formatAmount(amount)}</span>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-50 shadow-xl">
              ₹ {inrAmount.toLocaleString('en-IN')}
            </div>
          </>
        ) : (
          <span>{formatAmount(amount)}</span>
        )}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      Paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
      Unpaid: "bg-amber-100 text-amber-700 border-amber-200",
      Overdue: "bg-rose-100 text-rose-700 border-rose-200",
      Draft: "bg-slate-100 text-slate-700 border-slate-200"
    };
    
    const icons = {
      Paid: <CheckCircle className="h-3.5 w-3.5 mr-1.5" />,
      Unpaid: <Clock className="h-3.5 w-3.5 mr-1.5" />,
      Overdue: <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />,
      Draft: <FileText className="h-3.5 w-3.5 mr-1.5" />
    };

    const key = status as keyof typeof styles;

    return (
      <div className={`flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${styles[key] || styles.Draft}`}>
        {icons[key]}
        {status.toUpperCase()}
      </div>
    );
  };

  const handleExport = async (format: 'pdf' | 'csv') => {
    if (format === 'csv') {
      exportInvoice(invoice.id, format);
      toast.success('CSV downloaded successfully');
      return;
    }

    if (!invoiceRef.current) return;

    setIsExporting(true);
    toast.info(`Generating PDF for Invoice #${invoice.invoiceNumber}...`);

    try {
      const element = invoiceRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
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
      pdf.save(`Invoice-${invoice.invoiceNumber}.pdf`);
      toast.success('Invoice PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Fallback if profile isn't loaded yet or missing
  const orgName = organizationProfile?.companyName || "Organization Name";
  const orgAddress = organizationProfile ? (
    <>
      {organizationProfile.addressLine1}<br />
      {organizationProfile.addressLine2 && <>{organizationProfile.addressLine2}<br /></>}
      {organizationProfile.city}, {organizationProfile.state} - {organizationProfile.zipCode}<br />
      {organizationProfile.country}
    </>
  ) : "Loading address...";

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 bg-gray-50/50 min-h-screen">
      {/* Header Actions */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <Button variant="ghost" onClick={onClose} className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
          ← Back
        </Button>
        
        <div className="flex items-center gap-3">
          {getStatusBadge(invoice.status)}
          
          <Select
            value={invoice.status}
            onValueChange={(value) => onStatusChange(invoice.id, value as InvoiceStatus)}
          >
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Paid">Mark Paid</SelectItem>
              <SelectItem value="Unpaid">Mark Unpaid</SelectItem>
              <SelectItem value="Overdue">Mark Overdue</SelectItem>
              <SelectItem value="Draft">Mark Draft</SelectItem>
            </SelectContent>
          </Select>

          <div className="h-6 w-px bg-gray-200 mx-1"></div>

          <Button variant="outline" size="sm" onClick={() => handleExport('csv')} disabled={isExporting}>
            <FileText className="h-4 w-4 mr-2" /> CSV
          </Button>
          <Button size="sm" onClick={() => handleExport('pdf')} disabled={isExporting} className="bg-slate-900 hover:bg-slate-800 text-white">
            {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            PDF
          </Button>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="flex justify-center">
        <div 
          ref={invoiceRef} 
          className="w-full max-w-[210mm] bg-white shadow-lg print:shadow-none overflow-hidden rounded-sm"
          style={{ minHeight: '297mm' }} // A4 aspect ratio approximation
        >
          {/* Top Banner Color Strip */}
          <div className="h-3 bg-gradient-to-r from-purple-600 to-violet-600 w-full"></div>

          <div className="p-10 space-y-8">
            {/* Header: Logo & Invoice Title */}
            <div className="flex justify-between items-start">
              <div className="w-1/2">
                {organizationProfile?.logoUrl ? (
                  <img 
                    src={organizationProfile.logoUrl} 
                    alt="Logo" 
                    className="h-16 w-auto object-contain mb-4" 
                    crossOrigin="anonymous" // Important for html2canvas
                  />
                ) : (
                   <div className="h-16 w-16 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-xs mb-4">No Logo</div>
                )}
                <h1 className="text-xl font-bold text-slate-800">{orgName}</h1>
              </div>
              <div className="text-right">
                <h2 className="text-4xl font-light text-slate-300 tracking-wider">INVOICE</h2>
                <p className="text-slate-500 font-medium mt-1">#{invoice.invoiceNumber}</p>
              </div>
            </div>

            <Separator />

            {/* Bill To / From Grid */}
            <div className="grid grid-cols-2 gap-12">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Billed From</p>
                <div className="text-sm text-slate-700 leading-relaxed">
                  <p className="font-medium text-slate-900 mb-1">{orgName}</p>
                  <p className="text-slate-500">{orgAddress}</p>
                  
                  <div className="mt-4 space-y-1 text-slate-500">
                    {organizationProfile?.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3" /> {organizationProfile.email}
                      </div>
                    )}
                    {organizationProfile?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3" /> {organizationProfile.phone}
                      </div>
                    )}
                    {organizationProfile?.taxId && (
                      <div className="flex items-center gap-2 mt-2 font-medium">
                        GSTIN/Tax ID: {organizationProfile.taxId}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Billed To</p>
                <div className="text-sm text-slate-700 leading-relaxed">
                  <p className="font-medium text-slate-900 text-lg mb-1">{invoice.clientName}</p>
                  {/* Client address would go here if available in Invoice object */}
                  {/* <p className="text-slate-500">Client ID: {invoice.clientId}</p> */}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                   <div>
                      <p className="text-xs text-slate-400 uppercase">Issue Date</p>
                      <p className="text-sm font-semibold text-slate-700">{invoice.invoiceDate}</p>
                   </div>
                   <div>
                      <p className="text-xs text-slate-400 uppercase">Due Date</p>
                      <p className="text-sm font-semibold text-slate-700">{invoice.dueDate}</p>
                   </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="mt-8">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-800 text-white text-xs uppercase tracking-wider">
                    <th className="py-3 px-4 text-left rounded-l-md w-1/2">Description</th>
                    <th className="py-3 px-4 text-right">Qty</th>
                    <th className="py-3 px-4 text-right">Price</th>
                    <th className="py-3 px-4 text-right rounded-r-md">Total</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {invoice.items.map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="py-4 px-4 text-slate-700 font-medium">
                        {item.description}
                      </td>
                      <td className="py-4 px-4 text-right text-slate-500">{item.quantity}</td>
                      <td className="py-4 px-4 text-right text-slate-500">
                        {formatAmountWithTooltip(item.rate)}
                      </td>
                      <td className="py-4 px-4 text-right text-slate-800 font-semibold">
                        {formatAmountWithTooltip(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="flex justify-end mt-6">
              <div className="w-full md:w-5/12 space-y-3">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatAmountWithTooltip(invoice.subtotal || 0)}</span>
                </div>
                
                {(invoice.taxRate || 0) > 0 && (
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Tax ({invoice.taxRate}%)</span>
                    <span>{formatAmountWithTooltip(invoice.taxAmount || 0)}</span>
                  </div>
                )}
                
                <Separator className="my-2" />
                
                <div className="flex justify-between items-center p-3 bg-slate-900 text-white rounded-lg shadow-md">
                  <span className="font-semibold uppercase text-xs tracking-wider">Grand Total</span>
                  <span className="text-xl font-bold">{formatAmountWithTooltip(invoice.totalAmount)}</span>
                </div>

                {invoice.status === 'Paid' && (
                   <div className="flex justify-between text-sm text-emerald-600 font-medium pt-1">
                    <span>Amount Paid</span>
                    <span>{formatAmountWithTooltip(invoice.paidAmount || invoice.totalAmount)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer / Notes */}
            <div className="pt-8 mt-8 border-t border-dashed border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {(invoice.notes) && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Notes</h4>
                    <p className="text-xs text-slate-600 bg-yellow-50 p-3 rounded border border-yellow-100">
                      {invoice.notes}
                    </p>
                  </div>
                )}
                
                {(invoice.terms) && (
                  <div>
                     <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Terms & Conditions</h4>
                     <p className="text-xs text-slate-500 whitespace-pre-line">
                       {invoice.terms}
                     </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* System Footer */}
            <div className="text-center pt-10 pb-4">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                System Generated Invoice • {organizationProfile?.website || 'Technoladders Solutions'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetails;