
import { ReactNode } from "react";
import JobInformationStep from "./steps/JobInformationStep";
import ExperienceSkillsStep from "./steps/ExperienceSkillsStep";
import ClientDetailsStep from "./steps/ClientDetailsStep";
import JobDescriptionStep from "./steps/JobDescriptionStep";
import { JobFormData } from "./hooks/useJobFormState";

interface StepRendererProps {
  currentStep: number;
  formData: JobFormData;
  updateFormData: (step: string, data: any) => void;
  jobType: "Internal" | "External";
}

const StepRenderer = ({ 
  currentStep, 
  formData, 
  updateFormData,
  jobType
}: StepRendererProps): ReactNode => {
  // For Internal jobs: Job Info -> Experience & Skills -> Job Description
  // For External jobs: Client Details -> Job Info -> Experience & Skills -> Job Description
  
  if (jobType === "Internal") {
    switch(currentStep) {
      case 1:
        return (
          <JobInformationStep 
            data={formData.jobInformation}
            onChange={(data) => updateFormData("jobInformation", data)}
            jobType={jobType}
          />
        );
      case 2:
        return (
          <ExperienceSkillsStep 
            data={formData.experienceSkills}
            onChange={(data) => updateFormData("experienceSkills", data)}
          />
        );
      case 3:
        return (
          <JobDescriptionStep 
            data={formData.jobDescription}
            onChange={(data) => updateFormData("jobDescription", data)}
          />
        );
      default:
        return null;
    }
  } else { // External jobs
    switch(currentStep) {
      case 1:
        return (
          <ClientDetailsStep 
            data={formData.clientDetails}
            onChange={(data) => updateFormData("clientDetails", data)}
            hiringMode={formData.jobInformation.hiringMode}
          />
        );
      case 2:
        return (
          <JobInformationStep 
            data={formData.jobInformation}
            onChange={(data) => updateFormData("jobInformation", data)}
            jobType={jobType}
          />
        );
      case 3:
        return (
          <ExperienceSkillsStep 
            data={formData.experienceSkills}
            onChange={(data) => updateFormData("experienceSkills", data)}
          />
        );
      case 4:
        return (
          <JobDescriptionStep 
            data={formData.jobDescription}
            onChange={(data) => updateFormData("jobDescription", data)}
          />
        );
      default:
        return null;
    }
  }
};

export default StepRenderer;
