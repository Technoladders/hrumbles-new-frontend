// src/components/jobs/ai/AiStepRenderer.tsx

import { ReactNode } from "react";
import { JobFormData } from "./hooks/useAiJobFormState";
import AiJobInformationStep from "./steps/AiJobInformationStep";
import AiExperienceSkillsStep from "./steps/AiExperienceSkillsStep";
import AiJobDescriptionStep from "./steps/AiJobDescriptionStep";

interface AiStepRendererProps {
  currentStep: number;
  formData: JobFormData;
  updateFormData: (step: keyof JobFormData, data: any) => void;
}

const AiStepRenderer = ({ currentStep, formData, updateFormData }: AiStepRendererProps): ReactNode => {
  // This workflow is simplified for Internal jobs, which have 3 steps.
  switch (currentStep) {
    case 1:
      return (
        <AiJobInformationStep
          data={formData.jobInformation}
          onChange={(data) => updateFormData("jobInformation", data)}
        />
      );
    case 2:
      return (
        <AiExperienceSkillsStep
          data={formData.experienceSkills}
          onChange={(data) => updateFormData("experienceSkills", data)}
        />
      );
    case 3:
      return (
        <AiJobDescriptionStep
          data={formData.jobDescription}
          onChange={(data) => updateFormData("jobDescription", data)}
        />
      );
    default:
      return null;
  }
};

export default AiStepRenderer;