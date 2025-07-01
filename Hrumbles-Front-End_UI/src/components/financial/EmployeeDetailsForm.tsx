
import React, { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PayslipData } from '@/utils/payslip/types';
import { formatINR } from '@/utils/currency';

interface EmployeeDetailsFormProps {
  payslipData: Partial<PayslipData>;
  onChange: (field: string, value: any) => void;
}

const EmployeeDetailsForm: React.FC<EmployeeDetailsFormProps> = ({ payslipData, onChange }) => {
  // Calculate per day salary when basic changes or paid days changes
  useEffect(() => {
    if (payslipData.basicSalary && payslipData.paidDays) {
      calculatePerDaySalary(payslipData.paidDays);
    }
  }, [payslipData.basicSalary, payslipData.paidDays]);
  
  // Update conveyance allowance when basic salary changes
  useEffect(() => {
    if (payslipData.basicSalary) {
      // Set conveyance allowance to 10% of basic salary
      const conveyanceAllowance = payslipData.basicSalary * 0.1;
      onChange('conveyanceAllowance', conveyanceAllowance);
    }
  }, [payslipData.basicSalary]);

  // Calculate per day salary when paid days changes
  const calculatePerDaySalary = (paidDays: number) => {
    if (payslipData.basicSalary && paidDays > 0) {
      // Calculate per day salary based on total earnings
      const totalEarnings = 
        (payslipData.basicSalary || 0) + 
        (payslipData.houseRentAllowance || 0) + 
        (payslipData.conveyanceAllowance || 0) + 
        (payslipData.fixedAllowance || 0);
      
      const perDaySalary = totalEarnings / paidDays;
      onChange('perDaySalary', perDaySalary);
    }
  };

  // Calculate basic salary from CTC
  const calculateBasicFromCTC = (ctc: number) => {
    if (ctc > 0) {
      // Calculate monthly salary from CTC (CTC ÷ 12)
      const monthlySalary = ctc / 12;
      // Assume basic is 40% of monthly salary (this percentage can be adjusted)
      const basicSalary = monthlySalary * 0.4;
      onChange('basicSalary', basicSalary);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Employee Details</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="employeeName">Employee Name</Label>
          <Input
            id="employeeName"
            value={payslipData.employeeName || ''}
            onChange={(e) => onChange('employeeName', e.target.value)}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="employeeId">Employee ID</Label>
          <Input
            id="employeeId"
            value={payslipData.employeeId || ''}
            onChange={(e) => onChange('employeeId', e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="designation">Designation</Label>
          <Input
            id="designation"
            value={payslipData.designation || ''}
            onChange={(e) => onChange('designation', e.target.value)}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="payPeriod">Pay Period</Label>
          <Input
            id="payPeriod"
            value={payslipData.payPeriod || ''}
            onChange={(e) => onChange('payPeriod', e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateOfJoining">Date of Joining</Label>
          <Input
            id="dateOfJoining"
            type="date"
            value={payslipData.dateOfJoining || ''}
            onChange={(e) => onChange('dateOfJoining', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="payDate">Pay Date</Label>
          <Input
            id="payDate"
            type="date"
            value={payslipData.payDate || ''}
            onChange={(e) => onChange('payDate', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ctc">CTC (Annual)</Label>
          <Input
            id="ctc"
            type="number"
            min="0"
            step="0.01"
            value={payslipData.ctc || ''}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              onChange('ctc', value);
              calculateBasicFromCTC(value);
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="basicSalary">Basic Salary (Monthly)</Label>
          <Input
            id="basicSalary"
            type="number"
            min="0"
            step="0.01"
            value={payslipData.basicSalary || ''}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              onChange('basicSalary', value);
            }}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="paidDays">Paid Days</Label>
          <Input
            id="paidDays"
            type="number"
            min="0"
            max="31"
            value={payslipData.paidDays || ''}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              onChange('paidDays', value);
            }}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="lopDays">LOP Days</Label>
          <Input
            id="lopDays"
            type="number"
            min="0"
            max={payslipData.paidDays || 31}
            value={payslipData.lopDays || ''}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              if (value > (payslipData.paidDays || 31)) {
                return; // Don't allow LOP days to exceed paid days
              }
              onChange('lopDays', value);
            }}
          />
        </div>

        {payslipData.perDaySalary ? (
          <div className="space-y-2">
            <Label>Per Day Salary</Label>
            <div className="h-10 px-3 py-2 rounded-md border bg-muted/50 flex items-center">
              {formatINR(payslipData.perDaySalary)}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
};

export default EmployeeDetailsForm;
