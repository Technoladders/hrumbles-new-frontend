
import Tesseract from 'tesseract.js';

/**
 * Extract text from image using Tesseract OCR
 */
export async function extractTextFromImage(imageFile: File): Promise<string> {
  try {
    const { data: { text } } = await Tesseract.recognize(
      imageFile,
      'eng', // Language
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );
    return text;
  } catch (error) {
    console.error('Error during OCR text extraction:', error);
    throw new Error('Failed to extract text from image');
  }
}

/**
 * Parses payslip data from extracted OCR text
 * This is a simplified version and would need to be customized based on actual payslip formats
 */
export function parsePayslipFromOCRText(text: string): Record<string, any> {
  const data: Record<string, any> = {};
  
  // Extract employee ID (assuming format like "EMP-123456" or "ID: 123456")
  const empIdMatch = text.match(/\b(?:EMP|ID|Employee ID)[:\-\s]+([A-Z0-9\-]+)/i);
  if (empIdMatch) {
    data.employeeId = empIdMatch[1];
  }
  
  // Extract employee name (assuming it follows "Name:" or is at the beginning)
  const nameMatch = text.match(/\b(?:Name|Employee)[:\s]+([A-Za-z\s]+)(?:\n|,)/i);
  if (nameMatch) {
    data.employeeName = nameMatch[1].trim();
  }
  
  // Extract designation
  const designationMatch = text.match(/\b(?:Designation|Position|Title)[:\s]+([A-Za-z\s]+)(?:\n|,)/i);
  if (designationMatch) {
    data.designation = designationMatch[1].trim();
  }
  
  // Extract pay period
  const periodMatch = text.match(/\b(?:Pay Period|Period|Month)[:\s]+([A-Za-z0-9\s]+)(?:\n|,)/i);
  if (periodMatch) {
    data.payPeriod = periodMatch[1].trim();
  }
  
  // Extract basic salary
  const basicMatch = text.match(/\b(?:Basic|Basic Salary|Basic Pay)[:\s]+(?:Rs\.?|₹)?[\s]*([0-9,.]+)/i);
  if (basicMatch) {
    data.basicSalary = parseFloat(basicMatch[1].replace(/,/g, ''));
  }
  
  // Extract HRA
  const hraMatch = text.match(/\b(?:HRA|House Rent|Housing)[:\s]+(?:Rs\.?|₹)?[\s]*([0-9,.]+)/i);
  if (hraMatch) {
    data.houseRentAllowance = parseFloat(hraMatch[1].replace(/,/g, ''));
  }
  
  // Extract total earnings
  const earningsMatch = text.match(/\b(?:Total Earnings|Gross|Gross Salary)[:\s]+(?:Rs\.?|₹)?[\s]*([0-9,.]+)/i);
  if (earningsMatch) {
    data.totalEarnings = parseFloat(earningsMatch[1].replace(/,/g, ''));
  }
  
  // Extract PF deduction
  const pfMatch = text.match(/\b(?:PF|Provident Fund)[:\s]+(?:Rs\.?|₹)?[\s]*([0-9,.]+)/i);
  if (pfMatch) {
    data.providentFund = parseFloat(pfMatch[1].replace(/,/g, ''));
  }
  
  // Extract Income Tax
  const taxMatch = text.match(/\b(?:Income Tax|Tax|TDS)[:\s]+(?:Rs\.?|₹)?[\s]*([0-9,.]+)/i);
  if (taxMatch) {
    data.incomeTax = parseFloat(taxMatch[1].replace(/,/g, ''));
  }
  
  // Extract Total Deductions
  const deductionsMatch = text.match(/\b(?:Total Deduction|Deductions)[:\s]+(?:Rs\.?|₹)?[\s]*([0-9,.]+)/i);
  if (deductionsMatch) {
    data.totalDeductions = parseFloat(deductionsMatch[1].replace(/,/g, ''));
  }
  
  // Extract Net Pay
  const netPayMatch = text.match(/\b(?:Net Pay|Net Amount|Take Home|Net Salary)[:\s]+(?:Rs\.?|₹)?[\s]*([0-9,.]+)/i);
  if (netPayMatch) {
    data.netPayable = parseFloat(netPayMatch[1].replace(/,/g, ''));
  }
  
  return data;
}
