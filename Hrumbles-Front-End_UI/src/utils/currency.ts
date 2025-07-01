
/**
 * Formats a number as INR currency
 * @param amount - The amount to format
 * @param options - Formatting options
 * @returns Formatted currency string
 */
export function formatINR(
  amount: number, 
  options: { 
    decimals?: number; 
    showSymbol?: boolean;
    compactDisplay?: boolean;
  } = {}
): string {
  const { 
    decimals = 2, 
    showSymbol = true,
    compactDisplay = false
  } = options;

  const formatter = new Intl.NumberFormat('en-IN', {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    notation: compactDisplay ? 'compact' : 'standard',
    compactDisplay: 'short',
  });

  return formatter.format(amount);
}

/**
 * Parses a currency string to a number
 * @param currencyString - The currency string to parse
 * @returns The parsed number value
 */
export function parseCurrencyToNumber(currencyString: string): number {
  // Remove currency symbols, commas and spaces
  const cleanedString = currencyString
    .replace(/[₹,$€£¥,\s]/g, '')
    .trim();
  
  return parseFloat(cleanedString);
}

/**
 * Calculates the percentage change between two numbers
 * @param current - Current value
 * @param previous - Previous value
 * @returns Percentage change as a string
 */
export function calculatePercentageChange(current: number, previous: number): string {
  if (previous === 0) return '+100%';
  
  const change = ((current - previous) / Math.abs(previous)) * 100;
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}
