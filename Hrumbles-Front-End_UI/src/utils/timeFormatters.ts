
import { format, parseISO } from 'date-fns';

export const formatDate = (dateStr: string | null | undefined, includeTime = false): string => {
  if (!dateStr) return 'N/A';
  
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    return format(date, includeTime ? 'PP h:mm a' : 'PP');
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateStr.toString();
  }
};

export const formatTime = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return 'N/A';
  
  try {
    // Handle case when value is a number (seconds)
    if (typeof value === 'number') {
      const hours = Math.floor(value / 3600);
      const minutes = Math.floor((value % 3600) / 60);
      const seconds = value % 60;
      
      // Use 24-hour format for consistency
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Handle case when value is a date string - use parseISO to preserve the exact time
    const date = typeof value === 'string' ? parseISO(value) : new Date(value);
    return format(date, 'h:mm a');
  } catch (error) {
    console.error('Error formatting time:', error);
    return typeof value === 'string' ? value : value.toString();
  }
};

export const formatDuration = (minutes: number | null | undefined): string => {
  if (minutes === null || minutes === undefined) return 'N/A';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  }
  
  return `${hours}h ${mins}m`;
};
