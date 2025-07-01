
/**
 * Utility functions for exporting data to different formats
 */

/**
 * Generates and downloads a CSV file from the provided data
 * @param data - Array of arrays representing CSV data (rows and columns)
 * @param filename - Name of the file to download (without extension)
 */
export function generateCSV(data: (string | number)[][], filename: string): void {
  // Convert data to CSV format
  const csvContent = data.map(row => 
    row.map(cell => {
      // Handle strings with commas by wrapping them in quotes
      if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(',')
  ).join('\n');
  
  // Create a blob with the CSV content
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Create a download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  
  // Append to the DOM, trigger the download, and cleanup
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Formats a date for use in filenames
 * @param date - Date to format
 * @returns Formatted date string (YYYY-MM-DD)
 */
export function formatDateForFilename(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}
