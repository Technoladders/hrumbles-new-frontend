
import React from 'react';
import { FileText, File, ImageIcon } from 'lucide-react';

/**
 * Returns the appropriate icon component based on file type
 */
export function getFileIcon(fileType: string): React.ReactNode {
  if (fileType.includes('pdf')) {
    return <FileText className="mx-auto h-12 w-12 text-primary mb-2" />;
  } else if (fileType.includes('image')) {
    return <ImageIcon className="mx-auto h-12 w-12 text-primary mb-2" />;
  } else if (fileType.includes('doc')) {
    return <FileText className="mx-auto h-12 w-12 text-primary mb-2" />;
  } else {
    return <File className="mx-auto h-12 w-12 text-primary mb-2" />;
  }
}

/**
 * Converts number to words in Indian currency format
 */
export function numberToWords(amount: number): string {
  if (amount === 0) return 'Zero Only';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  // Fixed conversion function to avoid infinite recursion
  const convert = (num: number): string => {
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + convert(num % 100) : '');
    if (num < 100000) {
      const thousands = Math.floor(num / 1000);
      return convert(thousands) + ' Thousand' + (num % 1000 ? ' ' + convert(num % 1000) : '');
    }
    if (num < 10000000) {
      const lakhs = Math.floor(num / 100000);
      return convert(lakhs) + ' Lakh' + (num % 100000 ? ' ' + convert(num % 100000) : '');
    }
    // Adding an upper limit to prevent infinite recursion
    if (num >= 10000000) {
      const crores = Math.floor(num / 10000000);
      return convert(crores) + ' Crore' + (num % 10000000 ? ' ' + convert(num % 10000000) : '');
    }
    return ''; // This should never be reached, but provides a safety net
  };
  
  // Add 'Only' at the end as per Indian currency custom
  return convert(Math.floor(amount)) + ' Only';
}

/**
 * Formats a file size into a readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

/**
 * Safe number formatter - replaces NaN with 0
 */
export function safeFormatNumber(value: number | undefined | null): number {
  if (value === undefined || value === null || isNaN(value)) {
    return 0;
  }
  return value;
}

/**
 * Format Indian currency with handling for NaN values
 */
export function formatIndianCurrency(amount: number | undefined | null): string {
  const safeAmount = safeFormatNumber(amount);
  return new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(safeAmount).replace('₹', '₹');
}
