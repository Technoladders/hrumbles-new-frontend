import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

export type TimeView = 'weekly' | 'monthly';

export interface AttendanceData {
  present: number;
  absent: number;
  late: number;
  records: any[];
  weeklyHours: number;
  monthlyHours: number;
  dailyHours: Array<{ date: string; hours: number }>;
}

export const useAttendanceData = (timeView: TimeView, employeeId: string) => {
  const { data, isLoading, error } = useQuery<AttendanceData>({
    queryKey: ['attendance_data', timeView, employeeId],
    queryFn: async () => {
      console.log('Fetching attendance data:', { timeView, employeeId });
      if (!employeeId) {
        console.warn('No employeeId provided, returning empty data');
        return {
          present: 0,
          absent: 0,
          late: 0,
          records: [],
          weeklyHours: 0,
          monthlyHours: 0,
          dailyHours: []
        };
      }

      const currentDate = new Date();
      let startDate, endDate;
      
      if (timeView === 'weekly') {
        startDate = startOfWeek(currentDate);
        endDate = endOfWeek(currentDate);
      } else {
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
      }
      
      const { data: timeLogs, error } = await supabase
        .from('time_logs')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching attendance data:', error);
        toast.error('Failed to load attendance data');
        throw error;
      }

      console.log('Attendance data fetched:', { count: timeLogs?.length, timeLogs });

      const uniqueDates = new Set();
      const records = timeLogs?.filter(log => {
        if (!uniqueDates.has(log.date)) {
          uniqueDates.add(log.date);
          return true;
        }
        return false;
      }) || [];

      let totalWeeklyHours = 0;
      let totalMonthlyHours = 0;
      
      const dailyHoursData = [];
      
      timeLogs?.forEach(log => {
        if (log.duration_minutes) {
          const hoursWorked = log.duration_minutes / 60;
          
          const logDate = parseISO(log.date);
          const weekStart = startOfWeek(currentDate);
          const monthStart = startOfMonth(currentDate);
          
          if (logDate >= weekStart && logDate <= endOfWeek(currentDate)) {
            totalWeeklyHours += hoursWorked;
          }
          
          if (logDate >= monthStart && logDate <= endOfMonth(currentDate)) {
            totalMonthlyHours += hoursWorked;
          }
          
          dailyHoursData.push({
            date: format(parseISO(log.date), 'dd MMM'),
            hours: Math.round(hoursWorked * 10) / 10
          });
        }
      });

      const workingDaysInMonth = differenceInDays(endOfMonth(currentDate), startOfMonth(currentDate)) + 1;
      const workingDaysInWeek = 5;
      
      const expectedPresentDays = timeView === 'weekly' ? workingDaysInWeek : workingDaysInMonth;
      
      return {
        present: records.length,
        absent: Math.max(0, expectedPresentDays - records.length),
        late: records.filter(log => log.status === 'grace_period').length,
        records,
        weeklyHours: Math.round(totalWeeklyHours * 10) / 10,
        monthlyHours: Math.round(totalMonthlyHours * 10) / 10,
        dailyHours: dailyHoursData
      };
    },
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false
  });

  return {
    attendanceData: data || {
      present: 0,
      absent: 0,
      late: 0,
      records: [],
      weeklyHours: 0,
      monthlyHours: 0,
      dailyHours: []
    },
    isLoading,
    error: error?.message,
    refetch: () => {
      console.log('refetchAttendanceData called', { employeeId, timeView });
      return refetch();
    }
  };
};