import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Payment, useFinancialStore } from '@/lib/financial-data';
import { formatINR, parseCurrencyToNumber } from '@/utils/currency';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import EmployeeDetailsForm from './EmployeeDetailsForm';
import DynamicEarningsDeductions from './DynamicEarningsDeductions';
import { PayslipData } from '@/utils/payslip/types';

interface PayrollFormProps {
  payment: Payment;
}

const PayrollForm: React.FC<PayrollFormProps> = ({ payment }) => {
  const { updatePayment } = useFinancialStore();
  const [formData, setFormData] = useState({
    employeeName: payment.employeeName,
    employeeId: payment.employeeId,
    paymentDate: payment.paymentDate || new Date().toISOString().split('T')[0],
    paymentCategory: payment.paymentCategory,
    paymentAmount: payment.paymentAmount.toString(),
    status: payment.status,
  });

  // Initialize payslip data with defaults and existing data
  const defaultPayslipData: PayslipData = {
    employeeId: payment.employeeId,
    employeeName: payment.employeeName,
    designation: '',
    payPeriod: '',
    basicSalary: 0,
    houseRentAllowance: 0,
    conveyanceAllowance: 0,
    fixedAllowance: 0,
    totalEarnings: 0,
    providentFund: 0,
    professionalTax: 0,
    incomeTax: 0,
    loanDeduction: 0,
    totalDeductions: 0,
    netPayable: 0,
    paidDays: 30, // Default to 30 days
    lopDays: 0,
    customEarnings: [],
    customDeductions: []
  };

  // Extract payslip data if available or use defaults
  const [payslipFormData, setPayslipFormData] = useState<PayslipData>(
    payment.payslipData || defaultPayslipData
  );

  // Handle payslip field changes
  const handlePayslipChange = (field: string, value: any) => {
    setPayslipFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Update custom earnings
  const handleCustomEarningsChange = (items: {name: string; amount: number}[]) => {
    setPayslipFormData(prev => ({
      ...prev,
      customEarnings: items
    }));
  };

  // Update custom deductions
  const handleCustomDeductionsChange = (items: {name: string; amount: number}[]) => {
    setPayslipFormData(prev => ({
      ...prev,
      customDeductions: items
    }));
  };

  // Calculate totals whenever form data changes
  useEffect(() => {
    calculateTotals();
  }, [payslipFormData]);

  const calculateTotals = () => {
    try {
      // Get the original values (before any LOP adjustment)
      let basicSalary = payslipFormData.basicSalary || 0;
      let hra = payslipFormData.houseRentAllowance || 0;
      let conveyance = payslipFormData.conveyanceAllowance || 0;
      let fixed = payslipFormData.fixedAllowance || 0;
      
      // Standard deductions
      const pf = payslipFormData.providentFund || 0;
      const professionalTax = payslipFormData.professionalTax || 0;
      const incomeTax = payslipFormData.incomeTax || 0;
      const loanDeduction = payslipFormData.loanDeduction || 0;
      
      // Get paid days and LOP days
      const paidDays = payslipFormData.paidDays || 30;
      const lopDays = payslipFormData.lopDays || 0;
      
      // Sum custom earnings (NOT affected by LOP)
      const customEarningsTotal = (payslipFormData.customEarnings || [])
        .reduce((sum, item) => sum + (item.amount || 0), 0);
      
      // Original standard earnings before LOP adjustment (excluding custom earnings)
      const originalStandardEarnings = basicSalary + hra + conveyance + fixed;
      
      // Apply LOP deduction proportionally if there are LOP days to the standard earnings ONLY
      if (lopDays > 0 && paidDays > 0 && originalStandardEarnings > 0) {
        // Calculate total working days
        const totalWorkingDays = paidDays + lopDays;
        
        // Calculate per day salary for standard earnings only
        const perDaySalary = originalStandardEarnings / totalWorkingDays;
        
        // Calculate total LOP deduction
        const totalLopDeduction = perDaySalary * lopDays;
        
        // Calculate proportion of each standard component to total standard earnings
        const basicSalaryProportion = basicSalary / originalStandardEarnings;
        const hraProportion = hra / originalStandardEarnings;
        const conveyanceProportion = conveyance / originalStandardEarnings;
        const fixedProportion = fixed / originalStandardEarnings;
        
        // Apply proportional deductions to each standard component
        basicSalary -= totalLopDeduction * basicSalaryProportion;
        hra -= totalLopDeduction * hraProportion;
        conveyance -= totalLopDeduction * conveyanceProportion;
        fixed -= totalLopDeduction * fixedProportion;
        
        // Sum custom deductions
        const customDeductionsTotal = (payslipFormData.customDeductions || [])
          .reduce((sum, item) => sum + (item.amount || 0), 0);
        
        // Calculate final totals after LOP adjustment (standard + custom)
        const totalEarnings = basicSalary + hra + conveyance + fixed + customEarningsTotal;
        const totalDeductions = pf + professionalTax + incomeTax + loanDeduction + customDeductionsTotal;
        
        // Calculate net pay
        const netPayable = totalEarnings - totalDeductions;
        
        // Update the payslip form data with adjusted values
        setPayslipFormData(prev => ({
          ...prev,
          basicSalary,
          houseRentAllowance: hra,
          conveyanceAllowance: conveyance,
          fixedAllowance: fixed,
          totalEarnings,
          totalDeductions,
          netPayable
        }));
      } else {
        // Sum custom deductions
        const customDeductionsTotal = (payslipFormData.customDeductions || [])
          .reduce((sum, item) => sum + (item.amount || 0), 0);
        
        // Calculate totals without LOP adjustment
        const totalEarnings = basicSalary + hra + conveyance + fixed + customEarningsTotal;
        const totalDeductions = pf + professionalTax + incomeTax + loanDeduction + customDeductionsTotal;
        const netPayable = totalEarnings - totalDeductions;
        
        // Update the payslip form data with calculated values
        setPayslipFormData(prev => ({
          ...prev,
          totalEarnings,
          totalDeductions,
          netPayable
        }));
      }
      
      // Update payment amount based on calculated net payable
      setFormData(prev => ({
        ...prev,
        paymentAmount: payslipFormData.netPayable.toString()
      }));
    } catch (error) {
      console.error('Error calculating totals:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Prepare updated payment data
      const updatedPayment = {
        ...payment,
        employeeName: formData.employeeName,
        employeeId: formData.employeeId,
        paymentCategory: formData.paymentCategory as any,
        paymentAmount: parseFloat(formData.paymentAmount) || 0,
        status: formData.status as any,
        payslipData: payslipFormData,
        paymentDate: formData.paymentDate,
      };
      
      // Update payment in store
      updatePayment(payment.id, updatedPayment);
      
      toast.success('Payment updated successfully');
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Failed to update payment. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Payment Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="paymentCategory">Payment Category</Label>
            <Select 
              value={formData.paymentCategory} 
              onValueChange={(value) => setFormData({ ...formData, paymentCategory: value as any })}
            >
              <SelectTrigger id="paymentCategory">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Staff">Staff</SelectItem>
                <SelectItem value="Member">Member</SelectItem>
                <SelectItem value="Freelance">Freelance</SelectItem>
                <SelectItem value="Part-Time">Part-Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="status">Payment Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => setFormData({ ...formData, status: value as any })}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Success">Success</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="On Hold">On Hold</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentDate">Payment Date</Label>
            <Input
              id="paymentDate"
              type="date"
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
            />
          </div>
        </div>
      </Card>
      
      {/* Employee Details Form */}
      <EmployeeDetailsForm 
        payslipData={payslipFormData}
        onChange={handlePayslipChange}
      />
      
      {/* Standard Earnings Form */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Standard Earnings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="houseRentAllowance">House Rent Allowance</Label>
            <Input
              id="houseRentAllowance"
              type="number"
              min="0"
              step="0.01"
              value={payslipFormData.houseRentAllowance || ''}
              onChange={(e) => handlePayslipChange('houseRentAllowance', parseFloat(e.target.value) || 0)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="conveyanceAllowance">Conveyance Allowance (10% of Basic)</Label>
            <Input
              id="conveyanceAllowance"
              type="number"
              min="0"
              step="0.01"
              value={payslipFormData.conveyanceAllowance || ''}
              onChange={(e) => handlePayslipChange('conveyanceAllowance', parseFloat(e.target.value) || 0)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="fixedAllowance">Fixed Allowance</Label>
            <Input
              id="fixedAllowance"
              type="number"
              min="0"
              step="0.01"
              value={payslipFormData.fixedAllowance || ''}
              onChange={(e) => handlePayslipChange('fixedAllowance', parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
      </Card>
      
      {/* Custom Earnings */}
      <DynamicEarningsDeductions
        title="Custom Earnings"
        items={payslipFormData.customEarnings || []}
        onChange={handleCustomEarningsChange}
        type="earnings"
      />
      
      {/* Standard Deductions Form */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Standard Deductions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="providentFund">Provident Fund</Label>
            <Input
              id="providentFund"
              type="number"
              min="0"
              step="0.01"
              value={payslipFormData.providentFund || ''}
              onChange={(e) => handlePayslipChange('providentFund', parseFloat(e.target.value) || 0)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="professionalTax">Professional Tax</Label>
            <Input
              id="professionalTax"
              type="number"
              min="0"
              step="0.01"
              value={payslipFormData.professionalTax || ''}
              onChange={(e) => handlePayslipChange('professionalTax', parseFloat(e.target.value) || 0)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="incomeTax">Income Tax</Label>
            <Input
              id="incomeTax"
              type="number"
              min="0"
              step="0.01"
              value={payslipFormData.incomeTax || ''}
              onChange={(e) => handlePayslipChange('incomeTax', parseFloat(e.target.value) || 0)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="loanDeduction">Loan Deduction</Label>
            <Input
              id="loanDeduction"
              type="number"
              min="0"
              step="0.01"
              value={payslipFormData.loanDeduction || ''}
              onChange={(e) => handlePayslipChange('loanDeduction', parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>
      </Card>
      
      {/* Custom Deductions */}
      <DynamicEarningsDeductions
        title="Custom Deductions"
        items={payslipFormData.customDeductions || []}
        onChange={handleCustomDeductionsChange}
        type="deductions"
      />
      
      {/* Payment Summary */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Payment Summary</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Earnings:</span>
            <span className="font-mono font-medium">
              {formatINR(payslipFormData.totalEarnings || 0)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Deductions:</span>
            <span className="font-mono font-medium">
              {formatINR(payslipFormData.totalDeductions || 0)}
            </span>
          </div>
          
          {/* LOP information section */}
          {payslipFormData.lopDays > 0 && (
            <div className="bg-amber-50 p-3 rounded-md border border-amber-200">
              <h3 className="text-sm font-medium text-amber-800 mb-1">Loss of Pay (LOP) Information</h3>
              <div className="text-xs text-amber-700 space-y-1">
                <div className="flex justify-between">
                  <span>Paid Days:</span>
                  <span>{payslipFormData.paidDays} days</span>
                </div>
                <div className="flex justify-between">
                  <span>LOP Days:</span>
                  <span>{payslipFormData.lopDays} days</span>
                </div>
                <p className="text-xs mt-1 border-t border-amber-200 pt-1">
                  LOP deduction is distributed proportionally across all earning components
                </p>
              </div>
            </div>
          )}
          
          <div className="flex justify-between items-center pt-4 border-t text-lg">
            <span className="font-semibold">Net Payment Amount:</span>
            <span className="font-mono font-semibold">
              {formatINR(payslipFormData.netPayable || 0)}
            </span>
          </div>
        </div>
      </Card>
      
      <div className="flex justify-end">
        <Button type="submit" className="w-full md:w-auto">
          Update Payment
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
};

export default PayrollForm;
