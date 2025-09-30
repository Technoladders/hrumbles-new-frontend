// JobStepperForm.tsx

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { JobData } from "@/lib/types";
import { useJobFormState } from "./hooks/useJobFormState";
import { validateStep, getTotalSteps } from "./utils/jobFormValidation";
import { mapFormDataToJobData } from "./utils/mapFormDataToJobData";
import StepperNavigation from "./StepperNavigation";
import StepRenderer from "./StepRenderer";
import { useSelector } from "react-redux";

interface JobStepperFormProps {
  jobType: "Internal" | "External";
  // MODIFICATION START: Add `internalType` to the component's props.
  internalType: "Inhouse" | "Client Side" | null;
  // MODIFICATION END
  onClose: () => void;
  editJob: JobData | null;
  onSave: (job: JobData) => void;
}

export const JobStepperForm = ({ 
  jobType,
  // MODIFICATION START: Destructure the new prop.
  internalType,
  // MODIFICATION END
  onClose, 
  editJob = null,
  onSave
}: JobStepperFormProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  // MODIFICATION START: Pass `internalType` to `getTotalSteps` to get the correct number of steps.
  const totalSteps = getTotalSteps(jobType, internalType);
  // MODIFICATION END
  
  const { formData, updateFormData } = useJobFormState({ 
    jobType,
    editJob
  });
  const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  
  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const handleStepChange = (step: string, data: any) => {
    updateFormData(step, data);
  };
  
  // MODIFICATION START: Pass `internalType` to `validateStep` for correct step validation.
  const isCurrentStepValid = validateStep(currentStep, formData, jobType, internalType);
  // MODIFICATION END
  console.log("Is Current Step Valid:", isCurrentStepValid);
  
  const handleSave = () => {
    try {
      console.log("Form data being mapped:", formData);
      // MODIFICATION START: Pass `internalType` to the mapping function to ensure correct data structure.
      const jobData = mapFormDataToJobData(formData, editJob, jobType, internalType);
      // MODIFICATION END
  
      const finalJobData = {
        ...jobData,
        organization_id,
        created_by: user?.id,
      };
  
      console.log("Final job data with organization and creator:", finalJobData);
      onSave(finalJobData);
    } catch (error) {
      console.error("Error saving job:", error);
    }
  };
  
  return (
    <div className="space-y-8 py-4">
      <StepperNavigation 
        currentStep={currentStep} 
        totalSteps={totalSteps}
        jobType={jobType}
        // MODIFICATION START: Pass `internalType` to the navigation component.
        internalType={internalType}
        // MODIFICATION END
      />
      
      <div className="mt-8">
        <StepRenderer 
          currentStep={currentStep}
          jobType={jobType}
          formData={formData}
          // MODIFICATION START: Pass `internalType` to the step renderer.
          internalType={internalType}
          // MODIFICATION END
          onChange={handleStepChange}
          updateFormData={updateFormData}
        />
      </div>
      
      <div className="flex justify-between pt-4">
        <Button 
          variant="outline" 
          onClick={currentStep === 1 ? onClose : handlePrevious}
        >
          {currentStep === 1 ? "Cancel" : "Back"}
        </Button>
        
        <div className="flex gap-2">
          {currentStep < totalSteps ? (
            <Button 
              onClick={handleNext} 
              disabled={!isCurrentStepValid}
            >
              Next
            </Button>
          ) : (
            <Button 
              onClick={handleSave}
              disabled={!isCurrentStepValid}
              className="bg-green-600 hover:bg-green-700"
            >
              {editJob ? "Update Job" : "Create Job"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};