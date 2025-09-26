// StepRenderer.tsx

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
  // MODIFICATION START: Add `internalType` to the component's props.
  internalType: "Inhouse" | "Client Side" | null;
  // MODIFICATION END
}

const StepRenderer = ({ 
  currentStep, 
  formData, 
  updateFormData,
  jobType,
  // MODIFICATION START: Destructure the new prop.
  internalType
  // MODIFICATION END
}: StepRendererProps): ReactNode => {
  
  // MODIFICATION START: Create a boolean flag to simplify the logic.
  // This is true for both "External" jobs and "Internal (Client Side)" jobs.
  const isClientSideFlow = jobType === "External" || (jobType === "Internal" && internalType === "Client Side");
  // MODIFICATION END

  // MODIFICATION START: If it's a client-side flow, render the 4-step process.
  if (isClientSideFlow) {
    switch(currentStep) {
      case 1:
        return <ClientDetailsStep data={formData.clientDetails} onChange={(data) => updateFormData("clientDetails", data)} hiringMode={formData.jobInformation.hiringMode} />;
      case 2:
        return <JobInformationStep data={formData.jobInformation} onChange={(data) => updateFormData("jobInformation", data)} jobType={jobType} />;
      case 3:
        return <ExperienceSkillsStep data={formData.experienceSkills} onChange={(data) => updateFormData("experienceSkills", data)} />;
      case 4:
        return <JobDescriptionStep data={formData.jobDescription} onChange={(data) => updateFormData("jobDescription", data)} />;
      default:
        return null;
    }
  } else { // This block now exclusively handles the "Internal (Inhouse)" flow.
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
  }
  // MODIFICATION END
};

export default StepRenderer;