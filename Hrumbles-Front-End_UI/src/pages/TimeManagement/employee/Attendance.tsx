import { useState, useEffect } from "react";
import { useSelector } from 'react-redux';
import { supabase } from '@/integrations/supabase/client';
import { useAttendanceData } from "@/hooks/TimeManagement/useAttendanceData";
import { useAttendanceMarking } from "@/hooks/TimeManagement/useAttendanceMarking";
import { AttendanceMarkingDialog } from "@/components/TimeManagement/attendance/AttendanceMarkingDialog";
import { AttendanceHeader } from "@/components/TimeManagement/attendance/AttendanceHeader";
import { AttendanceContent } from "@/components/TimeManagement/attendance/AttendanceContent";
import type { TimeView } from "@/hooks/TimeManagement/useAttendanceData";
import { toast } from 'sonner';

const Attendance = () => {
  const [timeView, setTimeView] = useState<TimeView>('monthly');
  const [isExternal, setIsExternal] = useState(false);
  const user = useSelector((state: any) => state.auth.user);
  const employeeId = user?.id || "";

  useEffect(() => {
    const fetchDepartment = async () => {
      if (!employeeId) {
        setIsExternal(false);
        return;
      }
      try {
        console.log('Fetching department for isExternal:', { employeeId });
        const { data, error } = await supabase
          .from('hr_employees')
          .select('hr_departments(name)')
          .eq('id', employeeId)
          .single();

        if (error) throw error;
        setIsExternal(data?.hr_departments?.name === 'External');
        console.log('Department fetched:', { isExternal: data?.hr_departments?.name === 'External' });
      } catch (error: any) {
        console.error('Error fetching department:', error);
        toast.error('Failed to load department data');
        setIsExternal(false);
      }
    };
    fetchDepartment();
  }, [employeeId]);

  const { 
    attendanceData,
    isLoading,
    error,
    refetch
  } = useAttendanceData(timeView, employeeId);

  const {
    markAttendanceOpen,
    setMarkAttendanceOpen,
    markAttendanceDate,
    setMarkAttendanceDate,
    markAttendanceTime,
    setMarkAttendanceTime,
    handleMarkAttendance
  } = useAttendanceMarking(refetch);

  console.log('Attendance rendered', { employeeId, timeView, isExternal });

  if (error) {
    return <div className="p-4 text-red-500">Error loading attendance data: {error}</div>;
  }

  if (isLoading) {
    return <div className="p-4">Loading attendance data...</div>;
  }

  return (
    <div className="content-area">
      <AttendanceHeader 
        isExternal={isExternal} 
        onMarkAttendance={() => setMarkAttendanceOpen(true)} 
      />

      <AttendanceContent 
        timeView={timeView}
        onTimeViewChange={(v) => setTimeView(v as TimeView)}
        attendanceData={attendanceData}
        isExternal={isExternal}
      />

      <AttendanceMarkingDialog 
        open={markAttendanceOpen}
        onOpenChange={setMarkAttendanceOpen}
        date={markAttendanceDate}
        time={markAttendanceTime}
        onDateChange={setMarkAttendanceDate}
        onTimeChange={setMarkAttendanceTime}
        onSubmit={handleMarkAttendance}
      />
    </div>
  );
};

export default Attendance;