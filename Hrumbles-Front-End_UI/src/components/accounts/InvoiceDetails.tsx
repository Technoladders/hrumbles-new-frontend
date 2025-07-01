import React, { useState, useRef } from 'react';
import { Invoice, InvoiceStatus, useAccountsStore } from '@/lib/accounts-data';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/utils/currency';
import {
  Download, CheckCircle, FileText, AlertTriangle,
  Clock, IndianRupee, Loader2
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from '@/components/ui/select';
import { generateInvoicePDF } from '@/utils/pdf-utils';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import TechnoladdersLogo from '../../../public/hrumbles_logo2.png';

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
  const { exportInvoice } = useAccountsStore();
  const [isExporting, setIsExporting] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return <CheckCircle className="h-3 w-3 text-success" />;
      case 'unpaid':
        return <Clock className="h-3 w-3 text-warning" />;
      case 'overdue':
        return <AlertTriangle className="h-3 w-3 text-danger" />;
      case 'draft':
        return <FileText className="h-3 w-3 text-gray-500" />;
      default:
        return null;
    }
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
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Invoice-${invoice.invoiceNumber}-${invoice.invoiceDate.replace(/\s+/g, '-')}.pdf`);
      toast.success('Invoice PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      <div className="mb-6 flex justify-between items-center">
        <Button
          variant="ghost"
          onClick={onClose}
          className="mb-2 text-sm"
        >
          <span className="mr-1">←</span>
          Back to Invoices
        </Button>
        <div className={`flex items-center gap-1 px-2 py-1 rounded ${
            invoice.status === 'Paid' ? 'bg-green-100' :
            invoice.status === 'Unpaid' ? 'bg-yellow-100' :
            invoice.status === 'Overdue' ? 'bg-red-100' :
            'bg-gray-50'
          }`}>
            {getStatusIcon(invoice.status)}
            <span
              className={`text-sm font-semibold ${
                invoice.status === 'Paid' ? 'text-success-dark' :
                invoice.status === 'Unpaid' ? 'text-warning-dark' :
                invoice.status === 'Overdue' ? 'text-danger-dark' :
                'text-gray-500'
              }`}
            >
              {invoice.status}
            </span>
          </div>

        <div className="flex gap-1">
          

          <Select
            value={invoice.status}
            onValueChange={(value) => onStatusChange(invoice.id, value as InvoiceStatus)}
          >
            <SelectTrigger className="w-[150px] text-sm">
              <SelectValue placeholder="Change status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Paid">Mark as Paid</SelectItem>
              <SelectItem value="Unpaid">Mark as Unpaid</SelectItem>
              <SelectItem value="Overdue">Mark as Overdue</SelectItem>
              <SelectItem value="Draft">Mark as Draft</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => handleExport('csv')}
            disabled={isExporting}
            className="text-sm py-1 px-2"
          >
            <FileText className="h-3 w-3 mr-1" />
            Export CSV
          </Button>
          <Button
            onClick={() => handleExport('pdf')}
            disabled={isExporting}
            className="text-sm py-1 px-2"
          >
            {isExporting ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Download className="h-3 w-3 mr-1" />
            )}
            Download PDF
          </Button>
        </div>
      </div>

      {/* Invoice document styled to match PayslipView */}
      <div ref={invoiceRef} className="bg-white border rounded-lg shadow-sm p-8 print:shadow-none print:border-none">
        {/* Company Header with Logo and Details */}
        <div className="flex items-start justify-between border-b pb-6 mb-6">
          <div className="flex gap-4">
            <div className="w-20 h-14 flex-shrink-0 pt-7">
              <img src={TechnoladdersLogo} alt="Company Logo" className="w-full" />
            </div>
            <div className="max-w-md">
  <h1 className="text-xl font-bold">Technoladders Solutions Private Limited</h1>
  <p className="text-sm text-gray-600 whitespace-normal break-words">
    Tidel Park, 1st Floor D Block, Module 115, D North Block, 1st Floor, No.4 Rajiv Gandhi Salai, Taramani Chennai Tamil Nadu 600113 India.
  </p>
</div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Invoice</p>
            <h2 className="text-1xl font-bold">#{invoice.invoiceNumber}</h2>
            <p className="text-sm text-gray-600 mt-1">Issued on: {invoice.invoiceDate}</p>
            <p className="text-sm text-gray-600">Due on: {invoice.dueDate}</p>
            {invoice.status === 'Paid' && invoice.paymentDate && (
              <p className="text-sm text-gray-600">Paid on: {invoice.paymentDate}</p>
            )}
          </div>
        </div>

        {/* Invoice Summary */}
        <h2 className="text-gray-700 font-bold mb-4 uppercase">INVOICE SUMMARY</h2>
        <div className="flex mb-6">
          <div className="w-2/3 pr-4">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-x-2 gap-y-3">
              <div className="text-gray-600">Client Name</div>
              <div className="text-center">:</div>
              <div>{invoice.clientName}</div>

              <div className="text-gray-600">Invoice Number</div>
              <div className="text-center">:</div>
              <div>#{invoice.invoiceNumber}</div>

              <div className="text-gray-600">Issue Date</div>
              <div className="text-center">:</div>
              <div>{invoice.invoiceDate}</div>

              <div className="text-gray-600">Due Date</div>
              <div className="text-center">:</div>
              <div>{invoice.dueDate}</div>

              {invoice.status === 'Paid' && invoice.paymentDate && (
                <>
                  <div className="text-gray-600">Payment Date</div>
                  <div className="text-center">:</div>
                  <div>{invoice.paymentDate}</div>
                </>
              )}
            </div>
          </div>

          <div className="w-1/3">
            <div className="h-full border rounded-lg bg-green-50 flex flex-col items-center justify-center p-6">
              <p className="text-4xl font-bold text-gray-800">
                {formatINR(invoice.totalAmount).replace('₹', '')}
              </p>
              <p className="text-sm text-gray-600 mt-1">Invoice Total</p>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6 border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-3 w-1/2 uppercase font-bold">DESCRIPTION</th>
                <th className="text-right p-3 w-1/6 uppercase font-bold">QUANTITY</th>
                <th className="text-right p-3 w-1/6 uppercase font-bold">RATE</th>
                <th className="text-right p-3 w-1/6 uppercase font-bold">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3">{item.description}</td>
                  <td className="p-3 text-right font-mono">{item.quantity}</td>
                  <td className="p-3 text-right font-mono">
                    {formatINR(item.rate).replace('₹', '₹')}
                  </td>
                  <td className="p-3 text-right font-mono">
                    {formatINR(item.amount).replace('₹', '₹')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="border rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-bold uppercase text-lg">TOTAL AMOUNT</div>
              <div className="text-sm text-gray-600">Subtotal + Tax</div>
            </div>
            <div className="text-right bg-green-50 p-4 rounded">
              <div className="font-bold text-2xl">{formatINR(invoice.totalAmount).replace('₹', '₹')}</div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between">
              <span className="font-medium">Subtotal:</span>
              <span className="font-mono">{formatINR(invoice.subtotal || 0).replace('₹', '₹')}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Tax ({invoice.taxRate || 0}%):</span>
              <span className="font-mono">{formatINR(invoice.taxAmount || 0).replace('₹', '₹')}</span>
            </div>
            {invoice.status === 'Paid' && (
              <div className="flex justify-between">
                <span className="font-medium">Paid Amount:</span>
                <span className="font-mono">{formatINR(invoice.paidAmount || invoice.totalAmount).replace('₹', '₹')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Notes and Terms */}
        {(invoice.notes || invoice.terms) && (
          <div className="mb-6 text-sm">
            {invoice.notes && (
              <div className="mb-2">
                <span className="text-gray-600">Notes: </span>
                <span className="font-medium">{invoice.notes}</span>
              </div>
            )}
            {invoice.terms && (
              <div>
                <span className="text-gray-600">Terms & Conditions: </span>
                <span className="font-medium">{invoice.terms}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 mt-10 pt-4 border-t">
          <p>-- This is a system-generated document. --</p>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetails;