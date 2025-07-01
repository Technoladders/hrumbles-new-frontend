
import React, { useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageTransition from '@/components/ui-custom/PageTransition';
import { useFinancialStore } from '@/lib/financial-data';
import { ArrowLeft, Download, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatINR } from '@/utils/currency';
import { numberToWords, safeFormatNumber, formatIndianCurrency } from '@/utils/file-utils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { generateCSV } from '@/utils/export-utils';

const PayslipView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const payslipRef = useRef<HTMLDivElement>(null);
  const { payments } = useFinancialStore();
  const payment = payments.find(p => p.id === id);
  
  if (!payment) {
    toast.error('Payment not found');
    navigate('/');
    return null;
  }

  const handlePrint = () => {
    toast.info('Preparing document for printing...');
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleDownloadPDF = async () => {
    if (!payslipRef.current) return;
    
    toast.info(`Generating PDF for ${payment.employeeName}...`);
    
    try {
      const canvas = await html2canvas(payslipRef.current, {
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
      pdf.save(`Payslip-${payment.employeeName.replace(/\s+/g, '-')}-${payment.paymentDate.replace(/\s+/g, '-')}.pdf`);
      
      toast.success(`PDF downloaded successfully`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  const handleDownloadCSV = () => {
    try {
      const payslipData = payment.payslipData;
      const csvData = [
        ['Payslip', `${payment.employeeName} - ${payment.paymentDate}`],
        [''],
        ['Employee Details'],
        ['Employee Name', payment.employeeName],
        ['Employee ID', payment.employeeId],
        ['Designation', payslipData?.designation || 'N/A'],
        ['Date of Joining', payment.paymentDate],
        ['Pay Period', payslipData?.payPeriod || payment.paymentDate],
        ['Paid Days', payslipData?.paidDays || 30],
        ['LOP Days', payslipData?.lopDays || 0],
        [''],
        ['Earnings', 'Amount', 'YTD'],
        ['Basic', safeFormatNumber(payslipData?.basicSalary) || 0, safeFormatNumber(payslipData?.basicSalary) * 12 || 0],
        ['House Rent Allowance', safeFormatNumber(payslipData?.houseRentAllowance) || 0, safeFormatNumber(payslipData?.houseRentAllowance) * 12 || 0],
        ['Conveyance Allowance', safeFormatNumber(payslipData?.conveyanceAllowance) || 0, safeFormatNumber(payslipData?.conveyanceAllowance) * 12 || 0],
        ['Fixed Allowance', safeFormatNumber(payslipData?.fixedAllowance) || 0, safeFormatNumber(payslipData?.fixedAllowance) * 12 || 0],
        ['Total Earnings', safeFormatNumber(payslipData?.totalEarnings) || 0, safeFormatNumber(payslipData?.totalEarnings) * 12 || 0],
        [''],
        ['Deductions', 'Amount', 'YTD'],
        ['EPF Contribution', safeFormatNumber(payslipData?.providentFund) || 0, safeFormatNumber(payslipData?.providentFund) * 12 || 0],
        ['Income Tax', safeFormatNumber(payslipData?.incomeTax) || 0, safeFormatNumber(payslipData?.incomeTax) * 12 || 0],
        ['Professional Tax', safeFormatNumber(payslipData?.professionalTax) || 0, safeFormatNumber(payslipData?.professionalTax) * 12 || 0],
        ['Loan Deduction', safeFormatNumber(payslipData?.loanDeduction) || 0, safeFormatNumber(payslipData?.loanDeduction) * 12 || 0],
        ['Total Deductions', safeFormatNumber(payslipData?.totalDeductions) || 0, safeFormatNumber(payslipData?.totalDeductions) * 12 || 0],
        [''],
        ['Net Pay', safeFormatNumber(payslipData?.netPayable) || payment.paymentAmount],
      ];
      
      if (payslipData?.customEarnings && payslipData.customEarnings.length > 0) {
        payslipData.customEarnings.forEach(item => {
          csvData.splice(17, 0, [item.name, safeFormatNumber(item.amount), safeFormatNumber(item.amount) * 12]);
        });
      }
      
      if (payslipData?.customDeductions && payslipData.customDeductions.length > 0) {
        payslipData.customDeductions.forEach(item => {
          csvData.splice(-3, 0, [item.name, safeFormatNumber(item.amount), safeFormatNumber(item.amount) * 12]);
        });
      }
      
      generateCSV(csvData, `Payslip-${payment.employeeName.replace(/\s+/g, '-')}-${payment.paymentDate.replace(/\s+/g, '-')}`);
      toast.success(`CSV downloaded successfully`);
    } catch (error) {
      console.error('Error generating CSV:', error);
      toast.error('Failed to generate CSV. Please try again.');
    }
  };
  
  const payslipData = payment.payslipData;
  
  // Format payslip period to match reference image
  const payPeriod = payslipData?.payPeriod || payment.paymentDate;
  
  // Calculate net pay safely
  const netPay = safeFormatNumber(payslipData?.netPayable) || payment.paymentAmount;
  
  // Convert amount to words safely
  const amountInWords = numberToWords(netPay);
  
  return (
    <PageTransition className="max-w-[1200px] mx-auto p-6">
      <div className="mb-6 flex justify-between items-center">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" onClick={handleDownloadCSV}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF}>
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button onClick={() => navigate(`/payroll/${id}/edit`)}>
            Edit Payslip
          </Button>
        </div>
      </div>
      
      {/* Payslip document styled to match reference image */}
      <div ref={payslipRef} className="bg-white border rounded-lg shadow-sm p-8 print:shadow-none print:border-none">
        {/* Company Header with Logo and Details */}
        <div className="flex items-start justify-between border-b pb-6 mb-6">
          <div className="flex gap-4">
            <div className="w-12 h-12 flex-shrink-0">
              <img src="/lovable-uploads/3c90e66e-ce59-437f-a47e-119a5c2b16db.png" alt="Company Logo" className="w-full" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Technoladders Solutions Private Limited</h1>
              <p className="text-sm text-gray-600">
                Tidel Park, 1st Floor D Block, Module 115, D North Block, 1st Floor, No.4
                <br />
                Rajiv Gandhi Salai, Taramani Chennai Tamil Nadu 600113 India
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Payslip For the Month</p>
            <h2 className="text-xl font-bold">{payPeriod}</h2>
          </div>
        </div>

        {/* Employee Summary */}
        <h2 className="text-gray-700 font-bold mb-4 uppercase">EMPLOYEE SUMMARY</h2>
        <div className="flex mb-6">
          <div className="w-2/3 pr-4">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-x-2 gap-y-3">
              <div className="text-gray-600">Employee Name</div>
              <div className="text-center">:</div>
              <div>{payment.employeeName}</div>
              
              {/* <div className="text-gray-600">Designation</div> */}
              <div className="text-center">:</div>
              <div>{payslipData?.designation || "N/A"}</div>
              
              <div className="text-gray-600">Employee ID</div>
              <div className="text-center">:</div>
              <div>{payment.employeeId}</div>
              
              <div className="text-gray-600">Date of Joining</div>
              <div className="text-center">:</div>
              <div>{payslipData?.dateOfJoining || payment.paymentDate}</div>
              
              <div className="text-gray-600">Pay Period</div>
              <div className="text-center">:</div>
              <div>{payPeriod}</div>
              
              <div className="text-gray-600">Pay Date</div>
              <div className="text-center">:</div>
              <div>{payment.paymentDate}</div>
            </div>
          </div>
          
          <div className="w-1/3">
            <div className="h-full border rounded-lg bg-green-50 flex flex-col items-center justify-center p-6">
              <p className="text-4xl font-bold text-gray-800">
                ₹{formatIndianCurrency(netPay).replace('₹', '')}
              </p>
              <p className="text-sm text-gray-600 mt-1">Employee Net Pay</p>
              
              <div className="w-full mt-6 grid grid-cols-[1fr_auto_auto] gap-x-2">
                <div className="text-gray-600">Paid Days</div>
                <div>:</div>
                <div>{safeFormatNumber(payslipData?.paidDays) || 30}</div>
                
                <div className="text-gray-600">LOP Days</div>
                <div>:</div>
                <div className="bg-green-100 px-2">{safeFormatNumber(payslipData?.lopDays) || 0}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="mb-6 grid grid-cols-2 gap-4 border-b pb-4">
          <div className="grid grid-cols-[auto_auto_1fr] gap-2">
            <div className="text-gray-600">Bank Account No</div>
            <div>:</div>
            <div>{payment.id}123456789</div>
          </div>
          
          <div className="grid grid-cols-[auto_auto_1fr] gap-2">
            <div className="text-gray-600">UAN</div>
            <div>:</div>
            <div>100{payment.id}6562961</div>
          </div>
        </div>

        {/* Earnings & Deductions Table */}
        <div className="mb-6 border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-3 w-1/3 uppercase font-bold">EARNINGS</th>
                <th className="text-right p-3 w-1/6 uppercase font-bold">AMOUNT</th>
                <th className="text-right p-3 w-1/6 uppercase font-bold">YTD</th>
                <th className="text-left p-3 w-1/3 uppercase font-bold">DEDUCTIONS</th>
                <th className="text-right p-3 w-1/6 uppercase font-bold">AMOUNT</th>
                <th className="text-right p-3 w-1/6 uppercase font-bold">YTD</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="p-3">Basic</td>
                <td className="p-3 text-right font-mono">
                  {formatIndianCurrency(safeFormatNumber(payslipData?.basicSalary)).replace('₹', '₹')}
                </td>
                <td className="p-3 text-right text-gray-500 font-mono">
                  {formatIndianCurrency(safeFormatNumber(payslipData?.basicSalary) * 12).replace('₹', '₹')}
                </td>
                <td className="p-3 border-l">EPF Contribution</td>
                <td className="p-3 text-right font-mono">
                  {formatIndianCurrency(safeFormatNumber(payslipData?.providentFund)).replace('₹', '₹')}
                </td>
                <td className="p-3 text-right text-gray-500 font-mono">
                  {formatIndianCurrency(safeFormatNumber(payslipData?.providentFund) * 12).replace('₹', '₹')}
                </td>
              </tr>
              
              <tr className="border-t">
                <td className="p-3">House Rent Allowance</td>
                <td className="p-3 text-right font-mono">
                  {formatIndianCurrency(safeFormatNumber(payslipData?.houseRentAllowance)).replace('₹', '₹')}
                </td>
                <td className="p-3 text-right text-gray-500 font-mono">
                  {formatIndianCurrency(safeFormatNumber(payslipData?.houseRentAllowance) * 12).replace('₹', '₹')}
                </td>
                <td className="p-3 border-l">Income Tax</td>
                <td className="p-3 text-right font-mono">
                  {formatIndianCurrency(safeFormatNumber(payslipData?.incomeTax)).replace('₹', '₹')}
                </td>
                <td className="p-3 text-right text-gray-500 font-mono">
                  {formatIndianCurrency(safeFormatNumber(payslipData?.incomeTax) * 12).replace('₹', '₹')}
                </td>
              </tr>
              
              <tr className="border-t">
                <td className="p-3">Conveyance Allowance</td>
                <td className="p-3 text-right font-mono">
                  {formatIndianCurrency(safeFormatNumber(payslipData?.conveyanceAllowance)).replace('₹', '₹')}
                </td>
                <td className="p-3 text-right text-gray-500 font-mono">
                  {formatIndianCurrency(safeFormatNumber(payslipData?.conveyanceAllowance) * 12).replace('₹', '₹')}
                </td>
                <td className="p-3 border-l">Professional Tax</td>
                <td className="p-3 text-right font-mono">
                  {formatIndianCurrency(safeFormatNumber(payslipData?.professionalTax)).replace('₹', '₹')}
                </td>
                <td className="p-3 text-right text-gray-500 font-mono">
                  {formatIndianCurrency(safeFormatNumber(payslipData?.professionalTax) * 12).replace('₹', '₹')}
                </td>
              </tr>
              
              <tr className="border-t">
                <td className="p-3">Fixed Allowance</td>
                <td className="p-3 text-right font-mono">
                  {formatIndianCurrency(safeFormatNumber(payslipData?.fixedAllowance)).replace('₹', '₹')}
                </td>
                <td className="p-3 text-right text-gray-500 font-mono">
                  {formatIndianCurrency(safeFormatNumber(payslipData?.fixedAllowance) * 12).replace('₹', '₹')}
                </td>
                <td className="p-3 border-l"></td>
                <td className="p-3"></td>
                <td className="p-3"></td>
              </tr>
              
              {/* Custom earnings */}
              {payslipData?.customEarnings && payslipData.customEarnings.length > 0 && 
                payslipData.customEarnings.map((item, index) => (
                  <tr key={`earning-${index}`} className="border-t">
                    <td className="p-3">{item.name}</td>
                    <td className="p-3 text-right font-mono">
                      {formatIndianCurrency(safeFormatNumber(item.amount)).replace('₹', '₹')}
                    </td>
                    <td className="p-3 text-right text-gray-500 font-mono">
                      {formatIndianCurrency(safeFormatNumber(item.amount) * 12).replace('₹', '₹')}
                    </td>
                    <td className="p-3 border-l">
                      {payslipData?.customDeductions && payslipData.customDeductions[index] ? 
                        payslipData.customDeductions[index].name : ""}
                    </td>
                    <td className="p-3 text-right font-mono">
                      {payslipData?.customDeductions && payslipData.customDeductions[index] ? 
                        formatIndianCurrency(safeFormatNumber(payslipData.customDeductions[index].amount)).replace('₹', '₹') : ""}
                    </td>
                    <td className="p-3 text-right text-gray-500 font-mono">
                      {payslipData?.customDeductions && payslipData.customDeductions[index] ? 
                        formatIndianCurrency(safeFormatNumber(payslipData.customDeductions[index].amount) * 12).replace('₹', '₹') : ""}
                    </td>
                  </tr>
                ))
              }
              
              {/* Totals */}
              <tr className="border-t bg-gray-50 font-bold">
                <td className="p-3">Gross Earnings</td>
                <td className="p-3 text-right font-mono">
                  {formatIndianCurrency(safeFormatNumber(payslipData?.totalEarnings)).replace('₹', '₹')}
                </td>
                <td className="p-3"></td>
                <td className="p-3 border-l">Total Deductions</td>
                <td className="p-3 text-right font-mono">
                  {formatIndianCurrency(safeFormatNumber(payslipData?.totalDeductions)).replace('₹', '₹')}
                </td>
                <td className="p-3"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Net Pay */}
        <div className="border rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-bold uppercase text-lg">TOTAL NET PAYABLE</div>
              <div className="text-sm text-gray-600">Gross Earnings - Total Deductions</div>
            </div>
            <div className="text-right bg-green-50 p-4 rounded">
              <div className="font-bold text-2xl">{formatIndianCurrency(netPay).replace('₹', '₹')}</div>
            </div>
          </div>
        </div>
        
        {/* Amount in Words */}
        <div className="mb-6 text-sm">
          <span className="text-gray-600">Amount In Words : </span>
          <span className="font-medium">{amountInWords}</span>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 mt-10 pt-4 border-t">
          <p>-- This is a system-generated document. --</p>
        </div>
      </div>
    </PageTransition>
  );
};

export default PayslipView;
