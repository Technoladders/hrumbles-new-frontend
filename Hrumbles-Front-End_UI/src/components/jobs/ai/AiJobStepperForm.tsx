import { useState, useEffect } from 'react'; // Import useEffect
import { Button } from "@/components/ui/button";
import { JobData } from "@/lib/types";
import { useAiJobFormState, JobFormData } from "./hooks/useAiJobFormState";
import { mapFormDataToJobData, mapJobDataToFormData, validateStep } from "./utils/aiJobFormUtils";
import StepperNavigation from "../job/StepperNavigation";
import AiStepRenderer from "./AiStepRenderer";
import { useSelector } from "react-redux";

interface Props {
  onClose: () => void;
  onSave: (job: JobData) => void;
  initialAiData?: Partial<JobFormData> | null;
  // ADDED: Accept editJob prop
  editJob?: JobData | null;
}

// ADDED: Utility function to map DB data to form data


export const AiJobStepperForm = ({ onClose, onSave, initialAiData, editJob }: Props) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  // MODIFIED: Pass a callback to the hook to receive the 'setFormData' function
  const { formData, updateFormData, setFormData } = useAiJobFormState({ initialAiData });
  const isCurrentStepValid = validateStep(currentStep, formData);

  // ADDED: useEffect to populate form when editJob is provided
  useEffect(() => {
    if (editJob) {
      // This line uses the new mapping function and will now work correctly
      const mappedData = mapJobDataToFormData(editJob);
      setFormData(mappedData);
    }
  }, [editJob, setFormData]);

  const handleSave = () => {
    // When saving, we need to include the job ID if we are editing
    const finalJobData = {
        ...mapFormDataToJobData(formData, organization_id, user.id),
        id: editJob ? editJob.id : undefined, // Include the ID for updates
    };
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
          // MODIFIED: Button text and action are now dynamic
          <Button onClick={handleSave} disabled={!isCurrentStepValid} className="bg-green-600 hover:bg-green-700">
            {editJob ? "Update Job" : "Create Job"}
          </Button>
        )}
      </div>
    </div>
  );
};