// Create a new file, e.g., components/GlobalDialogs.jsx

import { ViewTimesheetDialog } from "@/components/TimeManagement/timesheet/ViewTimesheetDialog";
import { useTimesheetStore } from '@/stores/timesheetStore';
import { useEmployeeContext } from '@/hooks/useEmployeeContext'; // You'll need this too

function GlobalDialogs() {
  const { 
    isSubmissionModalOpen, 
    submissionTarget, 
    closeSubmissionModal,
    triggerTrackerRefresh
  } = useTimesheetStore();

  const { employeeHasProjects } = useEmployeeContext(); // Get context here

  const handleDialogClose = (open) => {
    if (!open) {
      closeSubmissionModal();
    }
  };

  const handleSubmissionSuccess = () => {
    triggerTrackerRefresh(); 
    closeSubmissionModal();
  };

  if (!isSubmissionModalOpen || !submissionTarget) {
    return null;
  }

  return (
    <ViewTimesheetDialog 
      open={isSubmissionModalOpen}
      onOpenChange={handleDialogClose}
      timesheet={submissionTarget.timeLog}
      finalDurationMinutes={submissionTarget.finalDurationMinutes}
      onSubmitTimesheet={handleSubmissionSuccess}
      employeeHasProjects={employeeHasProjects}
    />
  );
}

export default GlobalDialogs;