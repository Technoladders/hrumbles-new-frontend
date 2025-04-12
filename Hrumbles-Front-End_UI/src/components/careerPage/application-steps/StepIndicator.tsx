
import React from 'react';
import { CheckCircle } from 'lucide-react';

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, totalSteps }) => {
  return (
    <div className="flex justify-center mb-8">
      <div className="flex items-center">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isPast = stepNumber < currentStep;
          
          return (
            <React.Fragment key={index}>
              <div 
                className={`flex items-center justify-center rounded-full transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isPast
                    ? 'bg-blue-100 text-blue-500 border border-blue-200'
                    : 'bg-gray-100 text-gray-400 border border-gray-200'
                } w-10 h-10`}
              >
                {isPast ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-medium">{stepNumber}</span>
                )}
              </div>
              {index < totalSteps - 1 && (
                <div className={`w-16 h-1 ${
                  isPast ? 'bg-blue-400' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default StepIndicator;
