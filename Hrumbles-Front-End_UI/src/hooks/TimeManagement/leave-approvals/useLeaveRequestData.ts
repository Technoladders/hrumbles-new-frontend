
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LeaveRequest } from '@/types/leave-types';

export const useLeaveRequestData = () => {
  // Fetch pending leave requests
  const { data: pendingRequests, isLoading: isPendingLoading } = useQuery({
    queryKey: ['pendingLeaveRequests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*, employee:employee_id(*), leave_type:leave_type_id(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data as any) as (LeaveRequest & { 
        employee: any, 
        leave_type: any 
      })[];
    }
  });

  // Fetch recent approvals/rejections
  const { data: recentApprovals, isLoading: isRecentLoading } = useQuery({
    queryKey: ['recentLeaveApprovals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
        *,
        employee:employee_id (
          id, first_name, last_name, email
        ),
        leave_type:leave_type_id (
          id, name, color, icon
        ),
        approved_by_employee:approved_by (
          id, first_name, last_name, email
        )
      `)
        .in('status', ['approved', 'rejected'])
        .order('updated_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return (data as any) as (LeaveRequest & { 
        employee: any, 
        leave_type: any
      })[];
    }
  });

  return {
    pendingRequests: pendingRequests || [],
    recentApprovals: recentApprovals || [],
    isLoading: isPendingLoading || isRecentLoading
  };
};
