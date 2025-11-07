// StepRenderer.tsx

import { ReactNode } from "react";
import JobInformationStep from "./steps/JobInformationStep";
import JobDescriptionStep from "./steps/JobDescriptionStep";
// --- FIX 1: Import our NEW combined component ---
import ExternalJobInfoStep from "./steps/ExternalJobInfoStep";
// You no longer need ClientDetailsStep or ExperienceSkillsStep for this flow
import { JobFormData } from "./hooks/useJobFormState";

interface StepRendererProps {
  currentStep: number;
  formData: JobFormData;
  updateFormData: (step: string, data: any) => void;
  jobType: "Internal" | "External";
  internalType: "Inhouse" | "Client Side" | null;
}

const StepRenderer = ({ 
  currentStep, 
  formData, 
  updateFormData,
  jobType,
  internalType
}: StepRendererProps): ReactNode => {
  
  const isClientSideOrExternalFlow = jobType === "External" || (jobType === "Internal" && internalType === "Client Side");

  if (isClientSideOrExternalFlow) {
    // --- FIX 2: This is the new rendering logic for the "External" flow ---
    switch(currentStep) {
      case 1:
        // Render the NEW combined component for the first step.
        return (
          <ExternalJobInfoStep
            // Pass the combined data from both state slices
            data={{ ...formData.clientDetails, ...formData.jobInformation }}
            // When this component changes, update both state slices
            onChange={(data) => {
              updateFormData("clientDetails", data);
              updateFormData("jobInformation", data);
            }}
          />
        );
      case 2:
        // The Job Description step is now step 2.
        return <JobDescriptionStep data={formData.jobDescription} onChange={(data) => updateFormData("jobDescription", data)} />;
      default:
        return null;
    }
  } else { 
    // This is the "Inhouse" flow, which remains completely unchanged.
    switch(currentStep) {
      case 1:
        return ( <JobInformationStep data={formData.jobInformation} onChange={(data) => updateFormData("jobInformation", data)} jobType={jobType} /> );
      case 2:
        return ( <JobDescriptionStep data={formData.jobDescription} onChange={(data) => updateFormData("jobDescription", data)} /> );
      default:
        return null;
    }
  }
};

export default StepRenderer;