
import React from 'react';
import { formatINR } from '@/utils/currency';
import { Payment } from '@/lib/financial-data';
import { format } from 'date-fns';

interface PayslipViewerComponentProps {
  payment: Payment;
}

const PayslipViewerComponent: React.FC<PayslipViewerComponentProps> = ({ payment }) => {
  if (!payment.payslipData) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">No payslip data available for this payment.</p>
      </div>
    );
  }

  const {
    employeeId,
    employeeName,
    designation,
    payPeriod,
    basicSalary,
    houseRentAllowance,
    conveyanceAllowance,
    medicalAllowance,
    specialAllowance,
    totalEarnings,
    providentFund,
    professionalTax,
    incomeTax,
    loanDeduction,
    totalDeductions,
    netPayable
  } = payment.payslipData;

  const currentDate = format(new Date(), 'dd MMM yyyy');

  return (
    <div className="bg-white p-6 rounded-lg">
      {/* Header */}
      <div className="border-b pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">PAYSLIP</h1>
            <p className="text-gray-500">For the period: {payPeriod}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold">Date: {currentDate}</p>
            <p className="text-gray-500">Ref: PAY-{employeeId}-{payPeriod?.replace(/\s/g, '')}</p>
          </div>
        </div>
      </div>

      {/* Employee Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 border-b pb-4">
        <div>
          <h2 className="text-lg font-semibold mb-2 text-gray-800">Employee Details</h2>
          <div className="grid grid-cols-2 gap-2">
            <p className="text-gray-600">Name:</p>
            <p className="font-medium">{employeeName}</p>
            
            <p className="text-gray-600">Employee ID:</p>
            <p className="font-medium">{employeeId}</p>
            
            <p className="text-gray-600">Designation:</p>
            <p className="font-medium">{designation}</p>
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-2 text-gray-800">Payment Details</h2>
          <div className="grid grid-cols-2 gap-2">
            <p className="text-gray-600">Pay Period:</p>
            <p className="font-medium">{payPeriod}</p>
            
            <p className="text-gray-600">Payment Date:</p>
            <p className="font-medium">{payment.paymentDate}</p>
            
            <p className="text-gray-600">Payment Status:</p>
            <p className={`font-medium ${payment.status === 'Success' ? 'text-green-600' : 'text-amber-600'}`}>
              {payment.status}
            </p>
          </div>
        </div>
      </div>

      {/* Earnings & Deductions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h2 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-2">Earnings</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Basic Salary</span>
              <span className="font-mono">{formatINR(basicSalary)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">House Rent Allowance</span>
              <span className="font-mono">{formatINR(houseRentAllowance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Conveyance Allowance</span>
              <span className="font-mono">{formatINR(conveyanceAllowance)}</span>
            </div>
            {medicalAllowance > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Medical Allowance</span>
                <span className="font-mono">{formatINR(medicalAllowance)}</span>
              </div>
            )}
            {specialAllowance > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Special Allowance</span>
                <span className="font-mono">{formatINR(specialAllowance)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t pt-2 mt-2">
              <span>Total Earnings</span>
              <span className="font-mono">{formatINR(totalEarnings)}</span>
            </div>
          </div>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-3 text-gray-800 border-b pb-2">Deductions</h2>
          <div className="space-y-2">
            {providentFund > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Provident Fund</span>
                <span className="font-mono">{formatINR(providentFund)}</span>
              </div>
            )}
            {professionalTax > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Professional Tax</span>
                <span className="font-mono">{formatINR(professionalTax)}</span>
              </div>
            )}
            {incomeTax > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Income Tax</span>
                <span className="font-mono">{formatINR(incomeTax)}</span>
              </div>
            )}
            {loanDeduction > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Loan Deduction</span>
                <span className="font-mono">{formatINR(loanDeduction)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold border-t pt-2 mt-2">
              <span>Total Deductions</span>
              <span className="font-mono">{formatINR(totalDeductions)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Net Pay */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-xl font-bold text-blue-800">Net Payable</span>
          <span className="text-xl font-bold font-mono text-blue-800">{formatINR(netPayable)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t text-sm text-gray-500">
        <p>Payment Mode: Direct Bank Transfer</p>
        <p className="mt-2">This is a computer-generated payslip and does not require a signature.</p>
      </div>
    </div>
  );
};

export default PayslipViewerComponent;
