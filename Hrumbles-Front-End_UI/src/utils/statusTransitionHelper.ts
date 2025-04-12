
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
    if (newSubStatusName === 'Reschedule Interview') {
      return true;
    }
    
    // Joining details required
    if (newSubStatusName === 'Joined') {
      return true;
    }
    
    // Rejection reason required
    if (newSubStatusName.includes('Reject')) {
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
  ): 'interview-schedule' | 'interview-feedback' | 'reschedule' | 'joining' | 'reject' | null => {
    if (!requiresSpecialInteraction(oldSubStatusName, newSubStatusName)) {
      return null;
    }
    
    if (newSubStatusName === 'Reschedule Interview') {
      return 'reschedule';
    }
    
    if (newSubStatusName === 'Technical Assessment' || 
        newSubStatusName === 'L1' || 
        newSubStatusName === 'L2' || 
        newSubStatusName === 'L3' || 
        newSubStatusName === 'End Client Round') {
      return 'interview-schedule';
    }
    
    if (newSubStatusName.includes('Selected') || 
        newSubStatusName.includes('Rejected')) {
      return 'interview-feedback';
    }
    
    if (newSubStatusName === 'Joined') {
      return 'joining';
    }
    
    if (newSubStatusName.includes('Reject')) {
      return 'reject';
    }
    
    return null;
  };
  
  /**
   * Determines the next round name based on the selected status
   */
  export const getInterviewRoundName = (statusName: string): string => {
    if (statusName === 'Technical Assessment') return 'Technical Assessment';
    if (statusName === 'L1') return 'L1';
    if (statusName === 'L2') return 'L2';
    if (statusName === 'L3') return 'L3';
    if (statusName === 'End Client Round') return 'End Client Round';
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
    
    return statusName.includes('Reject') || statusName === 'No Show';
  };
  