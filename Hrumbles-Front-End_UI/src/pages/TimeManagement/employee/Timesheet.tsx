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
 
const Timesheet = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState<TimeLog | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [clarificationDialogOpen, setClarificationDialogOpen] = useState(false);
  const [employeeHasProjects, setEmployeeHasProjects] = useState(false);

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
        console.log('Checking project assignments for employee:', { employeeId });
        const { data, error } = await supabase
          .from('hr_project_employees')
          .select('id, status, end_date')
          .eq('assign_employee', employeeId)
          .neq('status', 'Terminated')
          .or('end_date.is.null,end_date.gte.' + new Date().toISOString().split('T')[0])
          .limit(1);

        if (error) throw error;
        setEmployeeHasProjects(data && data.length > 0);
        console.log('Project assignments found:', { 
          hasProjects: data && data.length > 0, 
          count: data?.length, 
          status: data?.[0]?.status, 
          end_date: data?.[0]?.end_date 
        });
      } catch (error: any) {
        console.error('Error checking project assignments:', error);
        toast.error('Failed to load project assignment data');
        setEmployeeHasProjects(false);
      }
    };
    fetchEmployeeHasProjects();
  }, [employeeId]);

  const handleViewTimesheet = useCallback((timesheet: TimeLog) => {
    console.log('handleViewTimesheet triggered:', { timesheetId: timesheet.id });
    setSelectedTimesheet(timesheet);
    setViewDialogOpen(true);
  }, []);

  const handleClarificationResponse = useCallback((timesheet: TimeLog) => {
    console.log('handleClarificationResponse triggered:', { timesheetId: timesheet.id });
    setSelectedTimesheet(timesheet);
    setClarificationDialogOpen(true);
  }, []);

  const handleAddTimesheet = useCallback(() => {
    console.log('handleAddTimesheet triggered');
    setCreateDialogOpen(true);
  }, []);

  const handleTimesheetCreated = useCallback(() => {
    console.log('handleTimesheetCreated triggered');
    fetchTimesheetData();
  }, [fetchTimesheetData]);

  useEffect(() => {
    console.log('Timesheet state updated:', { 
      employeeId, 
      employeeHasProjects, 
      activeTab, 
      createDialogOpen, 
      viewDialogOpen, 
      clarificationDialogOpen, 
      selectedTimesheetId: selectedTimesheet?.id 
    });
  }, [employeeId, employeeHasProjects, activeTab, createDialogOpen, viewDialogOpen, clarificationDialogOpen, selectedTimesheet]);

  return (
    <div className="content-area">
      <TimesheetHeader 
        onAddTimesheet={handleAddTimesheet}
        employeeHasProjects={employeeHasProjects}
      />

      <TimesheetContent 
        activeTab={activeTab}
        setActiveTab={(tab) => {
          console.log('setActiveTab triggered:', { newTab: tab });
          setActiveTab(tab);
        }}
        pendingTimesheets={pendingTimesheets}
        clarificationTimesheets={clarificationTimesheets}
        approvedTimesheets={approvedTimesheets}
        loading={loading}
        onViewTimesheet={handleViewTimesheet}
        onRespondToClarification={handleClarificationResponse}
        employeeHasProjects={employeeHasProjects} // Pass employeeHasProjects
      />
      
      {employeeHasProjects && (
        <CreateTimesheetDialog 
          open={createDialogOpen}
          onOpenChange={(open) => {
            console.log('CreateTimesheetDialog open changed:', { open });
            setCreateDialogOpen(open);
          }}
          employeeHasProjects={employeeHasProjects}
          onTimesheetCreated={handleTimesheetCreated}
        />
      )}
      
      {selectedTimesheet && (
        <ViewTimesheetDialog 
          open={viewDialogOpen}
          onOpenChange={(open) => {
            console.log('ViewTimesheetDialog open changed:', { open });
            setViewDialogOpen(open);
            if (!open) setSelectedTimesheet(null);
          }}
          timesheet={selectedTimesheet}
          onSubmitTimesheet={fetchTimesheetData}
          employeeHasProjects={employeeHasProjects} // Pass employeeHasProjects
        />
      )}
      
      {selectedTimesheet && (
        <TimesheetClarificationDialog 
          open={clarificationDialogOpen}
          onOpenChange={(open) => {
            console.log('TimesheetClarificationDialog open changed:', { open });
            setClarificationDialogOpen(open);
            if (!open) setSelectedTimesheet(null);
          }}
          timesheet={selectedTimesheet}
          onSubmitClarification={fetchTimesheetData}
        />
      )}
    </div>
  );
};

export default Timesheet;