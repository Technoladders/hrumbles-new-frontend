
export const getWorkflowState = (timeLog: any) => {
  return (timeLog as any).workflow_state || 
    (timeLog.is_approved ? 'approved' : 
     timeLog.clarification_status === 'needed' ? 'clarification_needed' :
     timeLog.clarification_status === 'submitted' ? 'clarification_submitted' :
     timeLog.is_submitted ? 'pending' : 'unsubmitted');
};

export const canRegularize = (timeLog: any) => {
  if (!timeLog.clock_out_time) return false;
  if (timeLog.status === 'absent') return false;
  
  const currentDate = new Date();
  const timesheetDate = new Date(timeLog.date);
  const daysDifference = Math.floor((currentDate.getTime() - timesheetDate.getTime()) / (1000 * 60 * 60 * 24));
  
  return daysDifference <= 10;
};
