import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';

const fetchDashboardStats = async (employeeId: string) => {
  if (!employeeId) return { openJobs: 0, interviews: 0, submissions: 0 };

  // 1. Get count of jobs created by the user
  const { count: openJobs } = await supabase
    .from('hr_jobs')
    .select('*', { count: 'exact', head: true })
    .eq('created_by', employeeId)
    .eq('status', 'open');

  // 2. Get count of upcoming interviews assigned to the user
  const { data: employee } = await supabase
    .from('hr_employees')
    .select('first_name, last_name')
    .eq('id', employeeId)
    .single();
  
  const fullName = employee ? `${employee.first_name} ${employee.last_name}` : '';

  const { count: interviews } = await supabase
    .from('hr_job_candidates')
    .select('*', { count: 'exact', head: true })
    .eq('main_status_id', 'f72e13f8-7825-4793-85e0-e31d669f8097') // Interview status
    .gte('interview_date', new Date().toISOString())
    .eq('applied_from', fullName);

  // 3. Get count of submissions (candidates created) by the user this week
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: submissions } = await supabase
    .from('hr_job_candidates')
    .select('*', { count: 'exact', head: true })
    .eq('created_by', employeeId)
    .gte('created_at', oneWeekAgo);

  return { openJobs, interviews, submissions };
};

export const useDashboardStats = (employeeId: string) => {
  return useQuery({
    queryKey: ['dashboardStats', employeeId],
    queryFn: () => fetchDashboardStats(employeeId),
    enabled: !!employeeId,
  });
};