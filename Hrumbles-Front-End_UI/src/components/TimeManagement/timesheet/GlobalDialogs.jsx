// Create a new file, e.g., components/GlobalDialogs.jsx
import { useSelector } from 'react-redux';
import { ViewTimesheetDialog } from "@/components/TimeManagement/timesheet/ViewTimesheetDialog";
import { TaskupViewTimesheetDialog } from "@/components/TimeManagement/timesheet/TaskupViewTimesheetDialog"; 
import { useTimesheetStore } from '@/stores/timesheetStore';
import { useEmployeeContext } from '@/hooks/useEmployeeContext'; // You'll need this too


const TASKUP_ORG_ID = "0e4318d8-b1a5-4606-b311-c56d7eec47ce";
function GlobalDialogs() {
  const organizationId = useSelector((state) => state.auth.organization_id);
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

 if (organizationId === TASKUP_ORG_ID) {

  return (
    <TaskupViewTimesheetDialog 
      open={isSubmissionModalOpen}
      onOpenChange={handleDialogClose}
      timesheet={submissionTarget.timeLog}
      finalDurationMinutes={submissionTarget.finalDurationMinutes}
      onSubmitTimesheet={handleSubmissionSuccess}
      employeeHasProjects={employeeHasProjects}
    />
  );
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