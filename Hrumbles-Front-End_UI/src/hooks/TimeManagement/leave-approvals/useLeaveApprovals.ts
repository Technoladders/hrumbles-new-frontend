
import { useState } from 'react';
import { LeaveRequest } from '@/types/leave-types';
import { useLeaveRequestData } from './useLeaveRequestData';
import { useLeaveRequestActions } from './useLeaveRequestActions';

export const useLeaveApprovals = (approverId?: string) => {
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  
  const { pendingRequests, recentApprovals, isLoading } = useLeaveRequestData();
  const { approveLeaveRequest, rejectLeaveRequest, cancelApprovedLeave } = useLeaveRequestActions(approverId);

  return {
    pendingRequests,
    recentApprovals,
    isLoading,
    approveLeaveRequest,
    rejectLeaveRequest,
    cancelApprovedLeave,
    selectedRequest,
    setSelectedRequest
  };
};
