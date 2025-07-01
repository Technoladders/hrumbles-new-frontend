import { useState, useCallback } from 'react';
import { toast } from "sonner";
import { submitRegularizationRequest } from "@/api/regularization";
import { subDays, isAfter, isBefore, format, parse } from "date-fns";
import { useSelector } from "react-redux";

interface UseRegularizationFormProps {
  employeeId: string;
  onSuccess?: () => void;
}

export const useRegularizationForm = ({ employeeId, onSuccess }: UseRegularizationFormProps) => {
  const [date, setDate] = useState<Date>(new Date());
  const [requestedClockIn, setRequestedClockIn] = useState('');
  const [requestedClockOut, setRequestedClockOut] = useState('');
  const [reason, setReason] = useState('');
  const [timeLogId, setTimeLogId] = useState<string | undefined>(undefined);
  const [originalClockIn, setOriginalClockIn] = useState<string | undefined>(undefined);
  const [originalClockOut, setOriginalClockOut] = useState<string | undefined>(undefined);
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  // Calculate the earliest allowed date (10 days ago from today)
  const earliestDate = subDays(new Date(), 10);
  
  const isDateValid = useCallback((date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return !isAfter(date, today) && !isBefore(date, earliestDate);
  }, [earliestDate]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!employeeId || !requestedClockIn || !requestedClockOut || !reason) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (!isDateValid(date)) {
      toast.error("Regularization is only allowed for dates within the last 10 days");
      return;
    }
    
    try {
      console.log("Submitting regularization request:", { employeeId, requestedClockIn, requestedClockOut });
      
      // Parse the times from the 12-hour format strings
      const parsedClockIn = parse(requestedClockIn, 'hh:mm a', new Date());
      const parsedClockOut = parse(requestedClockOut, 'hh:mm a', new Date());
      
      console.log("Parsed times:", { 
        parsedClockIn: parsedClockIn.toISOString(), 
        parsedClockOut: parsedClockOut.toISOString() 
      });
      
      // Ensure clock out is after clock in
      if (parsedClockOut <= parsedClockIn) {
        toast.error("Clock out time must be after clock in time");
        return;
      }
      
      // Format the date manually to avoid timezone issues
      const formattedDate = format(date, 'yyyy-MM-dd');
      
      // Extract hours and minutes directly without timezone conversion
      const clockInHours = parsedClockIn.getHours();
      const clockInMinutes = parsedClockIn.getMinutes();
      const clockOutHours = parsedClockOut.getHours();
      const clockOutMinutes = parsedClockOut.getMinutes();
      
      // Format times in 24-hour format without timezone conversion
      const clockInTime = `${clockInHours.toString().padStart(2, '0')}:${clockInMinutes.toString().padStart(2, '0')}`;
      const clockOutTime = `${clockOutHours.toString().padStart(2, '0')}:${clockOutMinutes.toString().padStart(2, '0')}`;
      
      console.log("Formatted times:", { clockInTime, clockOutTime });
      
      // Combine date and time for the requests
      const clockInDateTime = `${formattedDate}T${clockInTime}`;
      const clockOutDateTime = `${formattedDate}T${clockOutTime}`;
      
      console.log("Final datetime strings:", { clockInDateTime, clockOutDateTime });
      
      const success = await submitRegularizationRequest({
        employeeId,
        timeLogId,
        date: formattedDate,
        originalClockIn,
        originalClockOut,
        requestedClockIn: clockInDateTime,
        requestedClockOut: clockOutDateTime,
        reason,
        organization_id: organizationId
      });

      if (success && onSuccess) {
        // Reset form
        setDate(new Date());
        setRequestedClockIn('');
        setRequestedClockOut('');
        setReason('');
        setTimeLogId(undefined);
        setOriginalClockIn(undefined);
        setOriginalClockOut(undefined);
        onSuccess();
      }
    } catch (error) {
      console.error("Time parsing error:", error);
      toast.error("Invalid time format. Please check your time selections.");
    }
  }, [
    employeeId,
    date,
    requestedClockIn,
    requestedClockOut,
    reason,
    timeLogId,
    originalClockIn,
    originalClockOut,
    isDateValid,
    onSuccess
  ]);

  return {
    date,
    setDate,
    requestedClockIn,
    setRequestedClockIn,
    requestedClockOut,
    setRequestedClockOut,
    reason,
    setReason,
    earliestDate,
    isDateValid,
    handleSubmit,
    timeLogId,
    setTimeLogId,
    originalClockIn,
    setOriginalClockIn,
    originalClockOut,
    setOriginalClockOut
  };
};