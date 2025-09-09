import { supabase } from "@/integrations/supabase/client";
import { GoalInstance, GoalWithDetails, Employee, GoalStatistics, AssignedGoal } from "@/types/goal";
import { isAfter, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";

export const getGoalsWithDetails = async (): Promise<GoalWithDetails[]> => {
  try {
    const { data: goals, error } = await supabase
      .from('hr_goals')
      .select(`
        id, name, description, sector, start_date, end_date, metric_unit, created_at, updated_at,
        assignments: hr_assigned_goals(
          id, goal_id, employee_id, status, progress, current_value, target_value, notes, assigned_at, updated_at, goal_type,
          employee: hr_employees(id, first_name, last_name, email, position),
          instances: hr_goal_instances(
            id, assigned_goal_id, period_start, period_end, target_value, current_value, progress, status, created_at, updated_at, notes
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log("Raw goals from Supabase:", goals);

    const processed = await Promise.all(goals.map(async (goal) => {
      const now = new Date();

      const assignmentsWithPeriods = await Promise.all(goal.assignments.map(async (assignment) => {
        // Parse string values to numbers
        const parsedAssignment = {
          ...assignment,
          progress: parseFloat(assignment.progress || "0"),
          current_value: parseFloat(assignment.current_value || "0"),
          target_value: parseFloat(assignment.target_value || "0"),
          employee_id: assignment.employee_id,
          goal_type: assignment.goal_type,
        };

        // Determine active period based on goal_type
        let activeInstance: GoalInstance | null = null;
        const todayStr = now.toISOString().split("T")[0];
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString().split("T")[0];
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString().split("T")[0];
        const monthStart = startOfMonth(now).toISOString().split("T")[0];
        const monthEnd = endOfMonth(now).toISOString().split("T")[0];
        const yearStart = startOfYear(now).toISOString().split("T")[0];
        const yearEnd = endOfYear(now).toISOString().split("T")[0];

        if (assignment.instances?.length > 0) {
          activeInstance = assignment.instances.find(instance => {
            try {
              const periodStart = new Date(instance.period_start);
              const periodEnd = new Date(instance.period_end);
              switch (assignment.goal_type) {
                case "Daily":
                  return instance.period_start === todayStr && instance.period_end === todayStr;
                case "Weekly":
                  return isWithinInterval(now, { start: periodStart, end: periodEnd }) &&
                    periodStart.toISOString().split("T")[0] === weekStart &&
                    periodEnd.toISOString().split("T")[0] === weekEnd;
                case "Monthly":
                  return isWithinInterval(now, { start: periodStart, end: periodEnd }) &&
                    periodStart.toISOString().split("T")[0] === monthStart &&
                    periodEnd.toISOString().split("T")[0] === monthEnd;
                case "Yearly":
                  return isWithinInterval(now, { start: periodStart, end: periodEnd }) &&
                    periodStart.toISOString().split("T")[0] === yearStart &&
                    periodEnd.toISOString().split("T")[0] === yearEnd;
                default:
                  return false;
              }
            } catch (e) {
              console.warn(`Invalid dates for instance ${instance.id}: ${instance.period_start} - ${instance.period_end}`);
              return false;
            }
          }) || assignment.instances.reduce((latest, instance) => {
            const instanceDate = new Date(instance.created_at); // Fixed typo: 'Instance' to 'instance'
            const latestDate = latest ? new Date(latest.created_at) : new Date(0);
            return instanceDate > latestDate ? instance : latest;
          }, null as GoalInstance | null);
        }

        return {
          ...parsedAssignment,
          period_start: activeInstance?.period_start || assignment.instances?.[0]?.period_start,
          period_end: activeInstance?.period_end || assignment.instances?.[0]?.period_end,
          current_value: activeInstance ? parseFloat(activeInstance.current_value || "0") : parsedAssignment.current_value,
          target_value: activeInstance ? parseFloat(activeInstance.target_value || "0") : parsedAssignment.target_value,
          progress: activeInstance && activeInstance.current_value && activeInstance.target_value
            ? Math.min(Math.round((parseFloat(activeInstance.current_value) / parseFloat(activeInstance.target_value || "1")) * 100), 100)
            : parsedAssignment.progress,
          status: activeInstance?.status || parsedAssignment.status,
          instances: assignment.instances.map(instance => ({
            ...instance,
            progress: parseFloat(instance.progress || "0"),
            current_value: parseFloat(instance.current_value || "0"),
            target_value: parseFloat(instance.target_value || "0"),
          })),
        };
      }));

      const totalTargetValue = assignmentsWithPeriods.reduce((sum, a) => sum + a.target_value, 0);
      const totalCurrentValue = assignmentsWithPeriods.reduce((sum, a) => sum + a.current_value, 0);
      const overallProgress = totalTargetValue > 0 
        ? Math.min(Math.round((totalCurrentValue / totalTargetValue) * 100), 100)
        : 0;

      return {
        ...goal,
        start_date: goal.start_date,
        end_date: goal.end_date,
        metric_unit: goal.metric_unit,
        assignments: assignmentsWithPeriods,
        assignedTo: assignmentsWithPeriods
          .map(a => a.employee)
          .filter((e): e is Employee => Boolean(e)),
        totalTargetValue,
        totalCurrentValue,
        overallProgress,
      };
    }));

    console.log("Processed goals with details:", processed);

    return processed;
  } catch (error) {
    console.error("Error getting goals with details:", error);
    throw error;
  }
};

export const getGoalInstances = async (goalId: string, goalType: string): Promise<GoalInstance[]> => {
  try {
    if (!goalType) {
      console.warn("No goalType provided, returning empty instances");
      return [];
    }

    const { data, error } = await supabase
      .from('hr_goal_instances')
      .select(`
        id, assigned_goal_id, period_start, period_end, target_value, current_value, progress, status, created_at, updated_at, notes,
        assigned_goal: hr_assigned_goals(
                  id,
          goal_type,
          employee: hr_employees(id, first_name, last_name, email, position),
          goal: hr_goals(name)
        )
      `)
      .eq('assigned_goal.goal_id', goalId)
      .eq('assigned_goal.goal_type', goalType)
      .order('period_start', { ascending: false });

    if (error) throw error;

    const instances = data.map(instance => ({
      ...instance,
      progress: parseFloat(instance.progress || "0"),
      current_value: parseFloat(instance.current_value || "0"),
      target_value: parseFloat(instance.target_value || "0"),
      employee: instance.assigned_goal?.employee,
    }));

    return instances;
  } catch (error) {
    console.error("Error getting goal instances:", error);
    return [];
  }
};

export const updateGoalInstance = async (
  instanceId: string,
  updates: { target_value?: number; current_value?: number; status?: string }
): Promise<GoalInstance | null> => {
  try {
    const { data, error } = await supabase
      .from('hr_goal_instances')
      .update({
        ...updates,
        progress: updates.current_value && updates.target_value 
          ? Math.min(Math.round((updates.current_value / updates.target_value) * 100), 100)
          : undefined,
        updated_at: new Date(),
      })
      .eq('id', instanceId)
      .select(`
        id, assigned_goal_id, period_start, period_end, target_value, current_value, progress, status, created_at, updated_at, notes,
        assigned_goal: hr_assigned_goals(employee: hr_employees(id, first_name, last_name, email, position))
      `)
      .single();

    if (error) throw error;

    return {
      ...data,
      progress: parseFloat(data.progress || "0"),
      current_value: parseFloat(data.current_value || "0"),
      target_value: parseFloat(data.target_value || "0"),
      employee: data.assigned_goal?.employee,
    };
  } catch (error) {
    console.error("Error updating goal instance:", error);
    return null;
  }
};

export const deleteGoalInstance = async (instanceId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('hr_goal_instances')
      .delete()
      .eq('id', instanceId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting goal instance:", error);
    return false;
  }
};

export const updateEmployeeGoalTarget = async (
  assignedGoalId: string,
  newTargetValue: number,
  specificDate?: string
): Promise<AssignedGoal | null> => {
  try {
    const { data: assignedGoal, error: fetchError } = await supabase
      .from("hr_assigned_goals")
      .select("*, employee:hr_employees(id, first_name, last_name, email, position)")
      .eq("id", assignedGoalId)
      .single();

    if (fetchError) throw fetchError;

    const goalType = assignedGoal.goal_type;
    const targetDate = specificDate ? new Date(specificDate) : new Date();
    const targetDateISO = targetDate.toISOString().split("T")[0];

const authData = getAuthDataFromLocalStorage();
    if (!authData) {
      throw new Error('Failed to retrieve authentication data');
    }
    const { organization_id, userId } = authData;

    let periodStart: string;
    let periodEnd: string;

    switch (goalType) {
      case "Daily":
        periodStart = targetDateISO;
        periodEnd = targetDateISO;
        break;
      case "Weekly":
        periodStart = startOfWeek(targetDate, { weekStartsOn: 1 }).toISOString().split("T")[0];
        periodEnd = endOfWeek(targetDate, { weekStartsOn: 1 }).toISOString().split("T")[0];
        break;
      case "Monthly":
        periodStart = startOfMonth(targetDate).toISOString().split("T")[0];
        periodEnd = endOfMonth(targetDate).toISOString().split("T")[0];
        break;
      case "Yearly":
        periodStart = startOfYear(targetDate).toISOString().split("T")[0];
        periodEnd = endOfYear(targetDate).toISOString().split("T")[0];
        break;
      default:
        throw new Error(`Unsupported goal_type: ${goalType}`);
    }

    let { data: instance, error: instanceFetchError } = await supabase
      .from("hr_goal_instances")
      .select("*")
      .eq("assigned_goal_id", assignedGoalId)
      .gte("period_start", periodStart)
      .lte("period_end", periodEnd)
      .single();

    if (instanceFetchError && instanceFetchError.code !== "PGRST116") {
      throw instanceFetchError;
    }

    if (!instance) {
      const { data: newInstance, error: insertError } = await supabase
        .from("hr_goal_instances")
        .insert({
          assigned_goal_id: assignedGoalId,
          period_start: periodStart,
          period_end: periodEnd,
          target_value: newTargetValue,
          current_value: 0,
          progress: 0,
          status: "pending",
          created_at: new Date(),
          updated_at: new Date(),
          notes: null,
          organization_id,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      instance = newInstance;
    } else {
      const { data: updatedInstance, error: instanceUpdateError } = await supabase
        .from("hr_goal_instances")
        .update({
          target_value: newTargetValue,
          status: "in-progress",
          updated_at: new Date(),
        })
        .eq("id", instance.id)
        .select()
        .single();

      if (instanceUpdateError) throw instanceUpdateError;
      instance = updatedInstance;
    }

    return {
      ...assignedGoal,
      progress: parseFloat(assignedGoal.progress || "0"),
      current_value: parseFloat(assignedGoal.current_value || "0"),
      target_value: parseFloat(assignedGoal.target_value || "0"),
      employee_id: assignedGoal.employee_id,
      goal_type: assignedGoal.goal_type,
    };
  } catch (error) {
    console.error("Error updating employee goal target:", error);
    return null;
  }
};

export const extendEmployeeGoalTarget = async (
  assignedGoalId: string,
  additionalTargetValue: number
): Promise<AssignedGoal | null> => {
  try {
    const { data: currentAssignedGoal, error: fetchError } = await supabase
      .from('hr_assigned_goals')
      .select('*, employee:hr_employees(id, first_name, last_name, email, position)')
      .eq('id', assignedGoalId)
      .single();

    if (fetchError) throw fetchError;

    const newTargetValue = parseFloat(currentAssignedGoal.target_value || "0") + additionalTargetValue;

    const { data, error } = await supabase
      .from('hr_assigned_goals')
      .update({
        target_value: newTargetValue,
        status: 'in-progress',
        updated_at: new Date(),
      })
      .eq('id', assignedGoalId)
      .select('*, employee:hr_employees(id, first_name, last_name, email, position)')
      .single();

    if (error) throw error;

    const { data: currentInstance, error: instanceFetchError } = await supabase
      .from('hr_goal_instances')
      .select('*')
      .eq('assigned_goal_id', assignedGoalId)
      .order('period_end', { ascending: false })
      .limit(1)
      .single();

    if (instanceFetchError) throw instanceFetchError;

    const { error: instanceUpdateError } = await supabase
      .from('hr_goal_instances')
      .update({
        target_value: newTargetValue,
        status: 'in-progress',
        updated_at: new Date(),
      })
      .eq('id', currentInstance.id);

    if (instanceUpdateError) throw instanceUpdateError;

    return {
      ...data,
      progress: parseFloat(data.progress || "0"),
      current_value: parseFloat(data.current_value || "0"),
      target_value: parseFloat(data.target_value || "0"),
      employee_id: data.employee_id,
      goal_type: data.goal_type,
    };
  } catch (error) {
    console.error("Error extending employee goal target:", error);
    return null;
  }
};

export const removeEmployeeFromGoal = async (assignedGoalId: string): Promise<boolean> => {
  try {
    const { error: instancesError } = await supabase
      .from('hr_goal_instances')
      .delete()
      .eq('assigned_goal_id', assignedGoalId);

    if (instancesError) throw instancesError;

    const { error } = await supabase
      .from('hr_assigned_goals')
      .delete()
      .eq('id', assignedGoalId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error("Error removing employee from goal:", error);
    return false;
  }
};

export const addEmployeesToGoal = async (
  goalId: string,
  employees: { employeeId: string; targetValue: number }[],
  goalType: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly'
): Promise<boolean> => {
  try {

const authData = getAuthDataFromLocalStorage();
    if (!authData) {
      throw new Error('Failed to retrieve authentication data');
    }
    const { organization_id, userId } = authData;

    for (const employee of employees) {
      const { error } = await supabase
        .from('hr_assigned_goals')
        .insert({
          goal_id: goalId,
          employee_id: employee.employeeId,
          target_value: employee.targetValue,
          current_value: 0,
          progress: 0,
          status: 'pending',
          goal_type: goalType,
          assigned_at: new Date(),
          updated_at: new Date(),
          organization_id,
        });

      if (error) throw error;
    }

    return true;
  } catch (error) {
    console.error("Error adding employees to goal:", error);
    return false;
  }
};

export const calculateGoalStatistics = (goals: GoalWithDetails[]): GoalStatistics => {
  const totalGoals = goals.length;
  const completedGoals = goals.filter(goal => 
    goal.assignments?.every(a => a.status === "completed")
  ).length;
  
  const inProgressGoals = goals.filter(goal => 
    goal.assignments?.some(a => a.status === "in-progress")
  ).length;
  
  const overdueGoals = goals.filter(goal => 
    goal.assignments?.some(a => a.status === "overdue")
  ).length;
  
  const pendingGoals = goals.filter(goal => 
    goal.assignments?.every(a => a.status === "pending")
  ).length;
  
  const completionRate = totalGoals > 0 
    ? Math.round((completedGoals / totalGoals) * 100) 
    : 0;

  return {
    totalGoals,
    completedGoals,
    inProgressGoals,
    overdueGoals,
    pendingGoals,
    completionRate
  };
};

export const getAvailableEmployees = async (): Promise<Employee[]> => {
  try {
    const { data, error } = await supabase
      .from('hr_employees')
      .select('id, first_name, last_name, email, position, department:hr_departments(name)')
      .eq('employment_status', 'active')
      .order('first_name');

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching available employees:", error);
    return [];
  }
};

export const updateGoal = async (goalId: string, updates: Partial<GoalWithDetails>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('hr_goals')
      .update(updates)
      .eq('id', goalId);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error("Error updating goal:", error);
    return false;
  }
};