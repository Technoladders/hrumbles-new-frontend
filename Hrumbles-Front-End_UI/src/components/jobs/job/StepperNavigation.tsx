
import { Check } from "lucide-react";

interface StepperNavigationProps {
  currentStep: number;
  totalSteps: number;
  jobType: "Internal" | "External";
}

const StepperNavigation = ({ currentStep, totalSteps, jobType }: StepperNavigationProps) => {
  // Generate steps based on job type
  const getSteps = (): string[] => {
    if (jobType === "Internal") {
      return ["Job Information", "Experience & Skills", "Job Description"];
    } else { // External
      return ["Client Details", "Job Information", "Experience & Skills", "Job Description"];
    }
  };
  
  const steps = getSteps();
  
  return (
    <div className="relative">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={index} className="relative flex flex-col items-center">
            <div 
              className={`w-10 h-10 rounded-full flex items-center justify-center z-10 ${
                index + 1 < currentStep
                  ? "bg-button text-white"
                  : index + 1 === currentStep
                  ? "bg-button text-white ring-4 ring-blue-200"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {index + 1 < currentStep ? (
                <Check className="w-6 h-6" />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            <span 
              className={`text-xs font-medium mt-2 text-center ${
                index + 1 <= currentStep ? "text-blue-600" : "text-gray-500"
              }`}
            >
              {step}
            </span>
          </div>
        ))}
      </div>
      
      {/* Progress bar */}
      <div 
        className="absolute top-5 h-0.5 bg-gray-200 left-0 right-0 -translate-y-1/2 z-0"
        style={{ transform: "translate(0, -50%)" }}
      >
        <div 
          className="h-full bg-button-hover transition-all duration-300"
          style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
        ></div>
      </div>
    </div>
  );
};

export default StepperNavigation;
