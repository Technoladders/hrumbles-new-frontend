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
import { useEmployeeEmail } from "@/hooks/TimeManagement/useEmployeeEmail";
import { useLeaveEmailConfig } from "@/hooks/TimeManagement/useLeaveEmailConfig";
import { LeaveRequest, LeaveRequestFormValues } from "@/types/leave-types";
import { format } from "date-fns";
import { toast } from 'sonner';

const Leave = () => {
  const user = useSelector((state: any) => state.auth.user);
  const employeeId = user?.id || "";

  const { leaveTypes, isLoading: isLeaveTypesLoading } = useLeaveTypes();
 
  const {
    leaveRequests,
    loading: leaveRequestsLoading,
    isLoading, // Alias for loading
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

  const { holidays } = useHolidays();
  const { allEmployees, isLoading: isLoadingEmployees } = useEmployeeEmail();
  const { defaultRecipients } = useLeaveEmailConfig();

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState<LeaveRequest | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleCancelRequest = useCallback((request: LeaveRequest) => {
    setSelectedLeaveRequest(request);
    setIsCancelDialogOpen(true);
  }, []);

  const handleViewDetails = useCallback((request: LeaveRequest) => {
    setSelectedLeaveRequest(request);
    setIsDetailsDialogOpen(true);
  }, []);

  const handleSubmitCancellation = useCallback(async (reason: string) => {
    if (!selectedLeaveRequest) return;
    
    try {
      await cancelLeaveRequest({ id: selectedLeaveRequest.id, reason });
      setIsCancelDialogOpen(false);
      // Balance refetch handled by hook invalidation
    } catch (error) {
      // Error handled by hook
    }
  }, [selectedLeaveRequest, cancelLeaveRequest]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([refetchLeaveRequests(), refetchLeaveBalances()]);
    setIsRefreshing(false);
  }, [refetchLeaveRequests, refetchLeaveBalances]);

  const handleLeaveRequestSubmit = useCallback(async (values: LeaveRequestFormValues) => {
    if (!values.date_range.startDate || !values.date_range.endDate) { 
      toast.error("Please select a valid date range.");
      return; 
    }

    // Prepare Payload
    const formData = {
      leaveTypeId: values.leave_type_id,
      startDate: format(values.date_range.startDate, "yyyy-MM-dd"),
      endDate: format(values.date_range.endDate, "yyyy-MM-dd"),
      notes: values.reason,
      dayBreakdown: values.day_breakdown,
      additionalRecipients: values.additional_recipient,
      ccRecipients: values.cc_recipient,
    };
   
    // Submit (Validation happens inside the hook via DB RPC)
    try {
      await createLeaveRequest(formData);
      // Dialog closing and Success Toast are handled in the hook onSuccess
    } catch (error) {
      // Error Toast handled in hook onError
    }
  }, [createLeaveRequest]);

  const handleInitializeBalances = useCallback(() => {
    if (!employeeId || !leaveTypes) return;
    const leaveTypeIds = leaveTypes.map(type => type.id);
    initializeLeaveBalances({ employeeId, leaveTypeIds });
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
     
      <LeaveRequestDialog
        open={isRequestDialogOpen}
        onOpenChange={setIsRequestDialogOpen}
        onSubmit={handleLeaveRequestSubmit}
        leaveTypes={leaveTypes}
        allEmployees={allEmployees}
        isLoadingEmployees={isLoadingEmployees}
        holidays={holidays.map(h => new Date(h.date))} // Pass dates only
        defaultRecipients={defaultRecipients}
      />
     
      <CancelLeaveDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        request={selectedLeaveRequest}
        onConfirm={(id, reason) => handleSubmitCancellation(reason)}
      />
     
      <LeaveRequestDetailsDialog
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        request={selectedLeaveRequest}
      />
    </div>
  );
};

export default Leave;