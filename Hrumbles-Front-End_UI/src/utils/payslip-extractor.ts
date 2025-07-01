
/**
 * Main payslip extraction functionality
 */
import { extractTextFromImage, parsePayslipFromOCRText } from './ocr-utils';
import type { PayslipData } from './payslip/types';
import { validatePayslipFile, detectDuplicate } from './payslip/validators';
import { createSimulatedPayslipData, createPayslipData } from './payslip/data-generator';

// Re-export the types and validators for external use
export type { PayslipData } from './payslip/types';
export { validatePayslipFile, detectDuplicate } from './payslip/validators';

/**
 * Extracts data from different file types
 * This includes real extraction process for images using OCR
 */
export async function extractPayslipData(file: File): Promise<PayslipData> {
  // Simulate processing delay for non-image files
  if (!file.type.includes('image')) {
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  // In a real implementation, we would use appropriate methods for each file type
  const fileType = file.type.toLowerCase();
  
  // For image files, use OCR to extract text and parse payslip data
  if (fileType.includes('image')) {
    try {
      const extractedText = await extractTextFromImage(file);
      console.log('OCR Extracted Text:', extractedText);
      
      // Parse the extracted text into payslip data
      const parsedData = parsePayslipFromOCRText(extractedText);
      console.log('Parsed OCR Data:', parsedData);
      
      // Merge parsed data with default values
      return createPayslipData(parsedData);
    } catch (error) {
      console.error('Error in OCR processing:', error);
      // Fall back to simulated data if OCR fails
      return createSimulatedPayslipData(fileType);
    }
  }
  
  // For non-image files, use simulated data for demo
  return createSimulatedPayslipData(fileType);
}
