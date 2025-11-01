import { supabase } from "@/integrations/supabase/client";
import { GoalInstance } from "@/types/goal";
import { Employee, Goal, AssignedGoal, GoalWithDetails, KPI, TrackingRecord, GoalType,EmployeeGoalTarget } from "@/types/goal";
import { format } from 'date-fns';
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";
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

// Function to calculate goal status based on currentValue, targetValue, and dates
const calculateGoalStatus = (
  currentValue: number,
  targetValue: number,
  startDate: string,
  endDate: string
): 'pending' | 'in-progress' | 'completed' | 'overdue' => {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999); // Ensure end of day for comparison

  if (now < start) {
    return 'pending';
  }
  if (currentValue >= targetValue) {
    return 'completed';
  }
  if (now > end && currentValue < targetValue) {
    return 'overdue';
  }
  if (currentValue > 0) {
    return 'in-progress';
  }
  return 'pending';
};

// API functions to interact with Supabase
export const getEmployees = async (): Promise<Employee[]> => {

  const authData = getAuthDataFromLocalStorage();
    if (!authData) {
      throw new Error('Failed to retrieve authentication data');
    }
    const { organization_id, userId } = authData;
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
      `)
      .eq('organization_id', organization_id);

    if (error) {
      console.error('Error fetching employees:', error);
      return [];
    }

    return data.map((employee) => ({
      id: employee.id,
      name: `${employee.first_name} ${employee.last_name}`,
      email: employee.email,
      avatar: employee.profile_picture_url,
      position: employee.hr_designations?.name ?? 'Unknown',
      department: employee.hr_departments?.name ?? 'Unknown',
    }));
  } catch (error) {
    console.error('Error in getEmployees:', error);
    return [];
  }
};

export const getEmployeeById = async (id: string): Promise<Employee> => {
  const { data, error } = await supabase
    .from("hr_employees")
    .select("id, name, position, department, avatar")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching employee:", error);
    throw new Error("Failed to fetch employee data");
  }

  if (!data) {
    throw new Error("No employee found with the given ID");
  }

  return data;
};

export const getGoals = async (): Promise<Goal[]> => {
  try {
    const { data: goalsData, error: goalsError } = await supabase
      .from('hr_goals')
      .select('*');

    if (goalsError || !goalsData) {
      console.error('Error fetching goals:', goalsError);
      return [];
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

// New function to get count data for Submission and Onboarding goals
export const getSubmissionOrOnboardingCounts = async (
  employeeId: string,
  goalType: string,
  periodStart: string, 
  periodEnd: string
): Promise<number> => {
  try {
    const subStatusId = goalType === "Submission"
      ? "71706ff4-1bab-4065-9692-2a1237629dda"
      : "c9716374-3477-4606-877a-dfa5704e7680";
    
    const periodEndPlusOne = new Date(periodEnd);
    periodEndPlusOne.setDate(periodEndPlusOne.getDate() + 1);
    const periodEndStr = periodEndPlusOne.toISOString().split('T')[0];
    
    console.log(`Fetching ${goalType} counts for employee ${employeeId} from ${periodStart} to ${periodEndStr}`);
    
    const { data, error } = await supabase
      .from("hr_status_change_counts")
      .select("count")
      .eq("sub_status_id", subStatusId)
      .eq("candidate_owner", employeeId)
      .gte("created_at", periodStart)
      .lt("created_at", periodEndStr);
    
    if (error) {
      console.error(`Error fetching ${goalType} counts:`, error);
      return 0;
    }
    
    console.log(`Found ${data.length} ${goalType} count records:`, data);
    
    const totalCount = data.reduce((sum, record) => sum + record.count, 0);
    return totalCount;
  } catch (error) {
    console.error(`Error in getSubmissionOrOnboardingCounts:`, error);
    return 0;
  }
};

export const getGoalsWithDetails = async (): Promise<GoalWithDetails[]> => {
  try {
    const goals = await getGoals();
    const assignedGoals = await getAssignedGoals();
    const employees = await getEmployees();
    
    return goals.map(goal => {
      const assignments = assignedGoals.filter(ag => ag.goalId === goal.id);
      
      const isSpecialGoal = goal.name === "Submission" || goal.name === "Onboarding";
      
      if (isSpecialGoal) {
        for (const assignment of assignments) {
          const activeInstance = assignment.activeInstance;
          
          if (activeInstance) {
            getSubmissionOrOnboardingCounts(
              assignment.employeeId,
              goal.name,
              activeInstance.periodStart,
              activeInstance.periodEnd
            ).then(currentValue => {
              assignment.currentValue = currentValue;
              if (assignment.targetValue > 0) {
                assignment.progress = Math.min(Math.round((currentValue / assignment.targetValue) * 100), 100);
              }
              assignment.status = calculateGoalStatus(
                currentValue,
                assignment.targetValue,
                activeInstance.periodStart,
                activeInstance.periodEnd
              );
            });
          }
        }
      }
      
      const assignedEmployees = assignments
        .map(a => employees.find(e => e.id === a.employeeId))
        .filter(Boolean) as Employee[];
      
      const totalTargetValue = assignments.reduce((sum, a) => sum + a.targetValue, 0);
      const totalCurrentValue = assignments.reduce((sum, a) => sum + a.currentValue, 0);
      
      const overallProgress = totalTargetValue > 0 
        ? Math.min(Math.round((totalCurrentValue / totalTargetValue) * 100), 100)
        : 0;
      
      return {
        ...goal,
        assignedTo: assignedEmployees,
        assignments: assignments,
        totalTargetValue,
        totalCurrentValue,
        overallProgress
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
  kpis?: Omit<KPI, 'id'>[] &  {
    // Add the new optional automation fields to the type
    is_automated?: boolean;
    source_table?: string;
    source_value_column?: string;
    source_employee_column?: string;
    source_date_table?: string;
    source_date_column?: string;
    source_filter_conditions?: Record<string, string>;
  }
): Promise<Goal | null> => {
  try {
    const currentDate = new Date().toISOString();
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 3);

const authData = getAuthDataFromLocalStorage();
    if (!authData) {
      throw new Error('Failed to retrieve authentication data');
    }
    const { organization_id, userId } = authData;
    
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
        end_date: goal.endDate ?? futureDate.toISOString(),
        organization_id: organization_id,

         is_automated: goal.is_automated ?? false,
        source_table: goal.source_table,
        source_value_column: goal.source_value_column,
        source_employee_column: goal.source_employee_column,
        source_date_table: goal.source_date_table,
        source_date_column: goal.source_date_column,
        source_filter_conditions: goal.source_filter_conditions,
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
  goalType: GoalType,
  employeeTargets: EmployeeGoalTarget[],
  startDate: string,
  endDate: string
) => {
  const { data: goal } = await supabase
    .from('hr_goals')
    .select('*')
    .eq('id', goalId)
    .single();

  if (!goal) {
    throw new Error('Goal not found');
  }

const authData = getAuthDataFromLocalStorage();
    if (!authData) {
      throw new Error('Failed to retrieve authentication data');
    }
    const { organization_id, userId } = authData;

  const assignedGoalsPromises = employeeTargets.map(async ({ employee, targetValue }) => {
    const { data: assignedGoal, error: assignError } = await supabase
      .from('hr_assigned_goals')
      .insert({
        goal_id: goalId,
        employee_id: employee.id,
        target_value: targetValue,
        goal_type: goalType,
        current_value: 0,
        progress: 0,
        status: 'pending',
        organization_id: organization_id,
        start_date: startDate,
        end_date: endDate,
      })
      .select()
      .single();

    if (assignError) {
      throw new Error(`Error assigning goal to ${employee.name}: ${assignError.message}`);
    }

    return assignedGoal;
  });

  await Promise.all(assignedGoalsPromises);

  return { success: true };
};

export const getGoalById = async (goalId: string): Promise<GoalWithDetails | null> => {
  try {
    console.log(`Fetching goal with ID: ${goalId}`);
    
    const { data: goalData, error: goalError } = await supabase
      .from('hr_goals')
      .select('*')
      .eq('id', goalId)
      .single();
    
    if (goalError) {
      console.error('Error fetching goal details:', goalError);
      return null;
    }
    
    const { data: assignedData, error: assignedError } = await supabase
      .from('hr_assigned_goals')
      .select('*, hr_employees:employee_id(*)')
      .eq('goal_id', goalId);
    
    if (assignedError) {
      console.error('Error fetching assigned goals:', assignedError);
      return null;
    }
    
    const assignedEmployees: Employee[] = [];
    const assignments: AssignedGoal[] = [];
    let instances: GoalInstance[] = [];
    let activeInstance: GoalInstance | undefined = undefined;
    
    if (assignedData && assignedData.length > 0) {
      for (const assignment of assignedData) {
        const assignmentDetails: AssignedGoal = {
          id: assignment.id,
          goalId: assignment.goal_id,
          employeeId: assignment.employee_id,
          status: assignment.status,
          progress: assignment.progress,
          currentValue: assignment.current_value,
          targetValue: assignment.target_value,
          notes: assignment.notes,
          assignedAt: assignment.assigned_at,
          goalType: assignment.goal_type
        };
        assignments.push(assignmentDetails);
        
        if (assignment.hr_employees) {
          const employee = assignment.hr_employees;
          const mappedEmployee: Employee = {
            id: employee.id,
            name: `${employee.first_name} ${employee.last_name}`,
            position: employee.position || 'Employee',
            department: employee.department_id as any,
            email: employee.email,
            avatar: employee.profile_picture_url
          };
          
          if (!assignedEmployees.some(e => e.id === mappedEmployee.id)) {
            assignedEmployees.push(mappedEmployee);
          }
        }
        
        const { data: instancesData, error: instancesError } = await supabase
          .from('hr_goal_instances')
          .select('*')
          .eq('assigned_goal_id', assignment.id)
          .order('period_start', { ascending: true });
        
        if (!instancesError && instancesData) {
          const assignmentInstances = instancesData.map(instance => ({
            id: instance.id,
            assignedGoalId: instance.assigned_goal_id,
            periodStart: instance.period_start,
            periodEnd: instance.period_end,
            targetValue: instance.target_value,
            currentValue: instance.current_value,
            progress: instance.progress,
            status: instance.status,
            createdAt: instance.created_at,
            updatedAt: instance.updated_at,
            notes: instance.notes
          }));
          
          instances = [...instances, ...assignmentInstances];
          
          const today = new Date().toISOString().split('T')[0];
          const currentInstance = assignmentInstances.find(
            instance => 
              new Date(instance.periodStart) <= new Date(today) && 
              new Date(instance.periodEnd) >= new Date(today)
          );
          
          if (currentInstance && !activeInstance) {
            activeInstance = currentInstance;
          }
        }
      }
    }
    
    if (!activeInstance && instances.length > 0) {
      instances.sort((a, b) => 
        new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime()
      );
      activeInstance = instances[0];
    }
    
    const totalTargetValue = assignments.reduce((sum, a) => sum + a.targetValue, 0);
    let totalCurrentValue = assignments.reduce((sum, a) => sum + a.currentValue, 0);

    const isSpecialGoal = goalData.name === "Submission" || goalData.name === "Onboarding";
    if (isSpecialGoal && activeInstance) {
      console.log(`Special goal type detected: ${goalData.name}`);
      
      const countPromises = assignments.map(async (assignment) => {
        const currentValue = await getSubmissionOrOnboardingCounts(
          assignment.employeeId,
          goalData.name,
          activeInstance!.periodStart,
          activeInstance!.periodEnd
        );
        
        assignment.currentValue = currentValue;
        if (assignment.targetValue > 0) {
          assignment.progress = Math.min(Math.round((currentValue / assignment.targetValue) * 100), 100);
        }
        
        assignment.status = calculateGoalStatus(
          currentValue,
          assignment.targetValue,
          activeInstance!.periodStart,
          activeInstance!.periodEnd
        );
        
        await supabase
          .from('hr_assigned_goals')
          .update({
            current_value: currentValue,
            progress: assignment.progress,
            status: assignment.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', assignment.id);
        
        return currentValue;
      });
      
      const currentValues = await Promise.all(countPromises);
      totalCurrentValue = currentValues.reduce((sum, val) => sum + val, 0);
    }

    const overallProgress = totalTargetValue > 0 
      ? Math.min(Math.round((totalCurrentValue / totalTargetValue) * 100), 100)
      : 0;
    
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
      assignedTo: assignedEmployees,
      assignments: assignments,
      instances,
      activeInstance,
      totalTargetValue,
      totalCurrentValue,
      overallProgress
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
    
    const assignedGoalIds = assignedGoals.map(ag => ag.id);
    
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

export const getActiveGoalInstance = async (assignedGoalId: string): Promise<GoalInstance | null> => {
  try {
    const currentDate = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('hr_goal_instances')
      .select('*')
      .eq('assigned_goal_id', assignedGoalId)
      .lte('period_start', currentDate)
      .gte('period_end', currentDate)
      .single();
    
    if (error || !data) {
      console.log('No active instance found, fetching the latest instance');
      
      const { data: latestData, error: latestError } = await supabase
        .from('hr_goal_instances')
        .select('*')
        .eq('assigned_goal_id', assignedGoalId)
        .order('period_end', { ascending: false })
        .limit(1)
        .single();
      
      if (latestError || !latestData) {
        console.error('Error fetching latest goal instance:', latestError);
        return null;
      }
      
      return {
        id: latestData.id,
        assignedGoalId: latestData.assigned_goal_id,
        periodStart: latestData.period_start,
        periodEnd: latestData.period_end,
        targetValue: latestData.target_value,
        currentValue: latestData.current_value,
        progress: latestData.progress,
        status: latestData.status,
        createdAt: latestData.created_at,
        updatedAt: latestData.updated_at,
        notes: latestData.notes
      };
    }
    
    return {
      id: data.id,
      assignedGoalId: data.assigned_goal_id,
      periodStart: data.period_start,
      periodEnd: data.period_end,
      targetValue: data.target_value,
      currentValue: data.current_value,
      progress: data.progress,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      notes: data.notes
    };
  } catch (error) {
    console.error('Error in getActiveGoalInstance:', error);
    return null;
  }
};

export const addTrackingRecord = async (
  assignedGoalId: string,
  value: number,
  recordDate: string = new Date().toISOString(),
  notes?: string
): Promise<TrackingRecord | null> => {
  try {
    const datePart = recordDate.split('T')[0];
    
    const { data: instanceData, error: instanceError } = await supabase
      .from('hr_goal_instances')
      .select('id')
      .eq('assigned_goal_id', assignedGoalId)
      .lte('period_start', datePart)
      .gte('period_end', datePart)
      .maybeSingle();

const authData = getAuthDataFromLocalStorage();
    if (!authData) {
      throw new Error('Failed to retrieve authentication data');
    }
    const { organization_id, userId } = authData;
    
    if (instanceError) {
      console.error('Error checking goal instance:', instanceError);
    }
    
    const { data, error } = await supabase
      .from('tracking_records')
      .insert({
        assigned_goal_id: assignedGoalId,
        record_date: recordDate,
        value,
        notes,
        organization_id: organization_id
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

export const updateGoalProgress = async (
  assignedGoalId: string,
  currentValue: number,
  notes?: string
): Promise<AssignedGoal | null> => {
  try {
    const { data: goalData, error: goalError } = await supabase
      .from('hr_assigned_goals')
      .select('*, hr_goals:goal_id(*)')
      .eq('id', assignedGoalId)
      .single();
    
    if (goalError) {
      console.error('Error fetching goal data for status update:', goalError);
      return null;
    }
    
    const progress = goalData.target_value > 0 
      ? Math.min(Math.round((currentValue * 100) / goalData.target_value), 100)
      : 0;
    
    const status = calculateGoalStatus(
      currentValue,
      goalData.target_valueBLUE,
      goalData.hr_goals.start_date,
      goalData.hr_goals.end_date
    );
    
    const { data, error } = await supabase
      .from('hr_assigned_goals')
      .update({
        current_value: currentValue,
        progress,
        status,
        updated_at: new Date().toISOString(),
        notes
      })
      .eq('id', assignedGoalId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating goal progress:', error);
      return null;
    }
    
    return {
      id: data.id,
      goalId: data.goal_id,
      employeeId: data.employee_id,
      status: data.status,
      progress: data.progress,
      currentValue: data.current_value,
      targetValue: data.target_value,
      notes: data.notes,
      assignedAt: data.assigned_at,
      goalType: data.goal_type
    };
  } catch (error) {
    console.error('Error in updateGoalProgress:', error);
    return null;
  }
};

export const updateAssignedGoalTarget = async (
  assignedGoalId: string,
  targetValue: number
): Promise<AssignedGoal | null> => {
  try {
    const { data: goalData, error: goalError } = await supabase
      .from('hr_assigned_goals')
      .select('*, hr_goals:goal_id(*)')
      .eq('id', assignedGoalId)
      .single();
    
    if (goalError) {
      console.error('Error fetching goal data for target update:', goalError);
      return null;
    }
    
    const currentValue = goalData.current_value;
    const progress = targetValue > 0 ? Math.min(Math.round((currentValue / targetValue) * 100), 100) : 0;
    
    const status = calculateGoalStatus(
      currentValue,
      targetValue,
      goalData.hr_goals.start_date,
      goalData.hr_goals.end_date
    );
    
    const { data, error } = await supabase
      .from('hr_assigned_goals')
      .update({
        target_value: targetValue,
        progress: progress,
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', assignedGoalId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating goal target:', error);
      return null;
    }
    
    return {
      id: data.id,
      goalId: data.goal_id,
      employeeId: data.employee_id,
      status: data.status,
      progress: data.progress,
      currentValue: data.current_value,
      targetValue: data.target_value,
      notes: data.notes,
      assignedAt: data.assigned_at,
      goalType: data.goal_type
    };
  } catch (error) {
    console.error('Error in updateAssignedGoalTarget:', error);
    return null;
  }
};


// Update getEmployeeGoals function to include all goals (including expired ones)
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
    const goalIds = [...new Set(assignedGoals.map(ag => ag.goalId))]; // Unique goal IDs
    
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
    
    if (employeeError) {
      console.error('Error fetching employee details:', employeeError);
      return [];
    }

    const employee: Employee = {
      id: employeeData.id,
      name: `${employeeData.first_name} ${employeeData.last_name}`,
      position: employeeData.position || 'Employee',
      department: employeeData.department_id as any,
      email: employeeData.email,
      avatar: employeeData.profile_picture_url
    };

    const goals: GoalWithDetails[] = [];

    for (const goalData of goalsData) {
      // Find all assigned goals for this goal_id
      const goalAssignedGoals = assignedGoals.filter(ag => ag.goalId === goalData.id);
      
      if (goalAssignedGoals.length === 0) continue;

      const instances: GoalInstance[] = [];
      let activeInstance: GoalInstance | undefined = undefined;

      // Fetch instances for all assigned goals
      for (const assignedGoal of goalAssignedGoals) {
        const { data: instancesData, error: instancesError } = await supabase
          .from('hr_goal_instances')
          .select('*')
          .eq('assigned_goal_id', assignedGoal.id)
          .order('period_start', { ascending: false });

        if (instancesError || !instancesData) {
          console.error('Error fetching instances for assigned goal:', instancesError);
          continue;
        }

        const mappedInstances = instancesData.map(instance => {
          const currentValue = instance.current_value ?? 0;
          const targetValue = instance.target_value ?? 0;
          const progress = targetValue > 0 ? Math.min(Math.round((currentValue / targetValue) * 100), 100) : 0;
          const status = calculateGoalStatus(
            currentValue,
            targetValue,
            instance.period_start,
            instance.period_end
          );

          // Update database with recalculated values
          supabase
            .from('hr_goal_instances')
            .update({
              current_value: currentValue,
              progress,
              status,
              updated_at: new Date().toISOString()
            })
            .eq('id', instance.id)
            .then(({ error }) => {
              if (error) {
                console.error("Error updating goal instance in supabaseData:", error);
              } else {
                console.log("Updated goal instance in supabaseData:", {
                  instanceId: instance.id,
                  status,
                  progress,
                  currentValue,
                  periodStart: instance.period_start,
                  periodEnd: instance.period_end
                });
              }
            });

          return {
            id: instance.id,
            assignedGoalId: instance.assigned_goal_id,
            periodStart: instance.period_start,
            periodEnd: instance.period_end,
            targetValue,
            currentValue,
            progress,
            status,
            createdAt: instance.created_at,
            updatedAt: instance.updated_at,
            notes: instance.notes
          };
        });

        instances.push(...mappedInstances);

        console.log("Mapped Goal Instances:", {
          goalId: goalData.id,
          assignedGoalId: assignedGoal.id,
          instances: mappedInstances.map(i => ({
            id: i.id,
            periodStart: i.periodStart,
            periodEnd: i.periodEnd,
            currentValue: i.currentValue,
            targetValue: i.targetValue,
            status: i.status
          }))
        });
      }

      // Find active instance
      const today = new Date().toISOString().split('T')[0];
      const currentInstance = instances.find(
        instance => 
          new Date(instance.periodStart) <= new Date(today) && 
          new Date(instance.periodEnd) >= new Date(today)
      );

      activeInstance = currentInstance || instances[0];

      // Handle special goals (Submission/Onboarding)
      const isSpecialGoal = goalData.name === "Submission" || goalData.name === "Onboarding";
      if (isSpecialGoal && activeInstance) {
        for (const assignedGoal of goalAssignedGoals) {
          const currentValue = await getSubmissionOrOnboardingCounts(
            employeeId,
            goalData.name,
            activeInstance.periodStart,
            activeInstance.periodEnd
          );
          
          assignedGoal.currentValue = currentValue;
          assignedGoal.progress = assignedGoal.targetValue > 0 
            ? Math.min(Math.round((currentValue / assignedGoal.targetValue) * 100), 100) 
            : 0;
          assignedGoal.status = calculateGoalStatus(
            currentValue,
            assignedGoal.targetValue,
            activeInstance.periodStart,
            activeInstance.periodEnd
          );
          
          await supabase
            .from('hr_assigned_goals')
            .update({
              current_value: currentValue,
              progress: assignedGoal.progress,
              status: assignedGoal.status,
              updated_at: new Date().toISOString()
            })
            .eq('id', assignedGoal.id)
            .then(({ error }) => {
              if (error) {
                console.error("Error updating assigned goal for special goal:", error);
              } else {
                console.log("Updated assigned goal for special goal:", {
                  assignedGoalId: assignedGoal.id,
                  status: assignedGoal.status,
                  progress: assignedGoal.progress,
                  currentValue
                });
              }
            });
          
          const instanceToUpdate = instances.find(i => i.id === activeInstance!.id);
          if (instanceToUpdate) {
            instanceToUpdate.currentValue = currentValue;
            instanceToUpdate.progress = assignedGoal.progress;
            instanceToUpdate.status = assignedGoal.status;

            await supabase
              .from('hr_goal_instances')
              .update({
                current_value: currentValue,
                progress: assignedGoal.progress,
                status: assignedGoal.status,
                updated_at: new Date().toISOString()
              })
              .eq('id', instanceToUpdate.id)
              .then(({ error }) => {
                if (error) {
                  console.error("Error updating special goal instance:", error);
                } else {
                  console.log("Updated special goal instance:", {
                    instanceId: instanceToUpdate.id,
                    status: assignedGoal.status,
                    progress: assignedGoal.progress,
                    currentValue
                  });
                }
              });
          }
        }
      }

      const goal: GoalWithDetails = {
        ...mapHrGoalToGoal(goalData),
        assignedTo: [employee],
        assignments: goalAssignedGoals,
        instances,
        activeInstance,
        assignmentDetails: goalAssignedGoals, // Use all assigned goals
        totalTargetValue: goalAssignedGoals.reduce((sum, ag) => sum + (ag.targetValue || 0), 0),
        totalCurrentValue: goalAssignedGoals.reduce((sum, ag) => sum + (ag.currentValue || 0), 0),
        overallProgress: goalAssignedGoals.reduce((sum, ag) => sum + (ag.progress || 0), 0) / goalAssignedGoals.length || 0
      };

      goals.push(goal);
    }

    console.log("Final Goals:", goals.map(g => ({
      id: g.id,
      name: g.name,
      instances: g.instances?.map(i => ({
        id: i.id,
        periodStart: i.periodStart,
        periodEnd: i.periodEnd,
        currentValue: i.currentValue,
        targetValue: i.targetValue,
        status: i.status
      }))
    })));
    return goals;
  } catch (error) {
    console.error('Error in getEmployeeGoals:', error);
    return [];
  }
};
/**
 * Updates the target value of a goal instance.
 * This is also used to override the target value of a goal.
 */
export const updateGoalTarget = async (
  goalInstanceId: string,
  newTargetValue: number
): Promise<GoalInstance | null> => {
  try {
    const { data, error } = await supabase
      .from('hr_goal_instances')
      .update({
        target_value: newTargetValue,
        updated_at: new Date(),
      })
      .eq('id', goalInstanceId)
      .select('*')
      .single();

    if (error) {
      console.error("Error updating goal target:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Exception updating goal target:", error);
    return null;
  }
};

/**
 * Extends the target value of a goal instance for a completed goal.
 */
export const extendGoalTarget = async (
  goalInstanceId: string,
  additionalTargetValue: number
): Promise<GoalInstance | null> => {
  try {
    // Get current target value
    const { data: currentInstance, error: fetchError } = await supabase
      .from('hr_goal_instances')
      .select('*')
      .eq('id', goalInstanceId)
      .single();

    if (fetchError) {
      console.error("Error fetching goal instance:", fetchError);
      return null;
    }

    const newTargetValue = (currentInstance.target_value || 0) + additionalTargetValue;

    // Update the target value
    const { data, error } = await supabase
      .from('hr_goal_instances')
      .update({
        target_value: newTargetValue,
        status: 'in-progress', // Reset to in-progress
        updated_at: new Date(),
      })
      .eq('id', goalInstanceId)
      .select('*')
      .single();

    if (error) {
      console.error("Error extending goal target:", error);
      return null;
    }

    // Also update the assigned goal
    const { error: updateError } = await supabase
      .from('hr_assigned_goals')
      .update({
        target_value: newTargetValue,
        status: 'in-progress',
        updated_at: new Date(),
      })
      .eq('id', data.assigned_goal_id);

    if (updateError) {
      console.error("Error updating assigned goal:", updateError);
    }

    return data;
  } catch (error) {
    console.error("Exception extending goal target:", error);
    return null;
  }
};

/**
 * Stops tracking a goal instance.
 */
export const stopGoal = async (
  goalInstanceId: string
): Promise<GoalInstance | null> => {
  try {
    const { data, error } = await supabase
      .from('hr_goal_instances')
      .update({
        status: 'stopped',
        updated_at: new Date(),
      })
      .eq('id', goalInstanceId)
      .select('*')
      .single();

    if (error) {
      console.error("Error stopping goal:", error);
      return null;
    }

    // Also update the assigned goal
    const { error: updateError } = await supabase
      .from('hr_assigned_goals')
      .update({
        status: 'stopped',
        updated_at: new Date(),
      })
      .eq('id', data.assigned_goal_id);

    if (updateError) {
      console.error("Error updating assigned goal:", updateError);
    }

    return data;
  } catch (error) {
    console.error("Exception stopping goal:", error);
    return null;
  }
};

/**
 * Permanently deletes a goal and all associated data
 */
export const deleteGoal = async (
  goalId: string
): Promise<boolean> => {
  try {
    // First, get all the assigned goals that are associated with this goal
    const { data: assignedGoals, error: fetchError } = await supabase
      .from('hr_assigned_goals')
      .select('id')
      .eq('goal_id', goalId);

    if (fetchError) {
      console.error("Error fetching assigned goals:", fetchError);
      return false;
    }

    // For each assigned goal, delete its goal instances
    if (assignedGoals && assignedGoals.length > 0) {
      const assignedGoalIds = assignedGoals.map(ag => ag.id);

      const { error: instancesError } = await supabase
        .from('hr_goal_instances')
        .delete()
        .in('assigned_goal_id', assignedGoalIds);

      if (instancesError) {
        console.error("Error deleting goal instances:", instancesError);
        return false;
      }

      // Delete all assigned goals
      const { error: assignedError } = await supabase
        .from('hr_assigned_goals')
        .delete()
        .in('id', assignedGoalIds);

      if (assignedError) {
        console.error("Error deleting assigned goals:", assignedError);
        return false;
      }
    }

    // Finally, delete the goal itself
    const { error } = await supabase
      .from('hr_goals')
      .delete()
      .eq('id', goalId);

    if (error) {
      console.error("Error deleting goal:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Exception deleting goal:", error);
    return false;
  }
};
