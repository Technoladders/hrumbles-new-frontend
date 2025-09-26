// utils/jobFormValidation.ts

import { JobFormData } from "../hooks/useJobFormState";

// MODIFICATION START: Define types for clarity and to pass the new `internalType`.
type JobType = "Internal" | "External";
type InternalType = "Inhouse" | "Client Side" | null;

export const getTotalSteps = (jobType: JobType, internalType: InternalType): number => {
  // An internal job for a "Client Side" is treated like an external job, so it has 4 steps.
  if (jobType === "Internal" && internalType === "Client Side") {
    return 4;
  }
  // A standard "Inhouse" internal job has 3 steps.
  if (jobType === "Internal" && internalType === "Inhouse") {
    return 3;
  }
  // External jobs have 4 steps.
  return 4;
};

export const validateStep = (step: number, formData: JobFormData, jobType: JobType, internalType: InternalType): boolean => {
// MODIFICATION END
 
  console.log("Validating Step:", step);
  console.log("Form Data:", formData);
  
  // MODIFICATION START: The validation logic now checks for the "Inhouse" type specifically.
  if (jobType === "Internal" && internalType === "Inhouse") {
  // MODIFICATION END
    switch(step) {
      case 1: // Job Information
        return formData.jobInformation.jobId.trim() !== "" && 
               formData.jobInformation.jobTitle.trim() !== "" &&
               formData.jobInformation.jobLocation.length > 0 &&
               formData.jobInformation.hiringMode !== "";
      
      case 2: // Experience & Skills
        return formData.experienceSkills.skills.length > 0 &&
               (formData.experienceSkills.minimumYear > 0 || formData.experienceSkills.minimumMonth > 0);
      
      case 3: // Job Description
        return formData.jobDescription.description.length >= 50;
      
      default:
        return true;
    }
  } else {
    // MODIFICATION START: This block now handles both "External" jobs and "Internal (Client Side)" jobs.
    // The logic is the same for both.
    switch(step) {
      case 1: // Client Details
        return formData.clientDetails.clientName.trim() !== "" &&
               formData.clientDetails.clientBudget.trim() !== "";
      
      case 2: // Job Information
        return formData.jobInformation.jobId.trim() !== "" && 
               formData.jobInformation.jobTitle.trim() !== "" &&
               formData.jobInformation.jobLocation.length > 0;
      
      case 3: // Experience & Skills
        return formData.experienceSkills.skills.length > 0 &&
               (formData.experienceSkills.minimumYear > 0 || formData.experienceSkills.minimumMonth > 0);
      
      case 4: // Job Description
        return formData.jobDescription.description.length >= 50;
      
      default:
        return true;
    }
    // MODIFICATION END
  }
};