import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useLeaveRequestActions = (approverId?: string) => {
  const queryClient = useQueryClient();

  // Approve a leave request
  const approveLeaveRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      if (!approverId) throw new Error("Approver ID is required");
      
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
      return data;
    },
    onSuccess: () => {
      toast.success("Leave request approved");
      // The DB Trigger handles the balance deduction automatically!
      invalidateQueries();
    },
    onError: (error) => {
      toast.error(`Failed to approve: ${error.message}`);
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
      toast.success("Leave request rejected");
      invalidateQueries();
    },
    onError: (error) => {
      toast.error(`Failed to reject: ${error.message}`);
    }
  });

  // Cancel an approved leave request
  const cancelApprovedLeaveRequestMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      if (!approverId) throw new Error("Approver ID is required");
      
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
      return data;
    },
    onSuccess: () => {
      toast.success("Leave cancelled and balance refunded");
      // The DB Trigger detects 'approved' -> 'cancelled' and inserts a credit Ledger entry automatically.
      invalidateQueries();
    },
    onError: (error) => {
      toast.error(`Failed to cancel: ${error.message}`);
    }
  });

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['pendingLeaveRequests'] });
    queryClient.invalidateQueries({ queryKey: ['recentLeaveApprovals'] });
    queryClient.invalidateQueries({ queryKey: ['employeeLeaveBalances'] });
    queryClient.invalidateQueries({ queryKey: ['leaveLedger'] });
  };

  return {
    approveLeaveRequest: approveLeaveRequestMutation.mutate,
    rejectLeaveRequest: rejectLeaveRequestMutation.mutate,
    cancelApprovedLeave: cancelApprovedLeaveRequestMutation.mutate,
  };
};