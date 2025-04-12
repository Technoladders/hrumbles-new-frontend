import { supabase } from "@/integrations/supabase/client";
import { Employee, Goal, AssignedGoal, GoalWithDetails, KPI, TrackingRecord, GoalType } from "@/types/goal";

// Type definitions for database tables
type HrEmployee = {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  department: string;
  email: string;
  profile_picture_url?: string;
  created_at: string;
  updated_at: string;
};

type HrGoal = {
  id: string;
  name: string;
  description: string;
  sector: string;
  target_value: number;
  metric_type: string;
  metric_unit: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
};

type HrKpi = {
  id: string;
  goal_id: string;
  name: string;
  weight: number;
  current_value: number;
  target_value: number;
  metric_type: string;
  metric_unit: string;
  created_at: string;
  updated_at: string;
};

type HrAssignedGoal = {
  id: string;
  goal_id: string;
  employee_id: string;
  status: string;
  progress: number;
  current_value: number;
  target_value: number;
  notes?: string;
  assigned_at: string;
  updated_at: string;
  goal_type: string;
};

type TrackingRecordDb = {
  id: string;
  assigned_goal_id: string;
  record_date: string;
  value: number;
  notes?: string;
  created_at: string;
};

// Helper functions to convert between API and database formats
const mapHrEmployeeToEmployee = (hrEmployee: HrEmployee): Employee => ({
  id: hrEmployee.id,
  name: `${hrEmployee.first_name} ${hrEmployee.last_name}`,
  position: hrEmployee.position,
  department: hrEmployee.department as any,
  email: hrEmployee.email,
  avatar: hrEmployee.profile_picture_url
});

const mapHrGoalToGoal = (hrGoal: HrGoal, kpis?: KPI[]): Goal => ({
  id: hrGoal.id,
  name: hrGoal.name,
  description: hrGoal.description,
  sector: hrGoal.sector as any,
  targetValue: hrGoal.target_value,
  metricType: hrGoal.metric_type as any,
  metricUnit: hrGoal.metric_unit,
  startDate: hrGoal.start_date,
  endDate: hrGoal.end_date,
  kpis,
  createdAt: hrGoal.created_at
});

const mapHrKpiToKpi = (hrKpi: HrKpi): KPI => ({
  id: hrKpi.id,
  name: hrKpi.name,
  weight: hrKpi.weight,
  currentValue: hrKpi.current_value,
  targetValue: hrKpi.target_value,
  metricType: hrKpi.metric_type as any,
  metricUnit: hrKpi.metric_unit
});

const mapHrAssignedGoalToAssignedGoal = (hrAssignedGoal: HrAssignedGoal): AssignedGoal => ({
  id: hrAssignedGoal.id,
  goalId: hrAssignedGoal.goal_id,
  employeeId: hrAssignedGoal.employee_id,
  status: hrAssignedGoal.status as any,
  progress: hrAssignedGoal.progress,
  currentValue: hrAssignedGoal.current_value,
  targetValue: hrAssignedGoal.target_value,
  notes: hrAssignedGoal.notes,
  assignedAt: hrAssignedGoal.assigned_at,
  goalType: hrAssignedGoal.goal_type as GoalType,
});

const mapTrackingRecordDbToTrackingRecord = (record: TrackingRecordDb): TrackingRecord => ({
  id: record.id,
  assignedGoalId: record.assigned_goal_id,
  recordDate: record.record_date,
  value: record.value,
  notes: record.notes,
  createdAt: record.created_at,
});

// API functions to interact with Supabase
export const getEmployees = async (): Promise<Employee[]> => {
  try {
    const { data, error } = await supabase
      .from('hr_employees')
      .select(`
        id,
        first_name,
        last_name,
        email,
        profile_picture_url,
        hr_departments(name),
        hr_designations(name)
      `);

    if (error) {
      console.error('Error fetching employees:', error);
      return [];
    }

    return data.map((employee) => ({
      id: employee.id,
      name: `${employee.first_name} ${employee.last_name}`,
      email: employee.email,
      avatar: employee.profile_picture_url,
      position: employee.hr_designations?.name ?? 'Unknown', // Extract designation
      department: employee.hr_departments?.name ?? 'Unknown', // Extract department
    }));
  } catch (error) {
    console.error('Error in getEmployees:', error);
    return [];
  }
};

export const getGoals = async (): Promise<Goal[]> => {
  try {
    const { data: goalsData, error: goalsError } = await supabase
      .from('hr_goals')
      .select('*');

    if (goalsError || !goalsData) {
      console.error('Error fetching goals:', goalsError);
      return []; // Always return an empty array
    }

    const goals: Goal[] = [];

    for (const hrGoal of goalsData) {
      const { data: kpisData, error: kpisError } = await supabase
        .from('hr_kpis')
        .select('*')
        .eq('goal_id', hrGoal.id);

      if (kpisError) {
        console.error(`Error fetching KPIs for goal ${hrGoal.id}:`, kpisError);
      }

      const kpis = kpisData ? kpisData.map(mapHrKpiToKpi) : [];
      goals.push(mapHrGoalToGoal(hrGoal, kpis));
    }

    return goals;
  } catch (error) {
    console.error('Error in getGoals:', error);
    return [];
  }
};

export const getAssignedGoals = async (): Promise<AssignedGoal[]> => {
  try {
    const { data, error } = await supabase
      .from('hr_assigned_goals')
      .select('*');
    
    if (error) {
      console.error('Error fetching assigned goals:', error);
      return [];
    }
    
    return data.map(mapHrAssignedGoalToAssignedGoal);
  } catch (error) {
    console.error('Error in getAssignedGoals:', error);
    return [];
  }
};

export const getGoalsWithDetails = async (): Promise<GoalWithDetails[]> => {
  try {
    const goals = await getGoals();
    const assignedGoals = await getAssignedGoals();
    const employees = await getEmployees();
    
    return goals.map(goal => {
      const assignments = assignedGoals.filter(ag => ag.goalId === goal.id);
      const assignedEmployees = assignments
        .map(a => employees.find(e => e.id === a.employeeId))
        .filter(Boolean) as Employee[];
      
      return {
        ...goal,
        assignedTo: assignedEmployees,
        assignmentDetails: assignments[0] // Just get the first assignment for simplicity
      };
    });
  } catch (error) {
    console.error('Error in getGoalsWithDetails:', error);
    return [];
  }
};

export const getSectorsWithCounts = async () => {
  try {
    const goals = await getGoals();
    
    const sectors = goals.reduce((acc, goal) => {
      acc[goal.sector] = (acc[goal.sector] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(sectors).map(([name, count]) => ({ name, count }));
  } catch (error) {
    console.error('Error in getSectorsWithCounts:', error);
    return [];
  }
};

export const createEmployee = async (employee: Omit<Employee, 'id'>): Promise<Employee | null> => {
  try {
    const { data, error } = await supabase
      .from('hr_employees')
      .insert({
        name: employee.name,
        position: employee.position,
        department: employee.department,
        email: employee.email,
        avatar: employee.avatar
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating employee:', error);
      return null;
    }
    
    return mapHrEmployeeToEmployee(data);
  } catch (error) {
    console.error('Error in createEmployee:', error);
    return null;
  }
};

export const createGoal = async (
  goal: Omit<Partial<Goal>, 'id' | 'createdAt'>,
  kpis?: Omit<KPI, 'id'>[]
): Promise<Goal | null> => {
  try {
    const currentDate = new Date().toISOString();
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 3); // Set default end date to 3 months from now
    
    const { data: goalData, error: goalError } = await supabase
      .from('hr_goals')
      .insert({
        name: goal.name,
        description: goal.description,
        sector: goal.sector,
        target_value: goal.targetValue ?? 0,
        metric_type: goal.metricType,
        metric_unit: goal.metricUnit,
        start_date: goal.startDate ?? currentDate,
        end_date: goal.endDate ?? futureDate.toISOString()
      })
      .select()
      .single();
    
    if (goalError) {
      console.error('Error creating goal:', goalError);
      return null;
    }
    
    if (kpis && kpis.length > 0) {
      const kpisToInsert = kpis.map(kpi => ({
        goal_id: goalData.id,
        name: kpi.name,
        weight: kpi.weight,
        current_value: kpi.currentValue,
        target_value: kpi.targetValue,
        metric_type: kpi.metricType,
        metric_unit: kpi.metricUnit
      }));
      
      const { data: kpisData, error: kpisError } = await supabase
        .from('hr_kpis')
        .insert(kpisToInsert)
        .select();
      
      if (kpisError) {
        console.error('Error creating KPIs:', kpisError);
      }
      
      const mappedKpis = kpisData ? kpisData.map(mapHrKpiToKpi) : undefined;
      return mapHrGoalToGoal(goalData, mappedKpis);
    }
    
    return mapHrGoalToGoal(goalData);
  } catch (error) {
    console.error('Error in createGoal:', error);
    return null;
  }
};

export const assignGoalToEmployees = async (
  goalId: string,
  employeeIds: string[],
  goalType: string,
  employeeTargets: { employee: Employee; targetValue: number }[]
) => {
  try {
    // Prepare the batch of assignments
    const assignments = employeeTargets.map(target => ({
      goal_id: goalId,
      employee_id: target.employee.id,
      status: 'pending',
      progress: 0,
      current_value: 0,
      target_value: target.targetValue,
      goal_type: goalType,
    }));

    // Insert assignments
    const { data, error } = await supabase
      .from('hr_assigned_goals')
      .insert(assignments)
      .select();

    if (error) {
      console.error("Error assigning goals:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in assignGoalToEmployees:", error);
    throw error;
  }
};

export const getEmployeeGoals = async (employeeId: string): Promise<GoalWithDetails[]> => {
  try {
    console.log(`Fetching goals for employee ID: ${employeeId}`);
    
    const { data: assignedGoalsData, error: assignedGoalsError } = await supabase
      .from('hr_assigned_goals')
      .select('*')
      .eq('employee_id', employeeId);
    
    if (assignedGoalsError) {
      console.error('Error fetching assigned goals for employee:', assignedGoalsError);
      return [];
    }

    if (!assignedGoalsData || assignedGoalsData.length === 0) {
      console.log('No goals assigned to this employee');
      return [];
    }

    console.log(`Found ${assignedGoalsData.length} assigned goals for employee`);
    
    const assignedGoals = assignedGoalsData.map(mapHrAssignedGoalToAssignedGoal);
    const goalIds = assignedGoals.map(ag => ag.goalId);
    
    const { data: goalsData, error: goalsError } = await supabase
      .from('hr_goals')
      .select('*')
      .in('id', goalIds);
    
    if (goalsError || !goalsData) {
      console.error('Error fetching goals details:', goalsError);
      return [];
    }
    
    const { data: employeeData, error: employeeError } = await supabase
      .from('hr_employees')
      .select('*')
      .eq('id', employeeId)
      .single();
    
    if (employeeError || !employeeData) {
      console.error('Error fetching employee details:', employeeError);
      return [];
    }
    
    const employee = mapHrEmployeeToEmployee(employeeData);
    
    const goalsWithDetails: GoalWithDetails[] = [];
    
    for (const hrGoal of goalsData) {
      const { data: kpisData, error: kpisError } = await supabase
        .from('hr_kpis')
        .select('*')
        .eq('goal_id', hrGoal.id);
      
      if (kpisError) {
        console.error(`Error fetching KPIs for goal ${hrGoal.id}:`, kpisError);
      }
      
      const kpis = kpisData ? kpisData.map(mapHrKpiToKpi) : [];
      const goal = mapHrGoalToGoal(hrGoal, kpis);
      
      const assignmentDetails = assignedGoals.find(ag => ag.goalId === goal.id);
      
      if (assignmentDetails) {
        goalsWithDetails.push({
          ...goal,
          assignedTo: [employee],
          assignmentDetails
        });
      }
    }
    
    console.log(`Prepared ${goalsWithDetails.length} goals with details for employee`);
    return goalsWithDetails;
  } catch (error) {
    console.error('Error in getEmployeeGoals:', error);
    return [];
  }
};

export const updateGoalProgress = async (
  assignedGoalId: string,
  currentValue: number,
  notes?: string
): Promise<AssignedGoal | null> => {
  try {
    const { data: currentGoalData, error: fetchError } = await supabase
      .from('hr_assigned_goals')
      .select('*')
      .eq('id', assignedGoalId)
      .single();
    
    if (fetchError || !currentGoalData) {
      console.error('Error fetching assigned goal details:', fetchError);
      return null;
    }
    
    const targetValue = currentGoalData.target_value;
    const progress = calculateGoalProgress(currentValue, targetValue);
    
    const goalEndDate = new Date(currentGoalData.hr_goals.end_date);
    const now = new Date();
    const isPastDeadline = now > goalEndDate;
    
    let status: 'pending' | 'in-progress' | 'completed' | 'overdue' = 'pending';
    
    if (progress >= 100) {
      status = 'completed';
    } else if (progress > 0) {
      status = isPastDeadline ? 'overdue' : 'in-progress';
    } else if (isPastDeadline) {
      status = 'overdue';
    }
    
    console.log(`Updating goal: Current value: ${currentValue}, Progress: ${progress}%, Status: ${status}`);
    
    const { data, error } = await supabase
      .from('hr_assigned_goals')
      .update({
        current_value: currentValue,
        progress: progress,
        status: status,
        notes: notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', assignedGoalId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating goal progress:', error);
      return null;
    }
    
    return mapHrAssignedGoalToAssignedGoal(data);
  } catch (error) {
    console.error('Error in updateGoalProgress:', error);
    return null;
  }
};

const calculateGoalProgress = (currentValue: number, targetValue: number): number => {
  if (targetValue === 0) return 0;
  const progress = (currentValue / targetValue) * 100;
  return Math.min(Math.round(progress), 100);
};

export const addTrackingRecord = async (
  assignedGoalId: string,
  value: number,
  recordDate: string = new Date().toISOString(),
  notes?: string
): Promise<TrackingRecord | null> => {
  try {
    const { data, error } = await supabase
      .from('tracking_records')
      .insert({
        assigned_goal_id: assignedGoalId,
        record_date: recordDate,
        value,
        notes
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error adding tracking record:', error);
      return null;
    }
    
    return mapTrackingRecordDbToTrackingRecord(data);
  } catch (error) {
    console.error('Error in addTrackingRecord:', error);
    return null;
  }
};

export const getTrackingRecords = async (assignedGoalId: string): Promise<TrackingRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('tracking_records')
      .select('*')
      .eq('assigned_goal_id', assignedGoalId)
      .order('record_date', { ascending: false });
    
    if (error) {
      console.error('Error fetching tracking records:', error);
      return [];
    }
    
    return data.map(mapTrackingRecordDbToTrackingRecord);
  } catch (error) {
    console.error('Error in getTrackingRecords:', error);
    return [];
  }
};

export const updateGoalProgressFromRecords = async (assignedGoalId: string): Promise<boolean> => {
  try {
    console.log("Updating goal progress for assignedGoalId:", assignedGoalId);

    // 1️⃣ Fetch assigned goal details
    const { data: goalData, error: goalError } = await supabase
      .from('hr_assigned_goals')
      .select('*') // No need to fetch hr_goals.end_date
      .eq('id', assignedGoalId)
      .single();

    if (goalError || !goalData) {
      console.error('Error fetching assigned goal details:', goalError);
      return false;
    }

    // 2️⃣ Fetch all tracking records for this goal
    const { data: recordsData, error: recordsError } = await supabase
      .from('tracking_records')
      .select('value') // Fetch only 'value' column
      .eq('assigned_goal_id', assignedGoalId);

    if (recordsError) {
      console.error('Error fetching tracking records:', recordsError);
      return false;
    }

    // 3️⃣ Sum up all tracking record values
    const currentValue = recordsData.reduce((sum, record) => sum + (record.value || 0), 0);
    console.log("Computed current_value (sum of tracking records):", currentValue);

    // 4️⃣ Calculate progress
    const targetValue = goalData.target_value;
    const progress = targetValue > 0 ? (currentValue / targetValue) * 100 : 0;

    // 5️⃣ Determine goal status (without hr_goals.end_date)
    let status: 'pending' | 'in-progress' | 'completed' = 'pending';

    if (progress >= 100) {
      status = 'completed';
    } else if (progress > 0) {
      status = 'in-progress';
    }

    // 6️⃣ Update hr_assigned_goals table with new current_value
    const { error: updateError } = await supabase
      .from('hr_assigned_goals')
      .update({
        current_value: currentValue, // ✅ Correct column name
        progress,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignedGoalId);

    if (updateError) {
      console.error('Error updating goal progress:', updateError);
      return false;
    }

    console.log("✅ Goal progress updated successfully in hr_assigned_goals");
    return true;

  } catch (error) {
    console.error('Error in updateGoalProgressFromRecords:', error);
    return false;
  }
};

export const getGoalById = async (goalId: string): Promise<GoalWithDetails | null> => {
  try {
    console.log(`Fetching goal with ID: ${goalId}`);
    
    // Fetch the goal details
    const { data: goalData, error: goalError } = await supabase
      .from('hr_goals')
      .select('*')
      .eq('id', goalId)
      .single();
    
    if (goalError) {
      console.error('Error fetching goal details:', goalError);
      return null;
    }
    
    // Fetch assigned employees
    const { data: assignedData, error: assignedError } = await supabase
      .from('hr_assigned_goals')
      .select('*, hr_employees:employee_id(*)')
      .eq('goal_id', goalId);
    
    if (assignedError) {
      console.error('Error fetching assigned goals:', assignedError);
      return null;
    }
    
    // Map employees and assignment details
    const assignedEmployees: Employee[] = [];
    let assignmentDetails = null;
    
    if (assignedData && assignedData.length > 0) {
      assignedData.forEach(assignment => {
        if (assignment.hr_employees) {
          const employee = assignment.hr_employees;
          assignedEmployees.push({
            id: employee.id,
            name: `${employee.first_name} ${employee.last_name}`,
            position: employee.position || 'Employee',
            department: employee.department_id as any,
            email: employee.email,
            avatar: employee.profile_picture_url
          });
        }
        
        // For simplicity, we just take the first assignment details
        // In a real app, you might handle multiple assignments differently
        if (!assignmentDetails) {
          assignmentDetails = {
            id: assignment.id,
            goalId: assignment.goal_id,
            employeeId: assignment.employee_id,
            status: assignment.status,
            progress: assignment.progress,
            currentValue: assignment.current_value,
            targetValue: assignment.target_value,
            notes: assignment.notes,
            assignedAt: assignment.assigned_at,
            goalType: assignment.goal_type as any,
            updated_at: assignment.updated_at
          };
        }
      });
    }
    
    // Map goal with details
    const goal: GoalWithDetails = {
      id: goalData.id,
      name: goalData.name,
      description: goalData.description,
      sector: goalData.sector,
      targetValue: goalData.target_value,
      metricType: goalData.metric_type,
      metricUnit: goalData.metric_unit,
      startDate: goalData.start_date,
      endDate: goalData.end_date,
      createdAt: goalData.created_at,
      updatedAt: goalData.updated_at,
      assignedTo: assignedEmployees,
      assignmentDetails
    };
    
    return goal;
  } catch (error) {
    console.error('Error in getGoalById:', error);
    return null;
  }
};

export const getTrackingRecordsForGoal = async (goalId: string, employeeId?: string): Promise<TrackingRecord[]> => {
  try {
    console.log(`Fetching tracking records for goal ID: ${goalId}`);
    
    // First get the assigned goal ID
    let query = supabase
      .from('hr_assigned_goals')
      .select('id')
      .eq('goal_id', goalId);
    
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    
    const { data: assignedGoals, error: assignedError } = await query;
    
    if (assignedError) {
      console.error('Error fetching assigned goals:', assignedError);
      return [];
    }
    
    if (!assignedGoals || assignedGoals.length === 0) {
      console.log('No assigned goals found');
      return [];
    }
    
    // Get all assigned goal IDs
    const assignedGoalIds = assignedGoals.map(ag => ag.id);
    
    // Fetch tracking records for these assigned goals
    const { data: trackingRecords, error: trackingError } = await supabase
      .from('tracking_records')
      .select('*')
      .in('assigned_goal_id', assignedGoalIds)
      .order('record_date', { ascending: false });
    
    if (trackingError) {
      console.error('Error fetching tracking records:', trackingError);
      return [];
    }
    
    return trackingRecords.map(mapTrackingRecordDbToTrackingRecord);
    
  } catch (error) {
    console.error('Error in getTrackingRecordsForGoal:', error);
    return [];
  }
};
