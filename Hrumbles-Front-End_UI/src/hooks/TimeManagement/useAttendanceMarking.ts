import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';
import { toast } from "sonner";
import { getAuthDataFromLocalStorage } from '@/utils/localstorage';

export const useAttendanceMarking = (employeeId: string, refetchData: () => void) => {
  const [markAttendanceOpen, setMarkAttendanceOpen]   = useState(false);
  const [markAttendanceDate, setMarkAttendanceDate]   = useState(format(new Date(), 'yyyy-MM-dd'));
  const [markAttendanceTime, setMarkAttendanceTime]   = useState(format(new Date(), 'HH:mm'));
  const [isSubmitting, setIsSubmitting]               = useState(false);

  const handleMarkAttendance = async () => {
    const authData = getAuthDataFromLocalStorage();
    if (!authData) {
      toast.error('Authentication data not found. Please log in again.');
      return;
    }
    const { organization_id } = authData;

    // Use the employeeId prop (from Redux store) rather than the hardcoded placeholder
    if (!employeeId) {
      toast.error('Employee ID is missing. Cannot mark attendance.');
      return;
    }

    setIsSubmitting(true);
    try {
      const clockInTime = `${markAttendanceDate}T${markAttendanceTime}:00`;

      // Check for an existing log on that date to avoid duplicates
      const { data: existing, error: checkError } = await supabase
        .from('time_logs')
        .select('id')
        .eq('employee_id', employeeId)
        .eq('date', markAttendanceDate)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing) {
        toast.error('Attendance already marked for this date.');
        return;
      }

      const { error } = await supabase
        .from('time_logs')
        .insert({
          employee_id:      employeeId,
          date:             markAttendanceDate,
          clock_in_time:    clockInTime,
          clock_out_time:   clockInTime,
          duration_minutes: 480,       // 8 hours default
          status:           'normal',
          is_submitted:     true,
          organization_id,
        });

      if (error) throw error;

      toast.success('Attendance marked successfully');
      setMarkAttendanceOpen(false);
      refetchData();
    } catch (err: any) {
      console.error('Error marking attendance:', err);
      toast.error('Failed to mark attendance: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    markAttendanceOpen,
    setMarkAttendanceOpen,
    markAttendanceDate,
    setMarkAttendanceDate,
    markAttendanceTime,
    setMarkAttendanceTime,
    isSubmitting,
    handleMarkAttendance,
  };
};