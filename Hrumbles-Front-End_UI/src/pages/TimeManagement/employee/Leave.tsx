// Updated Leave.tsx - Minor changes: Added overlap validation feedback via toast in handleLeaveRequestSubmit
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

  // Fetch all employees and get their loading state
  const { allEmployees, isLoading: isLoadingEmployees } = useEmployeeEmail();

  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedLeaveRequest, setSelectedLeaveRequest] = useState<LeaveRequest | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ... (the rest of the component's functions are unchanged)
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
    
    const success = await cancelLeaveRequest({ id: selectedLeaveRequest.id, reason });
    
    if (success) {
      setIsCancelDialogOpen(false);
      refetchLeaveBalances();
    }
  }, [selectedLeaveRequest, cancelLeaveRequest, refetchLeaveBalances]);

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
    // Check for overlaps before submitting
    const hasOverlap = leaveRequests.some((req) => {
      if (req.status === 'rejected') return false;
      const reqStart = new Date(req.start_date);
      const reqEnd = new Date(req.end_date);
      const newStart = values.date_range.startDate;
      const newEnd = values.date_range.endDate;
      return newStart <= reqEnd && newEnd >= reqStart;
    });
    if (hasOverlap) {
      toast.error("Cannot request leave for dates that overlap with existing pending or approved requests. Rejected requests are allowed.");
      return;
    }
    const formData = {
      leaveTypeId: values.leave_type_id,
      startDate: format(values.date_range.startDate, "yyyy-MM-dd"),
      endDate: format(values.date_range.endDate, "yyyy-MM-dd"),
      notes: values.reason,
      dayBreakdown: values.day_breakdown, // Pass the breakdown
      additionalRecipients: values.additional_recipient,
      ccRecipients: values.cc_recipient,
    };
   
    await createLeaveRequest(formData);
  }, [createLeaveRequest, leaveRequests]);

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
        isLoadingEmployees={isLoadingEmployees} // Pass loading state
        holidays={holidays}
      />
     
      <CancelLeaveDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        request={selectedLeaveRequest}
        onConfirm={(reason) => handleSubmitCancellation(reason)} // Adjusted to pass reason correctly
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