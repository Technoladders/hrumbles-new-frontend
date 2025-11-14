import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TimeLog } from "@/types/time-tracker-types";
import { CreateTimesheetDialog } from "@/components/TimeManagement/timesheet/CreateTimesheetDialog";
import { ViewTimesheetDialog } from "@/components/TimeManagement/timesheet/ViewTimesheetDialog";
import { TimesheetClarificationDialog } from "@/components/TimeManagement/timesheet/TimesheetClarificationDialog";
import { TimesheetHeader } from "@/components/TimeManagement/timesheet/TimesheetHeader";
import { TimesheetContent } from "@/components/TimeManagement/timesheet/TimesheetContent";
import { useTimesheetManagement } from '@/hooks/TimeManagement/useTimesheetManagement';
import { useTimesheetStore } from '@/stores/timesheetStore';

// ===============================================
// ULTRA-AGGRESSIVE FIX: Enum for dialog state
// ===============================================
type ActiveDialogType = 'NONE' | 'CREATE' | 'VIEW' | 'CLARIFICATION';

const Timesheet = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [employeeHasProjects, setEmployeeHasProjects] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimeLog | null>(null);
  
  // ===============================================
  // SINGLE SOURCE OF TRUTH: Only one dialog active
  // ===============================================
  const [activeDialogType, setActiveDialogType] = useState<ActiveDialogType>('NONE');
  const [dialogKey, setDialogKey] = useState(0); // Force remount

  const { isSubmissionModalOpen, submissionTarget, closeSubmissionModal } = useTimesheetStore();
  const user = useSelector((state: any) => state.auth.user);
  const employeeId = user?.id || "";

  const {
    loading,
    pendingTimesheets,
    clarificationTimesheets,
    approvedTimesheets,
    fetchTimesheetData,
  } = useTimesheetManagement(employeeId);

  useEffect(() => {
    const fetchEmployeeHasProjects = async () => {
      if (!employeeId) {
        setEmployeeHasProjects(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('hr_project_employees')
          .select('id, status, end_date')
          .eq('assign_employee', employeeId)
          .neq('status', 'Terminated')
          .or('end_date.is.null,end_date.gte.' + new Date().toISOString().split('T')[0])
          .limit(1);

        if (error) throw error;
        setEmployeeHasProjects(data && data.length > 0);
      } catch (error: any) {
        console.error('Error checking project assignments:', error);
        setEmployeeHasProjects(false);
      }
    };
    fetchEmployeeHasProjects();
  }, [employeeId]);

  // ===============================================
  // Handlers that control SINGLE dialog state
  // ===============================================

  const handleAddTimesheet = useCallback(() => {
    console.log("🟢 Opening CREATE dialog");
    setSelectedTimesheet(null);
    closeSubmissionModal();
    setDialogKey(prev => prev + 1); // Force remount
    setActiveDialogType('CREATE');
  }, [closeSubmissionModal]);

  const handleViewTimesheet = useCallback((timesheet: TimeLog) => {
    console.log("🔵 Opening VIEW dialog");
    setSelectedTimesheet(timesheet);
    setDialogKey(prev => prev + 1); // Force remount
    setActiveDialogType('VIEW');
  }, []);

  const handleClarificationResponse = useCallback((timesheet: TimeLog) => {
    console.log("🟡 Opening CLARIFICATION dialog");
    setSelectedTimesheet(timesheet);
    setDialogKey(prev => prev + 1); // Force remount
    setActiveDialogType('CLARIFICATION');
  }, []);

  const handleCloseAllDialogs = useCallback(() => {
    console.log("⭕ Closing all dialogs");
    setActiveDialogType('NONE');
    setSelectedTimesheet(null);
    closeSubmissionModal();
    setDialogKey(prev => prev + 1); // Force remount
  }, [closeSubmissionModal]);

  const handleTimesheetCreated = useCallback(() => {
    console.log("✅ Timesheet created");
    fetchTimesheetData();
    handleCloseAllDialogs();
  }, [fetchTimesheetData, handleCloseAllDialogs]);

  // Handle global submission modal
  useEffect(() => {
    if (isSubmissionModalOpen && submissionTarget?.timeLog) {
      console.log("⚡ Submission modal triggered");
      setSelectedTimesheet(submissionTarget.timeLog);
      setDialogKey(prev => prev + 1);
      setActiveDialogType('VIEW');
    }
  }, [isSubmissionModalOpen, submissionTarget]);

  const activeTimesheet = submissionTarget?.timeLog || selectedTimesheet;

  // Log state for debugging
  console.log("🎯 Active Dialog:", activeDialogType, "| Key:", dialogKey);

  return (
    <div className="content-area">
      <TimesheetHeader 
        onAddTimesheet={handleAddTimesheet}
        employeeHasProjects={employeeHasProjects}
      />

      <TimesheetContent 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingTimesheets={pendingTimesheets}
        clarificationTimesheets={clarificationTimesheets}
        approvedTimesheets={approvedTimesheets}
        loading={loading}
        onViewTimesheet={handleViewTimesheet}
        onRespondToClarification={handleClarificationResponse}
        employeeHasProjects={employeeHasProjects}
      />
      
      {/* ===============================================
          ULTRA-STRICT: Only ONE can render at a time
          =============================================== */}
      
      {/* CREATE DIALOG */}
      {activeDialogType === 'CREATE' && employeeHasProjects ? (
        <CreateTimesheetDialog 
          key={`create-${dialogKey}`}
          open={true}
          onOpenChange={(open) => {
            if (!open) handleCloseAllDialogs();
          }}
          employeeHasProjects={employeeHasProjects}
          onTimesheetCreated={handleTimesheetCreated}
        />
      ) : null}
      
      {/* VIEW DIALOG */}
      {activeDialogType === 'VIEW' && activeTimesheet ? (
        <ViewTimesheetDialog 
          key={`view-${dialogKey}`}
          open={true}
          onOpenChange={(open) => {
            if (!open) handleCloseAllDialogs();
          }}
          timesheet={activeTimesheet}
          finalDurationMinutes={submissionTarget?.finalDurationMinutes}
          onSubmitTimesheet={() => {
            fetchTimesheetData();
            handleCloseAllDialogs();
          }}
          employeeHasProjects={employeeHasProjects}
        />
      ) : null}
      
      {/* CLARIFICATION DIALOG */}
      {activeDialogType === 'CLARIFICATION' && selectedTimesheet ? (
        <TimesheetClarificationDialog 
          key={`clarification-${dialogKey}`}
          open={true}
          onOpenChange={(open) => {
            if (!open) handleCloseAllDialogs();
          }}
          timesheet={selectedTimesheet}
          onSubmitClarification={() => {
            fetchTimesheetData();
            handleCloseAllDialogs();
          }}
        />
      ) : null}
    </div>
  );
};

export default Timesheet;