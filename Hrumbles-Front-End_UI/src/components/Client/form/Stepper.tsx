import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface StepperProps {
  steps: string[];
  currentStep: number;
}

const Stepper = ({ steps, currentStep }: StepperProps) => {
  return (
    <nav className="w-full px-4 py-6" aria-label="Progress">
      <ol className="flex justify-between items-center w-full relative">
        {steps.map((step, index) => {
          const stepIndex = index + 1;
          const isCompleted = currentStep > stepIndex;
          const isCurrent = currentStep === stepIndex;

          return (
            <li key={step} className="flex flex-col items-center flex-1 relative">
              {/* Step Circle */}
              <motion.div
                initial={false}
                animate={isCurrent ? "active" : isCompleted ? "completed" : "inactive"}
                variants={{
                  active: { scale: 1.1, transition: { type: "spring", stiffness: 300, damping: 20 } },
                  completed: { scale: 1 },
                  inactive: { scale: 1 },
                }}
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors duration-300
                  ${isCompleted ? "bg-indigo-600 text-white" : ""}
                  ${isCurrent ? "bg-indigo-600 text-white ring-4 ring-indigo-200" : ""}
                  ${!isCompleted && !isCurrent ? "bg-gray-200 text-gray-500" : ""}
                `}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : <span>{stepIndex}</span>}
              </motion.div>

              {/* Step Label */}
              <span
                className={`mt-2 text-sm font-medium text-center ${
                  isCurrent ? "text-indigo-600" : "text-gray-600"
                }`}
              >
                {step}
              </span>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="absolute top-5 left-1/2 w-full -z-10">
                  <div className="h-0.5 bg-gray-200">
                    <motion.div
                      className="h-0.5 bg-indigo-600"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: isCompleted ? 1 : 0 }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                      style={{ transformOrigin: "left" }}
                    />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Stepper;
