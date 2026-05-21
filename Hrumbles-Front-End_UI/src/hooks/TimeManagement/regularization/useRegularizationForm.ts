import { useState, useCallback } from 'react';
import { toast } from "sonner";
import { submitRegularizationRequest } from "@/api/regularization";
import { subDays, isAfter, isBefore, format } from "date-fns";
import { useSelector } from "react-redux";

interface UseRegularizationFormProps {
  employeeId: string;
  onSuccess?: () => void;
}

export const useRegularizationForm = ({ employeeId, onSuccess }: UseRegularizationFormProps) => {
  const [date, setDate]                       = useState<Date>(new Date());
  const [requestedClockIn, setRequestedClockIn]   = useState('');  // HH:mm 24h
  const [requestedClockOut, setRequestedClockOut] = useState('');  // HH:mm 24h
  const [reason, setReason]                   = useState('');
  const [timeLogId, setTimeLogId]             = useState<string | undefined>(undefined);
  const [originalClockIn, setOriginalClockIn] = useState<string | undefined>(undefined);
  const [originalClockOut, setOriginalClockOut] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting]       = useState(false);

  const organizationId = useSelector((state: any) => state.auth.organization_id);

  const isDateValid = useCallback((d: Date): boolean => {
    const today   = new Date(); today.setHours(23, 59, 59, 999);
    const earliest = subDays(new Date(), 10); earliest.setHours(0, 0, 0, 0);
    return !isAfter(d, today) && !isBefore(d, earliest);
  }, []);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!requestedClockIn || !requestedClockOut || !reason.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!isDateValid(date)) {
      toast.error("Date must be within the last 10 days");
      return;
    }

    // Validate out > in
    const [inH, inM]   = requestedClockIn.split(':').map(Number);
    const [outH, outM] = requestedClockOut.split(':').map(Number);
    if (outH * 60 + outM <= inH * 60 + inM) {
      toast.error("Clock-out must be after clock-in");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitRegularizationRequest({
        employeeId,
        timeLogId,
        date:              format(date, 'yyyy-MM-dd'),
        originalClockIn,
        originalClockOut,
        requestedClockIn,
        requestedClockOut,
        reason:            reason.trim(),
        organizationId,
      });

      if (result.success) {
        setRequestedClockIn('');
        setRequestedClockOut('');
        setReason('');
        setTimeLogId(undefined);
        setOriginalClockIn(undefined);
        setOriginalClockOut(undefined);
        onSuccess?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    employeeId, date, requestedClockIn, requestedClockOut,
    reason, timeLogId, originalClockIn, originalClockOut,
    organizationId, isDateValid, onSuccess,
  ]);

  return {
    date, setDate,
    requestedClockIn, setRequestedClockIn,
    requestedClockOut, setRequestedClockOut,
    reason, setReason,
    timeLogId, setTimeLogId,
    originalClockIn, setOriginalClockIn,
    originalClockOut, setOriginalClockOut,
    isSubmitting,
    isDateValid,
    handleSubmit,
  };
};