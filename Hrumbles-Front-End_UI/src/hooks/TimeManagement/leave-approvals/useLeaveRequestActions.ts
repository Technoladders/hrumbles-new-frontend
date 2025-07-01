
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { updateLeaveBalance } from '@/utils/leaveBalanceUtils';

export const useLeaveRequestActions = (approverId?: string) => {
  const queryClient = useQueryClient();

  // Approve a leave request
  const approveLeaveRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      if (!approverId) throw new Error("Approver ID is required");
      
      // First, get the leave request details
      const { data: requestData, error: requestError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('id', requestId)
        .single();
      
      if (requestError) throw requestError;
      
      // Update the leave request status
      const { data, error } = await supabase
        .from('leave_requests')
        .update({
          status: 'approved',
          approved_by: approverId,
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .select()
        .single();
      
      if (error) throw error;
      
      // Update the leave balance - deduct days
      try {
        console.log(`Updating leave balance: employeeId=${requestData.employee_id}, leaveTypeId=${requestData.leave_type_id}, workingDays=${requestData.working_days}, isDeduction=true`);
        await updateLeaveBalance(
          requestData.employee_id, 
          requestData.leave_type_id, 
          requestData.working_days, 
          true // isDeduction = true
        );
      } catch (error) {
        console.error('Failed to update leave balance:', error);
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Leave request approved successfully",
      });
      // Invalidate all related queries to ensure fresh data is fetched
      queryClient.invalidateQueries({ queryKey: ['pendingLeaveRequests'] });
      queryClient.invalidateQueries({ queryKey: ['recentLeaveApprovals'] });
      queryClient.invalidateQueries({ queryKey: ['employeeLeaveBalances'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to approve leave request: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Reject a leave request
  const rejectLeaveRequestMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      if (!approverId) throw new Error("Approver ID is required");
      
      const { data, error } = await supabase
        .from('leave_requests')
        .update({
          status: 'rejected',
          approved_by: approverId,
          approved_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('id', requestId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Leave request rejected successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['pendingLeaveRequests'] });
      queryClient.invalidateQueries({ queryKey: ['recentLeaveApprovals'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to reject leave request: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Cancel an approved leave request (admin function)
  const cancelApprovedLeaveRequestMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      if (!approverId) throw new Error("Approver ID is required");
      
      // First, get the leave request details
      const { data: requestData, error: requestError } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('id', requestId)
        .single();
      
      if (requestError) throw requestError;
      
      // Only proceed with balance adjustment if the request was previously approved
      const needsBalanceAdjustment = requestData.status === 'approved';
      
      // Update the leave request status
      const { data, error } = await supabase
        .from('leave_requests')
        .update({
          status: 'cancelled',
          cancelled_by: approverId,
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason
        })
        .eq('id', requestId)
        .select()
        .single();
      
      if (error) throw error;
      
      // If it was previously approved, we need to add the days back to the balance
      if (needsBalanceAdjustment) {
        try {
          console.log(`Adjusting leave balance: employeeId=${requestData.employee_id}, leaveTypeId=${requestData.leave_type_id}, workingDays=${requestData.working_days}, isDeduction=false`);
          await updateLeaveBalance(
            requestData.employee_id, 
            requestData.leave_type_id, 
            requestData.working_days, 
            false // isDeduction = false (adding days back)
          );
        } catch (error) {
          console.error('Failed to adjust leave balance:', error);
          throw error;
        }
      }
      
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Approved leave has been cancelled",
      });
      // Invalidate all related queries to ensure fresh data is fetched
      queryClient.invalidateQueries({ queryKey: ['pendingLeaveRequests'] });
      queryClient.invalidateQueries({ queryKey: ['recentLeaveApprovals'] });
      queryClient.invalidateQueries({ queryKey: ['employeeLeaveBalances'] });
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to cancel approved leave: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  return {
    approveLeaveRequest: approveLeaveRequestMutation.mutate,
    rejectLeaveRequest: rejectLeaveRequestMutation.mutate,
    cancelApprovedLeave: cancelApprovedLeaveRequestMutation.mutate,
  };
};
