// StepperNavigation.tsx

import { Check } from "lucide-react";

interface StepperNavigationProps {
  currentStep: number;
  jobType: "Internal" | "External";
  internalType: "Inhouse" | "Client Side" | null;
  onStepClick: (step: number) => void;
}

const StepperNavigation = ({ currentStep, jobType, internalType, onStepClick }: StepperNavigationProps) => {
  const getSteps = (): string[] => {
    if (jobType === "External" || (jobType === "Internal" && internalType === "Client Side")) {
      return ["Client Details", "Job Information", "Experience & Skills", "Job Description"];
    }
    if (jobType === "Internal" && internalType === "Inhouse") {
      return ["Job Information", "Experience & Skills", "Job Description"];
    }
    return [];
  };

  const steps = getSteps();
  const totalSteps = steps.length;
  
  const progressPercentage = totalSteps > 1 ? ((currentStep - 1) / (totalSteps - 1)) * 100 : 0;

  return (
    <div className="relative w-full">
      <div className="flex justify-between items-center">
        {/* Progress Bar */}
        <div className="absolute top-4 left-0 w-full h-0.5 bg-gray-200" />
        <div 
          className="absolute top-4 left-0 h-0.5 bg-blue-600 transition-all duration-500 ease-in-out"
          style={{ width: `calc(${progressPercentage}% - 1rem)` }}
        />
        
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;

          return (
            <button
              key={index}
              disabled={!isCompleted}
              onClick={() => onStepClick(stepNumber)}
              className="z-10 flex flex-col items-center disabled:cursor-not-allowed"
            >
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                  ${isCompleted ? "bg-blue-600 text-white" : ""}
                  ${isActive ? "bg-blue-600 text-white ring-4 ring-blue-100" : ""}
                  ${!isCompleted && !isActive ? "bg-white border-2 border-gray-300 text-gray-500" : ""}
                `}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : <span>{stepNumber}</span>}
              </div>
              <h4 
                className={`mt-2 text-xs text-center font-medium transition-colors duration-300 w-24
                  ${isActive ? "text-blue-700" : "text-gray-500"}
                  ${isCompleted ? "text-gray-600 group-hover:text-blue-700" : ""}
                `}
              >
                {step}
              </h4>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StepperNavigation;