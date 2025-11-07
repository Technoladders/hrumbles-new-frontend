// src/components/jobs/job/StepperNavigation.tsx

import { Check } from "lucide-react";

interface StepperNavigationProps {
  currentStep: number;
  jobType: "Internal" | "External";
  internalType: "Inhouse" | "Client Side" | null;
  onStepClick: (step: number) => void;
}

const StepperNavigation = ({ currentStep, jobType, internalType, onStepClick }: StepperNavigationProps) => {
  // This logic correctly determines the step titles for each flow.
  const getSteps = (): string[] => {
    if (jobType === "External" || (jobType === "Internal" && internalType === "Client Side")) {
      return ["Client & Job Details", "Job Description"];
    }
    if (jobType === "Internal" && internalType === "Inhouse") {
      return ["Job Information", "Job Description & Skills"];
    }
    return [];
  };

  const steps = getSteps();
  const totalSteps = steps.length;
  
  const progressPercentage = totalSteps > 1 ? ((currentStep - 1) / (totalSteps - 1)) * 100 : 0;

  return (
    <div className="relative w-full">
      <div className="flex justify-between items-center">
        
        {/* --- FIX 1: The progress bar is now a gradient --- */}
        <div className="absolute top-4 left-0 w-full h-0.5 bg-gray-200" />
        <div 
          className="absolute top-4 left-0 h-0.5 bg-gradient-to-r from-purple-600 to-pink-500 transition-all duration-500 ease-in-out"
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
              className="z-10 flex flex-col items-center disabled:cursor-not-allowed group"
            >
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                  ${
                    // --- FIX 2: Completed and Active states now use the gradient ---
                    isCompleted 
                      ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white" 
                      : ""
                  }
                  ${
                    isActive 
                      ? "bg-gradient-to-r from-purple-600 to-pink-500 text-white ring-4 ring-purple-100" // Gradient with a purple ring
                      : ""
                  }
                  ${
                    !isCompleted && !isActive 
                      ? "bg-white border-2 border-gray-300 text-gray-500" 
                      : ""
                  }
                `}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : <span>{stepNumber}</span>}
              </div>
              <h4 
                className={`mt-2 text-xs text-center font-medium transition-colors duration-300 w-24
                  ${
                    // --- FIX 3: The active step text is now purple ---
                    isActive 
                      ? "text-purple-700" 
                      : "text-gray-500"
                  }
                  ${
                    isCompleted 
                      ? "text-gray-600 group-hover:text-purple-700" 
                      : ""
                  }
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