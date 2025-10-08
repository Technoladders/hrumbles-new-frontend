// JobStepperForm.tsx

import { useState } from 'react';
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
  internalType: "Inhouse" | "Client Side" | null;
  onBack: () => void; // MODIFICATION: Renamed from onClose for clarity
  editJob: JobData | null;
  onSave: (job: JobData) => void;
}

export const JobStepperForm = ({ 
  jobType,
  internalType,
  onBack, // MODIFICATION: Use the new prop
  editJob = null,
  onSave
}: JobStepperFormProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = getTotalSteps(jobType, internalType);
  
  const { formData, updateFormData } = useJobFormState({ jobType, editJob });
  const user = useSelector((state: any) => state.auth.user);
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  
  const handleNext = () => { if (currentStep < totalSteps) setCurrentStep(prev => prev + 1); };
  const handlePrevious = () => { if (currentStep > 1) setCurrentStep(prev => prev - 1); };
  const handleStepClick = (step: number) => { if (step < currentStep) setCurrentStep(step); };
  
  const handleStepChange = (step: string, data: any) => updateFormData(step, data);
  
  const isCurrentStepValid = validateStep(currentStep, formData, jobType, internalType);
  
  const handleSave = () => {
    try {
      const jobData = mapFormDataToJobData(formData, editJob, jobType, internalType);
      const finalJobData = { ...jobData, organization_id, created_by: user?.id };
      onSave(finalJobData);
    } catch (error) { console.error("Error saving job:", error); }
  };
  
  return (
    <div className="flex flex-col gap-8 py-4">
      <StepperNavigation 
        currentStep={currentStep} 
        jobType={jobType}
        internalType={internalType}
        onStepClick={handleStepClick}
      />
      
      <div className="flex-grow flex flex-col">
        <div className="flex-grow min-h-[300px]">
          <StepRenderer 
            currentStep={currentStep}
            jobType={jobType}
            formData={formData}
            internalType={internalType}
            updateFormData={handleStepChange}
          />
        </div>
        
        <div className="flex justify-between pt-8 mt-4 border-t">
          {/* MODIFICATION: Button now uses onBack and is labeled "Back" */}
          <Button 
            variant="outline" 
            onClick={currentStep === 1 ? onBack : handlePrevious}
          >
            {currentStep === 1 ? "Back" : "Previous Step"}
          </Button>
          
          <div className="flex gap-2">
            {currentStep < totalSteps ? (
              <Button onClick={handleNext} disabled={!isCurrentStepValid}>
                Next Step
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={!isCurrentStepValid} className="bg-green-600 hover:bg-green-700">
                {editJob ? "Update Job" : "Create Job"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};