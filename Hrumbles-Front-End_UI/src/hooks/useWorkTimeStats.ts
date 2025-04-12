
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, eachDayOfInterval, format, differenceInMinutes } from 'date-fns';

export interface DayStats {
  date: Date;
  total: number;
  isToday: boolean;
}

export const useWorkTimeStats = (employeeId: string) => {
  const [weeklyStats, setWeeklyStats] = useState<DayStats[]>([]);
  const [totalWeeklyHours, setTotalWeeklyHours] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWeeklyStats = async () => {
    if (!employeeId) return;

    setIsLoading(true);
    try {
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Start from Monday
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

      const { data: workTimes, error } = await supabase
        .from('hr_employee_work_times')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('date', format(weekStart, 'yyyy-MM-dd'))
        .lte('date', format(weekEnd, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (error) throw error;

      const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
      
      const stats = daysInWeek.map(date => {
        const dayWorkTimes = workTimes?.filter(wt => 
          format(new Date(wt.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        ) || [];

        const totalMinutes = dayWorkTimes.reduce((acc, wt) => {
          if (wt.duration_minutes) {
            return acc + wt.duration_minutes;
          }
          if (wt.status === 'running') {
            // For running sessions, calculate current duration
            const start = new Date(wt.start_time);
            const now = new Date();
            return acc + differenceInMinutes(now, start);
          }
          return acc;
        }, 0);

        return {
          date,
          total: totalMinutes / 60, // Convert to hours
          isToday: format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')
        };
      });

      const weeklyTotal = stats.reduce((acc, day) => acc + day.total, 0);
      
      setWeeklyStats(stats);
      setTotalWeeklyHours(weeklyTotal);
    } catch (error) {
      console.error('Error fetching work time stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWeeklyStats();
    
    // Set up real-time subscription for updates
    const channel = supabase
      .channel('work-time-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employee_work_times',
          filter: `employee_id=eq.${employeeId}`
        },
        () => {
          fetchWeeklyStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employeeId]);

  return {
    weeklyStats,
    totalWeeklyHours,
    isLoading,
    fetchWeeklyStats
  };
};
