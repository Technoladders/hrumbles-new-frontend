/**
 * Helper utilities specifically for the Taskup organization's status transitions.
 */

export const getRequiredInteractionType = (
  oldSubStatusName: string | undefined,
  newSubStatusName: string
): 'rejection-with-date' | 'date-only' | 'reason-only' | 'feedback-only' | 'interview-schedule' | 'joining' | 'billing' | null => {

  // --- Date and Reason Required ---
  if (
    newSubStatusName === 'Rejected by CHRO' ||
    newSubStatusName === 'Candidate No-Show' ||
    newSubStatusName === 'Rejected by Client' ||
    newSubStatusName === 'CV Rejected by Client' ||
    newSubStatusName === 'Candidate Withdrew' ||
    newSubStatusName === 'Did Not Complete 1 Month'
  ) {
    return 'rejection-with-date'; // We can reuse the reject modal for this.
  }

  // --- Only Date Required ---
  if (
    newSubStatusName === 'Forwarded by CHRO' ||
    newSubStatusName === 'Submitted to Client' ||
    newSubStatusName === 'Training Scheduled' ||
    newSubStatusName === 'Offer Released' ||
    newSubStatusName === 'Joined'
  ) {
    return 'date-only'; // Suggests a new simple modal for date input.
  }
  
  // --- Only Reason/Feedback Required ---
   if (
    newSubStatusName === 'Duplicate Applicants' ||
    newSubStatusName === 'Fresher – Not Eligible' ||
    newSubStatusName === 'CV Not Suitable' ||
    newSubStatusName === 'Potential Fit for Other Role' ||
    newSubStatusName === 'Offer Declined by Candidate' ||
    newSubStatusName === 'Not Interested'
  ) {
    return 'reason-only'; // Can also reuse the reject modal, just relabeling the fields.
  }

  // --- Interview Scheduling ---
  if (
    newSubStatusName === 'Level 1 Interview (L1)' ||
    newSubStatusName === 'Level 2 Interview (L2)' ||
    newSubStatusName === 'Level 3 – Management Round' ||
    newSubStatusName === 'Telephonic Interview' ||
    newSubStatusName === 'Face-to-Face Interview' ||
    newSubStatusName === 'Virtual Interview'
  ) {
    return 'interview-schedule';
  }
  
  // --- Joined Modal ---
  if (newSubStatusName === 'Completed 1 Month') {
      return 'joining';
  }

  // --- Billing Modal ---
  if (newSubStatusName === 'Billing Pending') {
    return 'billing'; // Suggests a new simple modal for billing details.
  }

  return null;
};