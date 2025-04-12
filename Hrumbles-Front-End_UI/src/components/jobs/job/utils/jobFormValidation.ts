
import { JobFormData } from "../hooks/useJobFormState";

export const getTotalSteps = (jobType: "Internal" | "External"): number => {
  if (jobType === "Internal") {
    return 3; // Job Info, Experience & Skills, Job Description
  } else { // External
    return 4; // Client Details, Job Info, Experience & Skills, Job Description
  }
};

export const validateStep = (step: number, formData: JobFormData, jobType: "Internal" | "External"): boolean => {
 
  console.log("Validating Step:", step);
  console.log("Form Data:", formData);
  if (jobType === "Internal") {
    // Validation for Internal jobs
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
    // Validation for External jobs
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
  }
};
