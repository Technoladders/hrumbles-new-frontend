import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Printer, Share2 } from 'lucide-react';
import { PayslipData } from '@/utils/payslip-extractor';
import { formatINR } from '@/utils/currency';
import { numberToWords } from '@/utils/file-utils';
import { toast } from 'sonner';
import TechnoladdersLogo from '../../../public/hrumbles_logo2.png';

interface ExtendedPayslipData extends PayslipData {
  bankAccountNo?: string;
  uan?: string;
  basicSalaryYTD?: number;
  houseRentAllowanceYTD?: number;
  conveyanceAllowanceYTD?: number;
  medicalAllowanceYTD?: number;
  specialAllowanceYTD?: number;
  totalEarningsYTD?: number;
  providentFundYTD?: number;
  professionalTaxYTD?: number;
  incomeTaxYTD?: number;
  loanDeductionYTD?: number;
  totalDeductionsYTD?: number;
  customEarningsYTD?: { name: string; amount: number; ytd: number }[];
  customDeductionsYTD?: { name: string; amount: number; ytd: number }[];
}

interface PayslipViewerProps {
  paymentId: string;
  payslipData: ExtendedPayslipData;
}

const PayslipViewer: React.FC<PayslipViewerProps> = ({ payslipData }) => {
  const handleDownload = () => {
    toast.success('Payslip downloaded successfully');
  };
  
  const handlePrint = () => {
    window.print();
    toast.success('Sending to printer...');
  };
  
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Payslip - ${payslipData.employeeName}`,
        text: `Payslip for ${payslipData.payPeriod}`,
      })
      .then(() => toast.success('Payslip shared'))
      .catch(() => toast.error('Failed to share'));
    } else {
      toast.info('Sharing not supported on this device');
    }
  };

  return (
    <Card className="shadow-md max-h-[80vh] overflow-y-auto">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
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
            <p className="text-sm font-semibold">
              Payslip For the Month {payslipData.payPeriod}
            </p>
            <div className="flex justify-end gap-1 mt-2">
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download className="h-3 w-3 mr-1" />
                <span className="text-xs">Download</span>
              </Button>
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="h-3 w-3 mr-1" />
                <span className="text-xs">Print</span>
              </Button>
              <Button size="sm" variant="outline" onClick={handleShare}>
                <Share2 className="h-3 w-3 mr-1" />
                <span className="text-xs">Share</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Employee Summary */}
        <div className="mb-6 pb-6 border-b">
          <div className="flex justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg mb-4">Employee Summary</h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Employee Name</p>
                  <p className="font-medium">{payslipData.employeeName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Designation</p>
                  <p className="font-medium">{payslipData.designation || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Employee ID</p>
                  <p className="font-medium">{payslipData.employeeId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date of Joining</p>
                  <p className="font-medium">{payslipData.dateOfJoining || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pay Period</p>
                  <p className="font-medium">{payslipData.payPeriod || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pay Date</p>
                  <p className="font-medium">{payslipData.payDate || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Paid Days</p>
                  <p className="font-medium">{payslipData.paidDays || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">LOP Days</p>
                  <p className="font-medium">{payslipData.lopDays || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Bank Account No</p>
                  <p className="font-medium">{payslipData.bankAccountNo || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">UAN</p>
                  <p className="font-medium">{payslipData.uan || 'N/A'}</p>
                </div>
              </div>
            </div>
            <div className="ml-4">
              <div className="bg-green-100 text-green-800 font-semibold text-sm px-4 py-2 rounded">
                Total Net Pay <br />
                {formatINR(payslipData.netPayable)}
              </div>
            </div>
          </div>
        </div>

        {/* Earnings and Deductions */}
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-x-8">
            {/* Earnings */}
            <div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-sm text-left font-semibold">Earnings</th>
                    <th className="py-2 text-sm text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 text-sm">Basic</td>
                    <td className="py-2 text-right font-mono text-sm">
                      {formatINR(payslipData.basicSalary)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-sm">House Rent Allowance</td>
                    <td className="py-2 text-right font-mono text-sm">
                      {formatINR(payslipData.houseRentAllowance)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-sm">Conveyance Allowance</td>
                    <td className="py-2 text-right font-mono text-sm">
                      {formatINR(payslipData.conveyanceAllowance)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-sm">Fixed Allowance</td>
                    <td className="py-2 text-right font-mono text-sm">
                      {formatINR(payslipData.specialAllowance)}
                    </td>
                  </tr>
                  <tr className="border-t-2">
                    <td className="py-2 font-semibold text-sm">Gross Earnings</td>
                    <td className="py-2 text-right font-mono font-semibold text-sm">
                      {formatINR(payslipData.totalEarnings)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Deductions */}
            <div>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-sm text-left font-semibold">Deductions</th>
                    <th className="py-2 text-sm text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 text-sm">EPF Contribution</td>
                    <td className="py-2 text-right font-mono text-sm">
                      {formatINR(payslipData.providentFund)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-sm">Income Tax</td>
                    <td className="py-2 text-right font-mono text-sm">
                      {formatINR(payslipData.incomeTax)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 text-sm">Professional Tax</td>
                    <td className="py-2 text-right font-mono text-sm">
                      {formatINR(payslipData.professionalTax)}
                    </td>
                  </tr>
                  {payslipData.loanDeduction > 0 && (
                    <tr className="border-b">
                      <td className="py-2 text-sm">Loan Deduction</td>
                      <td className="py-2 text-right font-mono text-sm">
                        {formatINR(payslipData.loanDeduction)}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t-2">
                    <td className="py-2 font-semibold text-sm">Total Deductions</td>
                    <td className="py-2 text-right font-mono font-semibold text-sm">
                      {formatINR(payslipData.totalDeductions)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Net Payable */}
        <div className="mt-6 pt-6 border-t text-center">
          <div className="mb-2">
            <span className="font-semibold text-lg">Total Net Payable</span>
            <p className="text-sm text-muted-foreground">
              Gross Earnings - Total Deductions
            </p>
            <span className="font-mono font-bold text-lg">
              {formatINR(payslipData.netPayable)}
            </span>
          </div>
          <p className="text-sm italic">
            Amount In Words: Indian Rupee {numberToWords(payslipData.netPayable)} Only
          </p>
          {payslipData.lopDays > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Note: The earnings have been adjusted for {payslipData.lopDays} Loss of Pay days.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t text-center">
          <p className="text-xs text-muted-foreground italic">
            — This is a system-generated document. —
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PayslipViewer;