// utils/jobFormValidation.ts

import { JobFormData } from "../hooks/useJobFormState";

type JobType = "Internal" | "External";
type InternalType = "Inhouse" | "Client Side" | null;

export const getTotalSteps = (jobType: JobType, internalType: InternalType): number => {
  // --- FIX: ALL flows are now 2 steps. ---
  return 2;
};

export const validateStep = (step: number, formData: JobFormData, jobType: JobType, internalType: InternalType): boolean => {
  // This is the "Inhouse" flow logic
  if (jobType === "Internal" && internalType === "Inhouse") {
    switch(step) {
      case 1:
        if (!formData.jobInformation) return false;
        return formData.jobInformation.jobId?.trim() !== "" && 
               formData.jobInformation.jobTitle?.trim() !== "" &&
               formData.jobInformation.jobLocation?.length > 0 &&
               formData.jobInformation.hiringMode !== "";
      case 2:
        if (!formData.jobDescription) return false; 
        return formData.jobDescription.description.length >= 100 &&
               formData.jobDescription.skills.length > 0;
      default:
        return false;
    }
  } else {
    // --- FIX: This is the new validation for the 2-step "External" and "Client Side" flows ---
    switch(step) {
      case 1: // This is the new, combined step
        // Validate a key field from both sections
        return !!formData.clientDetails?.clientName?.trim() && 
               !!formData.jobInformation?.jobId?.trim();
      case 2: // This is the Job Description step
        return !!formData.jobDescription && formData.jobDescription.description.length >= 100;
      default:
        return false;
    }
  }
};