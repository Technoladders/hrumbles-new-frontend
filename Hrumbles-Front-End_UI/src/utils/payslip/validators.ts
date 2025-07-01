
/**
 * Validation utilities for payslip files
 */
import { PayslipData } from './types';

/**
 * Validates a file to ensure it's a PDF, DOCX, or image
 */
export function validatePayslipFile(file: File): { valid: boolean; message?: string } {
  const allowedTypes = [
    'application/pdf', 
    'image/jpeg', 
    'image/png', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      message: 'Only PDF, DOCX, JPEG, and PNG files are allowed'
    };
  }
  
  if (file.size > maxSize) {
    return {
      valid: false,
      message: 'File size should not exceed 5MB'
    };
  }
  
  return { valid: true };
}

/**
 * Detects if the payslip might be a duplicate
 * This would compare key fields with existing payslips
 */
export function detectDuplicate(payslip: PayslipData, existingPayslips: PayslipData[]): boolean {
  return existingPayslips.some(existing => 
    existing.employeeId === payslip.employeeId && 
    existing.payPeriod === payslip.payPeriod
  );
}
