import { useState, useCallback } from "react";
import { useSelector } from 'react-redux';
import { LeaveHeader } from "@/components/TimeManagement/leave/LeaveHeader";
import { LeaveBalanceSection } from "@/components/TimeManagement/leave/LeaveBalanceSection";
import { LeaveRequestsSection } from "@/components/TimeManagement/leave/LeaveRequestsSection";
import { LeaveRequestDialog } from "@/components/TimeManagement/leave/LeaveRequestDialog";
import { CancelLeaveDialog } from "@/components/TimeManagement/leave/CancelLeaveDialog";
import { LeaveRequestDetailsDialog } from "@/components/TimeManagement/leave/LeaveRequestDetailsDialog";
import { useLeaveTypes } from "@/hooks/TimeManagement/useLeaveTypes";
import { useLeaveRequests } from "@/hooks/TimeManagement/useLeaveRequests";
import { useEmployeeLeaveBalances } from "@/hooks/TimeManagement/useEmployeeLeaveBalances";
import { useHolidays } from "@/hooks/TimeManagement/useHolidays";
import { LeaveRequest, LeaveRequestFormValues } from "@/types/leave-types";
import { format } from "date-fns"; // Add import

const Leave = () => {
  const user = useSelector((state: any) => state.auth.user);
  const employeeId = user?.id || "";

  const { leaveTypes, isLoading: isLeaveTypesLoading } = useLeaveTypes();
  
  const { 
    leaveRequests, 
    loading: leaveRequestsLoading, 
    isLoading,
    createLeaveRequest,
    cancelLeaveRequest,
    isRequestDialogOpen,
    setIsRequestDialogOpen,
    refetchLeaveRequests
  } = useLeaveRequests(employeeId);
  
  const {
    leaveBalances,
    isLoading: isLeaveBalancesLoading,
    refetchLeaveBalances,
    initializeLeaveBalances
  } = useEmployeeLeaveBalances(employeeId);

  const { 
    holidays,
    isLoading: isHolidaysLoading
  } = useHolidays();

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState<LeaveRequest | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle opening the cancel dialog
  const handleCancelRequest = useCallback((request: LeaveRequest) => {
    setSelectedLeaveRequest(request);
    setIsCancelDialogOpen(true);
  }, []);

  // Handle opening the leave request details dialog
  const handleViewDetails = useCallback((request: LeaveRequest) => {
    setSelectedLeaveRequest(request);
    setIsDetailsDialogOpen(true);
  }, []);

  // Handle submitting the cancellation
  const handleSubmitCancellation = useCallback(async (reason: string) => {
    if (!selectedLeaveRequest) return;
    
    const success = await cancelLeaveRequest(selectedLeaveRequest.id, reason);
    
    if (success) {
      setIsCancelDialogOpen(false);
      refetchLeaveBalances();
    }
  }, [selectedLeaveRequest, cancelLeaveRequest, refetchLeaveBalances]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    console.log('handleRefresh called', { employeeId });
    setIsRefreshing(true);
    await Promise.all([refetchLeaveRequests(), refetchLeaveBalances()]);
    setIsRefreshing(false);
  }, [refetchLeaveRequests, refetchLeaveBalances]);

  // Adapter function to convert LeaveRequestFormValues to LeaveRequestFormData
  const handleLeaveRequestSubmit = useCallback((values: LeaveRequestFormValues) => {
    const formData = {
      leaveTypeId: values.leave_type_id,
      startDate: format(values.start_date, "yyyy-MM-dd"), // Use date-fns format
      endDate: format(values.end_date, "yyyy-MM-dd"), // Use date-fns format
      notes: values.reason
    };
    
    console.log('Submitting leave request with formData:', formData);
    createLeaveRequest(formData);
  }, [createLeaveRequest]);

  // Handle initializing leave balances
  const handleInitializeBalances = useCallback(() => {
    if (!employeeId || !leaveTypes) return;
    
    const leaveTypeIds = leaveTypes.map(type => type.id);
    initializeLeaveBalances({ 
      employeeId, 
      leaveTypeIds 
    });
  }, [employeeId, leaveTypes, initializeLeaveBalances]);
  
  return (
    <div className="content-area">
      <LeaveHeader
        onRefresh={handleRefresh}
        onRequestLeave={() => setIsRequestDialogOpen(true)}
        isRefreshing={isRefreshing}
        isDisabled={isLoading || leaveRequestsLoading || isLeaveBalancesLoading}
      />
      
      <LeaveBalanceSection
        leaveBalances={leaveBalances}
        isLoading={isLeaveBalancesLoading}
        leaveTypes={leaveTypes}
        currentEmployeeId={employeeId}
        onInitializeBalances={handleInitializeBalances}
      />
      
      <LeaveRequestsSection
        isLoading={isLoading}
        leaveRequests={leaveRequests}
        onCancel={handleCancelRequest}
        onViewDetails={handleViewDetails}
      />
      
      {/* Leave Request Dialog */}
      <LeaveRequestDialog
        open={isRequestDialogOpen}
        onOpenChange={setIsRequestDialogOpen}
        onSubmit={handleLeaveRequestSubmit}
        leaveTypes={leaveTypes}
        holidays={holidays}
      />
      
      {/* Leave Cancellation Dialog */}
      <CancelLeaveDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        request={selectedLeaveRequest}
        onConfirm={handleSubmitCancellation}
      />
      
      {/* Leave Details Dialog */}
      <LeaveRequestDetailsDialog
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        request={selectedLeaveRequest}
      />
    </div>
  );
};

export default Leave;