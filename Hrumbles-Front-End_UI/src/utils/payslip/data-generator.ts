
/**
 * Utilities for generating payslip data
 */
import { PayslipData } from './types';

/**
 * Creates simulated payslip data based on file type
 */
export function createSimulatedPayslipData(fileType: string): PayslipData {
  const basicPay = fileType.includes('pdf') 
    ? 45000 
    : fileType.includes('image')
      ? 47500
      : 46000;
      
  const hra = basicPay * 0.4;
  const conveyance = basicPay * 0.1; // Set to 10% of basic pay
  const fixed = basicPay - (hra + conveyance);
  
  const totalEarnings = basicPay + hra + conveyance + fixed;
  
  const pf = basicPay * 0.12;
  const professionalTax = 200;
  const incomeTax = totalEarnings * 0.05;
  const loanDeduction = fileType.includes('pdf') ? 2000 : 0;
  
  const totalDeductions = pf + professionalTax + incomeTax + loanDeduction;
  const netPayable = totalEarnings - totalDeductions;
  
  return {
    employeeId: `EMP-${Math.floor(100000 + Math.random() * 900000)}`,
    employeeName: 'Sample Employee',
    designation: 'Software Developer',
    payPeriod: new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    basicSalary: basicPay,
    houseRentAllowance: hra,
    conveyanceAllowance: conveyance,
    fixedAllowance: fixed,
    totalEarnings: totalEarnings,
    providentFund: pf,
    professionalTax: professionalTax,
    incomeTax: incomeTax,
    loanDeduction: loanDeduction,
    totalDeductions: totalDeductions,
    netPayable: netPayable,
    paidDays: 30, 
    lopDays: 0,
    customEarnings: [],
    customDeductions: []
  };
}

/**
 * Creates payslip data by merging parsed data with default values
 */
export function createPayslipData(parsedData: Record<string, any>): PayslipData {
  // Start with default values
  const defaultData = createSimulatedPayslipData('image');
  
  // Create a new object to store the result
  const result: PayslipData = { ...defaultData };
  
  // Safely merge string values
  if (typeof parsedData.employeeId === 'string') result.employeeId = parsedData.employeeId;
  if (typeof parsedData.employeeName === 'string') result.employeeName = parsedData.employeeName;
  if (typeof parsedData.designation === 'string') result.designation = parsedData.designation;
  if (typeof parsedData.payPeriod === 'string') result.payPeriod = parsedData.payPeriod;
  
  // Safely merge numeric values
  if (typeof parsedData.basicSalary === 'number' && !isNaN(parsedData.basicSalary)) {
    result.basicSalary = parsedData.basicSalary;
  }
  if (typeof parsedData.houseRentAllowance === 'number' && !isNaN(parsedData.houseRentAllowance)) {
    result.houseRentAllowance = parsedData.houseRentAllowance;
  }
  if (typeof parsedData.conveyanceAllowance === 'number' && !isNaN(parsedData.conveyanceAllowance)) {
    result.conveyanceAllowance = parsedData.conveyanceAllowance;
  }
  if (typeof parsedData.fixedAllowance === 'number' && !isNaN(parsedData.fixedAllowance)) {
    result.fixedAllowance = parsedData.fixedAllowance;
  }
  // Handle backward compatibility for medical and special allowances
  if (typeof parsedData.medicalAllowance === 'number' && !isNaN(parsedData.medicalAllowance)) {
    result.medicalAllowance = parsedData.medicalAllowance;
    
    // If we have medical allowance, add it as a custom earning as well
    if (!result.customEarnings) result.customEarnings = [];
    result.customEarnings.push({
      name: 'Medical Allowance',
      amount: parsedData.medicalAllowance
    });
  }
  if (typeof parsedData.specialAllowance === 'number' && !isNaN(parsedData.specialAllowance)) {
    result.specialAllowance = parsedData.specialAllowance;
    
    // If we have special allowance, add it as a custom earning as well
    if (!result.customEarnings) result.customEarnings = [];
    result.customEarnings.push({
      name: 'Special Allowance',
      amount: parsedData.specialAllowance
    });
  }
  if (typeof parsedData.totalEarnings === 'number' && !isNaN(parsedData.totalEarnings)) {
    result.totalEarnings = parsedData.totalEarnings;
  }
  if (typeof parsedData.providentFund === 'number' && !isNaN(parsedData.providentFund)) {
    result.providentFund = parsedData.providentFund;
  }
  if (typeof parsedData.professionalTax === 'number' && !isNaN(parsedData.professionalTax)) {
    result.professionalTax = parsedData.professionalTax;
  }
  if (typeof parsedData.incomeTax === 'number' && !isNaN(parsedData.incomeTax)) {
    result.incomeTax = parsedData.incomeTax;
  }
  if (typeof parsedData.loanDeduction === 'number' && !isNaN(parsedData.loanDeduction)) {
    result.loanDeduction = parsedData.loanDeduction;
  }
  if (typeof parsedData.totalDeductions === 'number' && !isNaN(parsedData.totalDeductions)) {
    result.totalDeductions = parsedData.totalDeductions;
  }
  if (typeof parsedData.netPayable === 'number' && !isNaN(parsedData.netPayable)) {
    result.netPayable = parsedData.netPayable;
  }
  if (typeof parsedData.paidDays === 'number' && !isNaN(parsedData.paidDays)) {
    result.paidDays = parsedData.paidDays;
  }
  if (typeof parsedData.lopDays === 'number' && !isNaN(parsedData.lopDays)) {
    result.lopDays = parsedData.lopDays;
  }
  
  // Apply LOP deduction proportionally across ONLY standard salary components if lopDays > 0
  if (result.lopDays > 0 && result.paidDays > 0) {
    // Calculate the original values (before LOP deduction)
    const originalBasicSalary = result.basicSalary;
    const originalHRA = result.houseRentAllowance;
    const originalConveyance = result.conveyanceAllowance;
    const originalFixed = result.fixedAllowance;
    
    // Calculate total original standard earnings (excluding custom earnings)
    const originalStandardEarnings = originalBasicSalary + originalHRA + 
                                  originalConveyance + originalFixed;
    
    // Calculate per day salary based on the total working days
    const totalWorkingDays = result.paidDays + result.lopDays;
    const perDaySalary = originalStandardEarnings / totalWorkingDays;
    
    // Calculate total LOP deduction
    const totalLopDeduction = perDaySalary * result.lopDays;
    
    // Calculate proportion of each component to total standard earnings
    const basicProportion = originalBasicSalary / originalStandardEarnings;
    const hraProportion = originalHRA / originalStandardEarnings;
    const conveyanceProportion = originalConveyance / originalStandardEarnings;
    const fixedProportion = originalFixed / originalStandardEarnings;
    
    // Apply proportional deductions to each standard component
    result.basicSalary = originalBasicSalary - (totalLopDeduction * basicProportion);
    result.houseRentAllowance = originalHRA - (totalLopDeduction * hraProportion);
    result.conveyanceAllowance = originalConveyance - (totalLopDeduction * conveyanceProportion);
    result.fixedAllowance = originalFixed - (totalLopDeduction * fixedProportion);
    
    // Calculate custom earnings total (not affected by LOP)
    const customEarningsTotal = result.customEarnings?.reduce((sum, item) => sum + item.amount, 0) || 0;
    
    // Update total earnings after LOP deduction (standard earnings + custom earnings)
    result.totalEarnings = result.basicSalary + result.houseRentAllowance + 
                          result.conveyanceAllowance + result.fixedAllowance + customEarningsTotal;
  } else {
    // If totalEarnings is not provided in parsed data, calculate it
    if (!parsedData.totalEarnings) {
      // Calculate standard earnings
      const standardEarnings = result.basicSalary + 
                             result.houseRentAllowance + 
                             result.conveyanceAllowance + 
                             result.fixedAllowance;
                            
      // Add custom earnings to total earnings if any
      const customEarningsTotal = result.customEarnings?.reduce((sum, item) => sum + item.amount, 0) || 0;
      
      // Set total earnings
      result.totalEarnings = standardEarnings + customEarningsTotal;
    }
  }
  
  // If totalDeductions is not provided in parsed data, calculate it
  if (!parsedData.totalDeductions) {
    // Calculate standard deductions
    const standardDeductions = result.providentFund + 
                             result.professionalTax + 
                             result.incomeTax + 
                             result.loanDeduction;
                            
    // Add custom deductions to total deductions if any
    const customDeductionsTotal = result.customDeductions?.reduce((sum, item) => sum + item.amount, 0) || 0;
    
    // Set total deductions
    result.totalDeductions = standardDeductions + customDeductionsTotal;
  }
  
  // If netPayable is not provided in parsed data, calculate it
  if (!parsedData.netPayable) {
    result.netPayable = result.totalEarnings - result.totalDeductions;
  }
  
  return result;
}
