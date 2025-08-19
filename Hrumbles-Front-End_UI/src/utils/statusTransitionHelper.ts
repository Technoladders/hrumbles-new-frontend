/**
 * Helper utilities for status transitions in the HR pipeline
 */

/**
 * Determines if a status change requires a special interaction (modal dialog)
 */
export const requiresSpecialInteraction = (
  oldSubStatusName: string | undefined, 
  newSubStatusName: string
): boolean => {
  // Interview scheduling required
  if (newSubStatusName === 'Technical Assessment' || 
      newSubStatusName === 'L1' || 
      newSubStatusName === 'L2' || 
      newSubStatusName === 'L3' || 
      newSubStatusName === 'End Client Round') {
    return true;
  }
  
  // Interview feedback required
  if (newSubStatusName.includes('Selected') || 
      newSubStatusName.includes('Rejected')) {
    return true;
  }
  
  // Reschedule interview
  if (newSubStatusName.startsWith('Reschedule ')) {
    return true;
  }
  
  // Joining details required
  if (newSubStatusName === 'Joined' || newSubStatusName === 'Offer Issued') {
    return true;
  }
  
  // Rejection reason required
  if (newSubStatusName.includes('Reject')) {
    return true;
  }
  
  // Actual CTC required
  if (newSubStatusName === 'Processed (Client)') {
    return true;
  }
  
  return false;
};

/**
 * Gets the interaction type required for this status change
 */
export const getRequiredInteractionType = (
  oldSubStatusName: string | undefined, 
  newSubStatusName: string
): 'interview-schedule' | 'interview-feedback' | 'reschedule' | 'joining' | 'reject' | 'actual-ctc' | null => {
  if (newSubStatusName.startsWith('Reschedule ')) {
    return 'reschedule';
  }
  
  if (newSubStatusName === 'Technical Assessment' || 
      newSubStatusName === 'L1' || 
      newSubStatusName === 'L2' || 
      newSubStatusName === 'L3' || 
      newSubStatusName === 'End Client Round' ||
      newSubStatusName === 'Interview Scheduled' ||
      newSubStatusName === 'In-Person Interview' ||
      newSubStatusName === 'HR Round') {

    return 'interview-schedule';
  }
  
  if (newSubStatusName.includes('Selected') || newSubStatusName.includes('Rejected')) {
    return 'interview-feedback';
  }
  
  if (newSubStatusName === 'Joined' || newSubStatusName === 'Offer Issued' || newSubStatusName === 'Offer Made') {

    return 'joining';
  }
  
  // **MODIFICATION: "Candidate Dropped" should trigger the reject modal**
  if (newSubStatusName.includes('Reject') || newSubStatusName === 'Candidate Dropped') {
    return 'reject';
  }
  
  if (newSubStatusName === 'Processed (Client)') {
    return 'actual-ctc';
  }
  
  return null;
};


/**
 * Determines the round name based on the status
 */
export const getInterviewRoundName = (statusName: string): string => {
  if (statusName === 'Technical Assessment' || statusName === 'Reschedule Technical Assessment') {
    return 'Technical Assessment';
  }
  if (statusName === 'L1' || statusName === 'Reschedule L1') {
    return 'L1';
  }
  if (statusName === 'L2' || statusName === 'Reschedule L2') {
    return 'L2';
  }
  if (statusName === 'L3' || statusName === 'Reschedule L3') {
    return 'L3';
  }
  if (statusName === 'End Client Round' || statusName === 'Reschedule End Client Round') {
    return 'End Client Round';
  }

    // ADDED: iTech interview rounds
  if (statusName === 'Interview Scheduled') return 'Interview';
  if (statusName === 'In-Person Interview') return 'In-Person Interview';
  if (statusName === 'HR Round') return 'HR Round';
  return 'Interview';
};

/**
 * Extract round name from a status result (Selected/Rejected)
 */
export const getRoundNameFromResult = (statusName: string): string | null => {
  const rounds = ['Technical Assessment', 'L1', 'L2', 'L3', 'End Client Round'];
  
  for (const round of rounds) {
    if (statusName.includes(round)) {
      return round;
    }
  }
  
  return null;
};

/**
 * Determine if a status is terminal (no further updates allowed)
 */
export const isTerminalStatus = (statusName: string | undefined): boolean => {
  if (!statusName) return false;
  
  // **MODIFICATION: Add new terminal status checks**
  return statusName.includes('Reject') || 
         statusName.includes('No Show') ||
         statusName === 'Offer Declined' ||
         statusName.includes('Rejected') ||
            statusName === 'Offer Rejected' ||
         statusName === 'Candidate Dropped';
};