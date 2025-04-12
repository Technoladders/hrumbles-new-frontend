
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
  onClose: () => void;
  editJob: JobData | null;
  onSave: (job: JobData) => void;
}

export const JobStepperForm = ({ 
  jobType,
  onClose, 
  editJob = null,
  onSave
}: JobStepperFormProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = getTotalSteps(jobType);
  
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
  
  const isCurrentStepValid = validateStep(currentStep, formData, jobType);
  console.log("Is Current Step Valid:", isCurrentStepValid);
  
  const handleSave = () => {
    try {
      // Map form data to JobData structure
      console.log("Form data being mapped:", formData);
      const jobData = mapFormDataToJobData(formData, editJob, jobType);
  
      // Attach organization_id and created_by
      const finalJobData = {
        ...jobData,
        organization_id,
        created_by: user?.id, // Assuming user object has an `id`
      };
  
      console.log("Final job data with organization and creator:", finalJobData);
  
      // Pass updated job data to parent component
      onSave(finalJobData);
    } catch (error) {
      console.error("Error saving job:", error);
    }
  };
  
  return (
    <div className="space-y-8 py-4">
      {/* Stepper Navigation */}
      <StepperNavigation 
        currentStep={currentStep} 
        totalSteps={totalSteps}
        jobType={jobType}
      />
      
      {/* Step Content */}
      <div className="mt-8">
        <StepRenderer 
          currentStep={currentStep}
          jobType={jobType}
          formData={formData}
          onChange={handleStepChange}
          updateFormData={updateFormData}
        />
      </div>
      
      {/* Navigation Buttons */}
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
