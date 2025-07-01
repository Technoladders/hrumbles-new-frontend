
/**
 * Shared types for payslip handling
 */

export interface PayslipData {
  employeeId: string;
  employeeName: string;
  designation: string;
  payPeriod: string;
  basicSalary: number;
  houseRentAllowance: number;
  conveyanceAllowance: number;
  fixedAllowance: number;
  medicalAllowance?: number; // Made optional for backward compatibility
  specialAllowance?: number; // Made optional for backward compatibility
  totalEarnings: number;
  providentFund: number;
  professionalTax: number;
  incomeTax: number;
  loanDeduction: number;
  totalDeductions: number;
  netPayable: number;
  paidDays: number;
  lopDays: number;
  dateOfJoining?: string;
  payDate?: string;
  ctc?: number;
  perDaySalary?: number;
  lopDeduction?: number;
  customEarnings?: {name: string; amount: number}[];
  customDeductions?: {name: string; amount: number}[];
}
