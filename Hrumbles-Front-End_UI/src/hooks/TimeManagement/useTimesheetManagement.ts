import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TimeLog } from '@/types/time-tracker-types';
import { fetchTimeLogs } from '@/api/timeTracker';
import { useProjectData } from '@/hooks/TimeManagement/useProjectData';

export const useTimesheetManagement = (employeeId: string) => {
  const queryClient = useQueryClient();
  const { refetchData: refreshProjectData } = useProjectData();

  const { data, isLoading, error } = useQuery({
    queryKey: ['timesheets', employeeId],
    queryFn: async () => {
      console.log('Fetching timesheets:', { employeeId });
      if (!employeeId) {
        console.warn('No employeeId provided, returning empty data');
        return [];
      }

      const timesheets = await fetchTimeLogs(employeeId);
      console.log('Timesheets fetched:', { count: timesheets.length, timesheets });
      return timesheets;
    },
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false
  });

  const fetchTimesheetData = useCallback(() => {
    console.log('fetchTimesheetData called', { employeeId });
    queryClient.invalidateQueries({ queryKey: ['timesheets', employeeId] });
  }, [employeeId, queryClient]);

  const refreshData = useCallback(() => {
    console.log('refreshData called', { employeeId });
    refreshProjectData();
    fetchTimesheetData();
  }, [refreshProjectData, fetchTimesheetData]);

  const pendingTimesheets = (data || []).filter(t => 
    !t.is_submitted || (t.is_submitted && !t.is_approved && !t.clarification_status));
  
  const clarificationTimesheets = (data || []).filter(t => 
    t.clarification_status === 'needed' || t.clarification_status === 'submitted');
  
  const approvedTimesheets = (data || []).filter(t => 
    t.is_approved);

  return {
    timesheets: data || [],
    loading: isLoading,
    pendingTimesheets,
    clarificationTimesheets,
    approvedTimesheets,
    refreshTrigger: 0, // Kept for compatibility, but unused
    fetchTimesheetData,
    refreshData
  };
};