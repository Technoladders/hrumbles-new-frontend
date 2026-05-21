import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export const useTimesheetCheck = (employeeId: string, date: Date | null) => {
  const formattedDate = date ? format(date, 'yyyy-MM-dd') : '';

  return useQuery({
    queryKey: ['timesheet-check', employeeId, formattedDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_logs')
        .select('id, clock_in_time, clock_out_time, duration_minutes, is_submitted, status, date')
        .eq('employee_id', employeeId)
        .eq('date', formattedDate)
        .maybeSingle();

      if (error) throw error;
      return data as {
        id: string;
        clock_in_time: string | null;
        clock_out_time: string | null;
        duration_minutes: number | null;
        is_submitted: boolean;
        status: string | null;
        date: string;
      } | null;
    },
    enabled: !!employeeId && !!formattedDate,
    staleTime: 5 * 60 * 1000,
  });
};