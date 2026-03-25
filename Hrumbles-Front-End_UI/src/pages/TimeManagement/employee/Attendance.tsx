import { useState, useEffect } from "react";
import { useSelector } from 'react-redux';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth } from 'date-fns';
import { useAttendanceData, type DateRange } from "@/hooks/TimeManagement/useAttendanceData";
import { useAttendanceMarking } from "@/hooks/TimeManagement/useAttendanceMarking";
import { AttendanceMarkingDialog } from "@/components/TimeManagement/attendance/AttendanceMarkingDialog";
import { AttendanceHeader } from "@/components/TimeManagement/attendance/AttendanceHeader";
import { AttendanceContent } from "@/components/TimeManagement/attendance/AttendanceContent";
import { toast } from 'sonner';

// Default: full current month
const defaultRange = (): DateRange => ({
  startDate: startOfMonth(new Date()),
  endDate:   endOfMonth(new Date()),
});

const Attendance = () => {
  const [dateRange, setDateRange] = useState<DateRange | null>(defaultRange());
  const [isExternal, setIsExternal] = useState(false);

  const user       = useSelector((state: any) => state.auth.user);
  const employeeId = user?.id ?? "";

  useEffect(() => {
    const fetchDepartment = async () => {
      if (!employeeId) { setIsExternal(false); return; }
      try {
        const { data, error } = await supabase
          .from('hr_employees')
          .select('hr_departments(name)')
          .eq('id', employeeId)
          .single();
        if (error) throw error;
        setIsExternal(data?.hr_departments?.name === 'External');
      } catch (err: any) {
        console.error('Error fetching department:', err);
        toast.error('Failed to load department data');
        setIsExternal(false);
      }
    };
    fetchDepartment();
  }, [employeeId]);

  const { attendanceData, isLoading, error, refetch } = useAttendanceData(dateRange, employeeId);

  const {
    markAttendanceOpen,
    setMarkAttendanceOpen,
    markAttendanceDate,
    setMarkAttendanceDate,
    markAttendanceTime,
    setMarkAttendanceTime,
    isSubmitting,
    handleMarkAttendance,
  } = useAttendanceMarking(employeeId, refetch);

  if (error) {
    return <div className="p-4 text-red-500">Error loading attendance data: {error}</div>;
  }

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="content-area">
      <AttendanceHeader
        isExternal={isExternal}
        onMarkAttendance={() => setMarkAttendanceOpen(true)}
      />

      <AttendanceContent
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        attendanceData={attendanceData}
        isExternal={isExternal}
        employeeId={employeeId}
      />

      <AttendanceMarkingDialog
        open={markAttendanceOpen}
        onOpenChange={setMarkAttendanceOpen}
        date={markAttendanceDate}
        time={markAttendanceTime}
        onDateChange={setMarkAttendanceDate}
        onTimeChange={setMarkAttendanceTime}
        onSubmit={handleMarkAttendance}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default Attendance;