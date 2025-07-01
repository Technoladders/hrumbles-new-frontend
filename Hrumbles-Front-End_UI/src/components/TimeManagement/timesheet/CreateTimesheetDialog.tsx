import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Dialog } from "@/components/ui/dialog";
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
  const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const employeeId = user?.id || "";
  
  const [date, setDate] = useState<Date>(new Date());
  const [detailedEntries, setDetailedEntries] = useState<DetailedTimesheetEntry[]>([]);
  const [projectEntries, setProjectEntries] = useState<
    { projectId: string; clockIn?: string; clockOut?: string; hours: number; report: string }[]
  >([]);
  const [hrProjectEmployees, setHrProjectEmployees] = useState<any[]>([]);

  // Fetch hrProjectEmployees
  useEffect(() => {
    const fetchData = async () => {
      if (employeeId && employeeHasProjects) {
        const data = await fetchHrProjectEmployees(employeeId);
        setHrProjectEmployees(data);
      }
    };
    fetchData();
  }, [employeeId, employeeHasProjects]);

  const { validateForm } = useTimesheetValidation();
  const { isSubmitting, submitTimesheet } = useTimesheetSubmission();

  const resetForm = () => {
    setDate(new Date());
    setDetailedEntries([]);
    setProjectEntries([]);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async (title: string, workReport: string, clockIn?: string, clockOut?:string) => {
    if (!employeeId) {
      toast.error('User not authenticated. Please log in to submit a timesheet.');
      console.log('Submission blocked: No employeeId');
      return;
    }

    if (!validateForm({
      employeeHasProjects,
      projectEntries,
      detailedEntries
    })) {
      console.log('Validation failed:', { employeeHasProjects, projectEntries, detailedEntries });
      return;
    }

    const totalWorkingHours = projectEntries.reduce((sum, entry) => sum + entry.hours, 0);

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

    if (success) {
      toast.success('Timesheet created successfully');
      if (onTimesheetCreated) {
        onTimesheetCreated();
      }
      handleClose();
    } else {
      toast.error('Failed to create timesheet');
      console.log('Submission failed:', { employeeId, date, title, workReport });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <TimesheetDialogContent
        date={date}
        setDate={setDate}
        detailedEntries={detailedEntries}
        setDetailedEntries={setDetailedEntries}
        projectEntries={projectEntries}
        setProjectEntries={setProjectEntries}
        employeeHasProjects={employeeHasProjects}
        isSubmitting={isSubmitting}
        handleClose={handleClose}
        handleSubmit={handleSubmit}
        hrProjectEmployees={hrProjectEmployees}
        employeeId={employeeId}
      />
    </Dialog>
  );
};
// 