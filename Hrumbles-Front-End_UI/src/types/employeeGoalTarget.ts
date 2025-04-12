import { Employee, GoalType } from "./goal";

export interface EmployeeGoalTarget {
  employee: Employee;
  targetValue: number;
}

export interface GoalAssignmentData {
  goalId: string;
  goalType: GoalType;
  startDate: Date | undefined;
  endDate: Date | undefined;
  employeeTargets: EmployeeGoalTarget[];
}

export const calculateGoalStatus = (
  startDate: Date | undefined,
  endDate: Date | undefined,
  goalType: GoalType,
  progress: number
): 'pending' | 'in-progress' | 'completed' | 'overdue' => {
  if (!startDate || !endDate) return 'pending';
  
  const now = new Date();
  
  // If not started yet
  if (now < startDate) return 'pending';
  
  // If already completed (100% progress)
  if (progress >= 100) return 'completed';
  
  // If past end date and not completed
  if (now > endDate) return 'overdue';
  
  // Otherwise in progress
  return 'in-progress';
};

export const getNextDueDate = (
  startDate: Date,
  goalType: GoalType
): Date => {
  const nextDue = new Date(startDate);
  
  switch (goalType) {
    case 'Daily':
      nextDue.setDate(nextDue.getDate() + 1);
      break;
    case 'Weekly':
      nextDue.setDate(nextDue.getDate() + 7);
      break;
    case 'Monthly':
      nextDue.setMonth(nextDue.getMonth() + 1);
      break;
    case 'Yearly':
      nextDue.setFullYear(nextDue.getFullYear() + 1);
      break;
  }
  
  return nextDue;
};
