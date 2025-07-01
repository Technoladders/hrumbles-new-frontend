
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, RefreshCw } from 'lucide-react';
import { formatINR } from '@/utils/currency';
import type { PayslipData } from '@/utils/payslip-extractor';

interface PayslipConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractedData: PayslipData | null;
  onUpdateField: (field: keyof PayslipData, value: any) => void;
  onConfirm: () => void;
  onRetry: () => void;
  onCancel: () => void;
}

const PayslipConfirmationDialog: React.FC<PayslipConfirmationDialogProps> = ({
  open,
  onOpenChange,
  extractedData,
  onUpdateField,
  onConfirm,
  onRetry,
  onCancel,
}) => {
  if (!extractedData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm Extracted Payslip Data</DialogTitle>
          <DialogDescription>
            Please review the extracted information and make any necessary corrections.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="employeeName">Employee Name</Label>
              <Input
                id="employeeName"
                value={extractedData.employeeName}
                onChange={(e) => onUpdateField('employeeName', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input
                id="employeeId"
                value={extractedData.employeeId}
                onChange={(e) => onUpdateField('employeeId', e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                value={extractedData.designation}
                onChange={(e) => onUpdateField('designation', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="payPeriod">Pay Period</Label>
              <Input
                id="payPeriod"
                value={extractedData.payPeriod}
                onChange={(e) => onUpdateField('payPeriod', e.target.value)}
              />
            </div>
          </div>

          <h3 className="font-medium text-sm mt-4">Earnings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="basicSalary">Basic Salary</Label>
              <Input
                id="basicSalary"
                value={extractedData.basicSalary}
                onChange={(e) => onUpdateField('basicSalary', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="houseRentAllowance">House Rent Allowance</Label>
              <Input
                id="houseRentAllowance"
                value={extractedData.houseRentAllowance}
                onChange={(e) => onUpdateField('houseRentAllowance', e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="conveyanceAllowance">Conveyance Allowance</Label>
              <Input
                id="conveyanceAllowance"
                value={extractedData.conveyanceAllowance}
                onChange={(e) => onUpdateField('conveyanceAllowance', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="medicalAllowance">Medical Allowance</Label>
              <Input
                id="medicalAllowance"
                value={extractedData.medicalAllowance}
                onChange={(e) => onUpdateField('medicalAllowance', e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="specialAllowance">Special Allowance</Label>
              <Input
                id="specialAllowance"
                value={extractedData.specialAllowance}
                onChange={(e) => onUpdateField('specialAllowance', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="totalEarnings">Total Earnings</Label>
              <Input
                id="totalEarnings"
                value={extractedData.totalEarnings}
                className="font-medium"
                onChange={(e) => onUpdateField('totalEarnings', e.target.value)}
              />
            </div>
          </div>

          <h3 className="font-medium text-sm mt-4">Deductions</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="providentFund">Provident Fund</Label>
              <Input
                id="providentFund"
                value={extractedData.providentFund}
                onChange={(e) => onUpdateField('providentFund', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="professionalTax">Professional Tax</Label>
              <Input
                id="professionalTax"
                value={extractedData.professionalTax}
                onChange={(e) => onUpdateField('professionalTax', e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="incomeTax">Income Tax</Label>
              <Input
                id="incomeTax"
                value={extractedData.incomeTax}
                onChange={(e) => onUpdateField('incomeTax', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="loanDeduction">Loan Deduction</Label>
              <Input
                id="loanDeduction"
                value={extractedData.loanDeduction}
                onChange={(e) => onUpdateField('loanDeduction', e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="totalDeductions">Total Deductions</Label>
              <Input
                id="totalDeductions"
                value={extractedData.totalDeductions}
                className="font-medium"
                onChange={(e) => onUpdateField('totalDeductions', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="netPayable">Net Payable</Label>
              <Input
                id="netPayable"
                value={extractedData.netPayable}
                className="font-medium"
                onChange={(e) => onUpdateField('netPayable', e.target.value)}
              />
            </div>
          </div>
          
          <div className="pt-2">
            <p className="text-sm text-muted-foreground">
              Net Payable: <span className="font-medium">{formatINR(extractedData.netPayable)}</span>
            </p>
          </div>
        </div>
        
        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Re-Extract
          </Button>
          <Button onClick={onConfirm}>
            <Check className="mr-2 h-4 w-4" />
            Confirm & Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PayslipConfirmationDialog;
