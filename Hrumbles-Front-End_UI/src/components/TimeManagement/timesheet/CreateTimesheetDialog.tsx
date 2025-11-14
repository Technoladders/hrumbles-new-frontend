import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { TimesheetDialogContent } from './dialog/TimesheetDialogContent';
import { useTimesheetValidation } from './hooks/useTimesheetValidation';
import { useTimesheetSubmission } from './hooks/useTimesheetSubmission';
import { DetailedTimesheetEntry } from '@/types/time-tracker-types';
import { toast } from 'sonner';
import { fetchHrProjectEmployees } from '@/api/timeTracker';

interface CreateTimesheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeHasProjects: boolean;
  onTimesheetCreated?: () => void;
}

export const CreateTimesheetDialog: React.FC<CreateTimesheetDialogProps> = ({
  open,
  onOpenChange,
  employeeHasProjects,
  onTimesheetCreated
}) => {
  // ========================================
  // Redux State
  // ========================================
  const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const employeeId = user?.id || "";
  
  // ========================================
  // Component State - All state lives here at the top level
  // ========================================
  const [date, setDate] = useState<Date>(new Date());
  const [detailedEntries, setDetailedEntries] = useState<DetailedTimesheetEntry[]>([]);
  const [projectEntries, setProjectEntries] = useState<
    { projectId: string; clockIn?: string; clockOut?: string; hours: number; report: string }[]
  >([]);
  const [hrProjectEmployees, setHrProjectEmployees] = useState<any[]>([]);
  
  // Clock-in and clock-out times for project-based timesheets
  const [clockIn, setClockIn] = useState<string | undefined>(undefined);
  const [clockOut, setClockOut] = useState<string | undefined>(undefined);

  // ========================================
  // Hooks
  // ========================================
  const { validateForm } = useTimesheetValidation();
  const { isSubmitting, submitTimesheet } = useTimesheetSubmission();

  // ========================================
  // Effects
  // ========================================
  
  // Fetch project employees when dialog opens
  useEffect(() => {
    const fetchData = async () => {
      if (open && employeeId && employeeHasProjects) {
        try {
          const data = await fetchHrProjectEmployees(employeeId);
          setHrProjectEmployees(data || []);
        } catch (error) {
          console.error('Error fetching project employees:', error);
          toast.error('Failed to load project assignments');
        }
      }
    };
    fetchData();
  }, [open, employeeId, employeeHasProjects]);

  // ========================================
  // Handlers
  // ========================================
  
  /**
   * Reset all form state to initial values
   */
  const resetForm = () => {
    setDate(new Date());
    setDetailedEntries([]);
    setProjectEntries([]);
    setClockIn(undefined);
    setClockOut(undefined);
    setHrProjectEmployees([]);
  };

  /**
   * Handle dialog close - reset form and notify parent
   */
  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  /**
   * Handle timesheet submission
   * @param title - Timesheet title (for non-project timesheets)
   * @param workReport - Work report/notes
   */
  const handleSubmit = async (title: string, workReport: string) => {
    // Validate user authentication
    if (!employeeId) {
      toast.error('User not authenticated. Please log in to submit a timesheet.');
      return;
    }

    // Validate form data
    if (!validateForm({
      employeeHasProjects,
      projectEntries,
      detailedEntries
    })) {
      return; // Validation errors are shown by validateForm
    }

    // Calculate total working hours from project entries
    const totalWorkingHours = employeeHasProjects 
      ? projectEntries.reduce((sum, entry) => sum + entry.hours, 0)
      : detailedEntries.reduce((sum, entry) => sum + entry.hours, 0);

    // Submit timesheet
    const success = await submitTimesheet({
      employeeId,
      title,
      workReport,
      totalWorkingHours,
      employeeHasProjects,
      projectEntries,
      detailedEntries,
      date,
      clockIn,
      clockOut,
      organization_id,
    });

    // Handle submission result
    if (success) {
      toast.success('Timesheet created successfully');
      
      // Notify parent component to refresh data
      if (onTimesheetCreated) {
        onTimesheetCreated();
      }
      
      // Close dialog and reset form
      handleClose();
    } else {
      toast.error('Failed to create timesheet. Please try again.');
    }
  };

  // ========================================
  // Render
  // ========================================
  // CRITICAL FIX: Pass open/onOpenChange directly to TimesheetDialogContent
  // This removes the nested Dialog issue
  return (
    <TimesheetDialogContent
      // Pass Dialog props directly
      open={open}
      onOpenChange={handleClose}
      
      // Date
      date={date}
      setDate={setDate}
      
      // Entries
      detailedEntries={detailedEntries}
      setDetailedEntries={setDetailedEntries}
      projectEntries={projectEntries}
      setProjectEntries={setProjectEntries}
      
      // Clock times
      clockIn={clockIn}
      setClockIn={setClockIn}
      clockOut={clockOut}
      setClockOut={setClockOut}
      
      // Project data
      hrProjectEmployees={hrProjectEmployees}
      
      // Configuration
      employeeHasProjects={employeeHasProjects}
      employeeId={employeeId}
      
      // State
      isSubmitting={isSubmitting}
      
      // Handlers
      handleClose={handleClose}
      handleSubmit={handleSubmit}
    />
  );
};