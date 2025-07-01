
import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';
import { toast } from "sonner";
import { getAuthDataFromLocalStorage } from '@/utils/localstorage';

export const useAttendanceMarking = (refetchData: () => void) => {
  const [markAttendanceOpen, setMarkAttendanceOpen] = useState(false);
  const [markAttendanceDate, setMarkAttendanceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [markAttendanceTime, setMarkAttendanceTime] = useState(format(new Date(), 'HH:mm'));
  const authData = getAuthDataFromLocalStorage();
      if (!authData) {
        throw new Error('Failed to retrieve authentication data');
      }
      const { organization_id, userId } = authData;

  const handleMarkAttendance = async () => {
    try {
      const clockInTime = `${markAttendanceDate}T${markAttendanceTime}:00`;
      
      const { error } = await supabase
        .from('time_logs')
        .insert({
          employee_id: 'current-user-id', // This should be replaced with actual user ID
          date: markAttendanceDate,
          clock_in_time: clockInTime,
          clock_out_time: clockInTime,
          duration_minutes: 480,
          status: 'normal', // Using the proper enum value
          is_submitted: true,
          organization_id
        });

      if (error) throw error;
      
      toast.success("Attendance marked successfully");
      setMarkAttendanceOpen(false);
      refetchData();
    } catch (error: any) {
      console.error("Error marking attendance:", error);
      toast.error("Failed to mark attendance: " + error.message);
    }
  };

  return {
    markAttendanceOpen,
    setMarkAttendanceOpen,
    markAttendanceDate,
    setMarkAttendanceDate,
    markAttendanceTime,
    setMarkAttendanceTime,
    handleMarkAttendance
  };
};
