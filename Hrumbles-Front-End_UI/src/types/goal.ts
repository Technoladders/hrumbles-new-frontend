
export type SectorType = 'HR' | 'Sales' | 'Finance' | 'Operations' | 'Marketing';
export type MetricType = 'percentage' | 'currency' | 'count' | 'hours' | 'custom';
export type GoalType = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';

export interface Employee {
  id: string;
  name: string;
  position: string;
  department: SectorType;
  email: string;
  avatar?: string;
}

export interface Goal {
  id: string;
  name: string;
  description: string;
  sector: SectorType;
  targetValue: number;
  metricType: MetricType;
  metricUnit: string;
  startDate: string;
  endDate: string;
  kpis?: KPI[];
  createdAt: string;
}

export interface KPI {
  id: string;
  name: string;
  weight: number; // Percentage weight towards overall goal
  currentValue: number;
  targetValue: number;
  metricType: MetricType;
  metricUnit: string;
}

export interface AssignedGoal {
  id: string;
  goalId: string;
  employeeId: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  progress: number; // 0-100 percentage
  currentValue: number;
  targetValue: number; // Added field to match database update
  notes?: string;
  assignedAt: string;
  goalType: GoalType;
}

export interface GoalWithDetails extends Goal {
  assignedTo?: Employee[];
  assignmentDetails?: AssignedGoal;
}

export interface TrackingRecord {
  id: string;
  assignedGoalId: string;
  recordDate: string;
  value: number;
  notes?: string;
  createdAt: string;
}
