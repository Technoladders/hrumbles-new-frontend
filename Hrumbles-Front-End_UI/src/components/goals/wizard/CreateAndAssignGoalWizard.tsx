import React, { useState, useEffect } from 'react';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import Step1_SelectDepartmentAndMetric from './Step1_SelectDepartmentAndMetric';
import Step2_DefineGoalAndPeriod from './Step2_DefineGoalAndPeriod';
import Step3_AssignEmployees from './Step3_AssignEmployees';
import { Goal, GoalType } from '@/types/goal';
const StepperHeader = ({ currentStep }: { currentStep: number }) => {
  const steps = ['Selection', 'Goal & Period', 'Assign Employees'];
  return (
    <div className="flex items-center w-full mb-8">
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const isActive = currentStep === stepNumber;
        const isCompleted = currentStep > stepNumber;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center text-center">
              <motion.div
                animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-colors duration-300",
                  isCompleted ? "bg-green-600 text-white" : "",
                  isActive ? "bg-primary text-white shadow-lg shadow-primary/50" : "bg-gray-200 text-gray-500"
                )}
              >
                {isCompleted ? '✔' : stepNumber}
              </motion.div>
              <p className={cn("text-sm mt-2 w-28", isActive ? "text-primary font-semibold" : "text-gray-500")}>{label}</p>
            </div>
            {index < steps.length - 1 && (
              <div className="flex-1 h-1 mx-4">
                <div className="bg-gray-200 h-full w-full rounded-full">
                  <motion.div
                    className="bg-green-600 h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: isCompleted ? '100%' : '0%' }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  />
                </div>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: '0%', opacity: 1 },
  exit: (direction: number) => ({ x: direction < 0 ? '100%' : '-100%', opacity: 0 }),
};
export type GoalDefinition = {
  type: 'existing' | 'new';
  id?: string; // for existing goals
  payload?: Partial<Goal>; // for new goals
  name: string; // Always need the name for display
};
interface CreateAndAssignGoalWizardProps {
  onCancel: () => void;
  onSuccess: () => void;
}
const CreateAndAssignGoalWizard: React.FC<CreateAndAssignGoalWizardProps> = ({ onCancel, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
 
  // Data collected across steps
  const [department, setDepartment] = useState('');
  const [metric, setMetric] = useState('');
  const [goal, setGoal] = useState<Goal | null>(null);
  const [goalDefinition, setGoalDefinition] = useState<GoalDefinition | null>(null);
  const [period, setPeriod] = useState<{ type: GoalType, start: Date, end: Date } | null>(null);
  const goToNext = () => setDirection(1);
  const goToPrev = () => setDirection(-1);
  const handleStep1Next = (selectedDept: string, selectedMetric: string) => {
    goToNext();
    setDepartment(selectedDept);
    setMetric(selectedMetric);
    setStep(2);
  };
  const handleStep2Next = (selectedGoalDef: GoalDefinition, selectedPeriod: { type: GoalType, start: Date, end: Date }) => {
    goToNext();
    setGoalDefinition(selectedGoalDef);
    setPeriod(selectedPeriod);
    setStep(3);
  };
 
 
  const handleBackToStep1 = () => { goToPrev(); setStep(1); };
  const handleBackToStep2 = () => { goToPrev(); setStep(2); };
  return (
    <DialogContent className="sm:max-w-4xl h-auto ">
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold">Create & Assign New Goal</DialogTitle>
        <DialogDescription>A guided process to set up and assign goals for your team.</DialogDescription>
      </DialogHeader>
     
      <div className="pt-6">
        <StepperHeader currentStep={step} />
        <div className="relative min-h-[450px] overflow-hidden">
          <AnimatePresence initial={false} custom={direction}>
            <motion.div
              key={step}
              className="absolute w-full"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
            >
              {step === 1 && <Step1_SelectDepartmentAndMetric onNext={handleStep1Next} onCancel={onCancel} />}
              {step === 2 && <Step2_DefineGoalAndPeriod department={department} metric={metric} onNext={handleStep2Next} onBack={handleBackToStep1} />}
              {/* Pass the new goalDefinition prop */}
              {step === 3 && goalDefinition && period && <Step3_AssignEmployees goalDefinition={goalDefinition} period={period} department={department} onBack={handleBackToStep2} onSuccess={onSuccess} onCancel={onCancel} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </DialogContent>
  );
};
export default CreateAndAssignGoalWizard;