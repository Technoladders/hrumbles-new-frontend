import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TimeLog } from '@/types/time-tracker-types';
import { format } from 'date-fns';

export const useTimesheetCheck = () => {
  const [isChecking, setIsChecking] = useState(false);

  const checkTimesheetForDate = useCallback(async (employeeId: string, date: Date) => {
    if (!employeeId || !date) return null;
    
    setIsChecking(true);
    const formattedDate = format(date, 'yyyy-MM-dd');
    console.log('Checking timesheet:', { employeeId, formattedDate });
    
    try {
      const { data, error } = await supabase
        .from('time_logs')
        .select('*, project:project_id(name)')
        .eq('employee_id', employeeId)
        .eq('date', formattedDate)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // Not found error code
          console.error('Error checking timesheet:', error);
        }
        return null;
      }

      if (data) {
        const validStatusValues: TimeLog['status'][] = ['normal', 'grace_period', 'auto_terminated', 'absent', null];
        let status: TimeLog['status'] = 'normal';
        
        if (data.status && validStatusValues.includes(data.status as TimeLog['status'])) {
          status = data.status as TimeLog['status'];
        }
        
        let projectData = null;
        if (data.project !== null && typeof data.project === 'object') {
          const projectObj = data.project as { name?: string };
          if (projectObj && 'name' in projectObj) {
            projectData = { name: projectObj.name || "Unknown" };
          }
        }
        
        const typedData: TimeLog = {
          id: data.id,
          employee_id: data.employee_id,
          date: data.date,
          clock_in_time: data.clock_in_time,
          clock_out_time: data.clock_out_time,
          duration_minutes: data.duration_minutes,
          project_id: data.project_id,
          notes: data.notes,
          status,
          project: projectData,
          is_submitted: data.is_submitted || false,
          is_approved: data.is_approved || false,
          approved_at: data.approved_at || null,
          approved_by: data.approved_by || null,
          rejection_reason: data.rejection_reason || null,
          project_time_data: data.project_time_data || null,
          created_at: data.created_at || null,
          updated_at: null
        };
        
        return typedData;
      }
      
      return null;
    } catch (error) {
      console.error('Error checking timesheet:', error);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, []);

  const queryTimesheet = (employeeId: string, date: Date | undefined) => {
    if (!employeeId || !date) return { data: null, isLoading: false };
    
    const formattedDate = format(date, 'yyyy-MM-dd');
    return useQuery({
      queryKey: ['timesheet', employeeId, formattedDate],
      queryFn: () => checkTimesheetForDate(employeeId, date),
      enabled: !!employeeId && !!date,
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });
  };

  return {
    existingTimesheet: queryTimesheet, // Return query function to be called with params
    isChecking,
    checkTimesheetForDate
  };
};