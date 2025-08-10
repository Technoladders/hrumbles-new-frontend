import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { JobData } from "@/lib/types";
import { useAiJobFormState, JobFormData } from "./hooks/useAiJobFormState";
import { mapFormDataToJobData, validateStep } from "./utils/aiJobFormUtils";
import StepperNavigation from "../job/StepperNavigation"; // Reusable presentational component
import AiStepRenderer from "./AiStepRenderer"; // New step renderer
import { useSelector } from "react-redux";

interface Props {
  onClose: () => void;
  onSave: (job: JobData) => void;
  initialAiData?: Partial<JobFormData> | null;
}

export const AiJobStepperForm = ({ onClose, onSave, initialAiData }: Props) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3; // Internal jobs have 3 steps
  const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  const { formData, updateFormData } = useAiJobFormState({ initialAiData });
  const isCurrentStepValid = validateStep(currentStep, formData);

  const handleSave = () => {
    const finalJobData = mapFormDataToJobData(formData, organization_id, user.id);
    onSave(finalJobData);
  };

  return (
    <div className="space-y-8 py-4">
      <StepperNavigation currentStep={currentStep} totalSteps={totalSteps} jobType="Internal" />
      <div className="mt-8">
        <AiStepRenderer
          currentStep={currentStep}
          formData={formData}
          updateFormData={updateFormData}
        />
      </div>
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={currentStep === 1 ? onClose : () => setCurrentStep(currentStep - 1)}>
          {currentStep === 1 ? "Cancel" : "Back"}
        </Button>
        {currentStep < totalSteps ? (
          <Button onClick={() => setCurrentStep(currentStep + 1)} disabled={!isCurrentStepValid}>Next</Button>
        ) : (
          <Button onClick={handleSave} disabled={!isCurrentStepValid} className="bg-green-600 hover:bg-green-700">Create Job</Button>
        )}
      </div>
    </div>
  );
};