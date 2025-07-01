import React, { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEmployeeGoals } from "@/lib/supabaseData";
import { Employee, GoalType, GoalWithDetails, GoalInstance } from "@/types/goal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Clock,
  PieChart,
  Calendar
} from "lucide-react";
import EmployeeGoalCard from "./EmployeeGoalCard";
import GoalPieChart from "../charts/GoalPieChart";
import GoalProgressTable from "../common/GoalProgressTable";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';

interface EmployeeGoalDashboardProps {
  employee: Employee;
}

const EmployeeGoalDashboard: React.FC<EmployeeGoalDashboardProps> = ({ employee }) => {
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedGoalType, setSelectedGoalType] = useState<string>("all");
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [updatedInstances, setUpdatedInstances] = useState<Record<string, Partial<GoalInstance>>>({});

  const { data: goals, isLoading, error } = useQuery({
    queryKey: ["employeeGoals", employee.id],
    queryFn: () => getEmployeeGoals(employee.id),
    enabled: !!employee.id,
  });

  console.log('Raw Goals Data for Employee', {
    employeeId: employee.id,
    goals: goals?.map(goal => ({
      id: goal.id,
      name: goal.name,
      instances: goal.instances?.map(instance => ({
        id: instance.id,
        assignedGoalId: instance.assignedGoalId,
        periodStart: instance.periodStart,
        periodEnd: instance.periodEnd,
        targetValue: instance.targetValue,
        currentValue: instance.currentValue,
        progress: instance.progress,
        status: instance.status,
        goalType: goal.assignmentDetails?.find(ad => ad.id === instance.assignedGoalId)?.goalType
      }))
    })),
    fetchTime: new Date().toISOString()
  });

  // Callback to handle instance updates from EmployeeGoalCard
  const handleInstanceUpdate = useCallback((instanceId: string, updates: Partial<GoalInstance>) => {
    setUpdatedInstances(prev => ({
      ...prev,
      [instanceId]: { ...prev[instanceId], ...updates }
    }));
    console.log('Instance Updated', { instanceId, updates });
  }, []);

  // Merge raw goal instances with updated instances
  const mergedGoals = useMemo(() => {
    if (!goals) return [];
    return goals.map(goal => ({
      ...goal,
      instances: (goal.instances || []).map(instance => ({
        ...instance,
        ...updatedInstances[instance.id]
      }))
    }));
  }, [goals, updatedInstances]);

  // Separate function to filter by goal type
  const filterByGoalType = (goals: GoalWithDetails[], goalType: string): GoalWithDetails[] => {
    if (!goals || goalType === "all") return goals || [];
    const filtered = goals.filter(goal => {
      const hasMatchingGoalType = goal.assignmentDetails?.some(ad =>
        ad.goalType.toLowerCase() === goalType.toLowerCase()
      );
      if (!hasMatchingGoalType) {
        console.warn('Goal Type Filter: No matching goal type', {
          goalId: goal.id,
          goalName: goal.name,
          requestedGoalType: goalType,
          availableGoalTypes: goal.assignmentDetails?.map(ad => ad.goalType) || []
        });
      }
      return hasMatchingGoalType;
    });
    console.log('Goal Type Filter Applied', {
      selectedGoalType: goalType,
      availableGoalTypes: goals.flatMap(goal => goal.assignmentDetails?.map(ad => ad.goalType) || []),
      filteredGoals: filtered.map(goal => ({
        id: goal.id,
        name: goal.name,
        goalTypes: goal.assignmentDetails?.map(ad => ad.goalType)
      }))
    });
    return filtered;
  };

  // Separate function to filter instances by status
  const filterByStatus = (instances: GoalInstance[], status: string): GoalInstance[] => {
    if (!instances || status === "all") return instances || [];
    const filtered = instances.filter(instance => {
      const matches = instance.status === status;
      if (!matches) {
        console.warn('Status Filter: No match', {
          instanceId: instance.id,
          requestedStatus: status,
          actualStatus: instance.status
        });
      }
      return matches;
    });
    return filtered;
  };

  // Separate function to filter instances by history/current
  const filterByHistory = (instances: GoalInstance[], showHistory: boolean): GoalInstance[] => {
    if (showHistory) return instances;

    // Get current date in IST (UTC+5:30)
    const now = new Date();
    const istOffsetMinutes = 5 * 60 + 30; // 5 hours 30 minutes
    const istTime = new Date(now.getTime() + istOffsetMinutes * 60 * 1000);
    const todayStr = format(istTime, 'yyyy-MM-dd');

    return instances.filter(instance => {
      try {
        // Parse periodStart and periodEnd as UTC dates
        const startDate = new Date(instance.periodStart + 'Z'); // Append 'Z' to treat as UTC
        const endDate = new Date(instance.periodEnd + 'Z');

        // Convert to IST by adding 5:30 hours
        const startDateIST = new Date(startDate.getTime() + istOffsetMinutes * 60 * 1000);
        const endDateIST = new Date(endDate.getTime() + istOffsetMinutes * 60 * 1000);

        // Format dates to yyyy-MM-dd
        const startDateStr = format(startDateIST, 'yyyy-MM-dd');
        const endDateStr = format(endDateIST, 'yyyy-MM-dd');

        const isCurrent = startDateStr <= todayStr && endDateStr >= todayStr;
        if (!isCurrent) {
          console.warn('History Filter: Excluded non-current instance', {
            instanceId: instance.id,
            startDateStr,
            endDateStr,
            todayStr,
            periodStartRaw: instance.periodStart,
            periodEndRaw: instance.periodEnd
          });
        }
        return isCurrent;
      } catch (error) {
        console.error('History Filter: Invalid date', {
          instanceId: instance.id,
          periodStart: instance.periodStart,
          periodEnd: instance.periodEnd,
          error
        });
        return false;
      }
    });
  };

  // Combined filtering logic
  const filteredGoals = useMemo(() => {
    const filteredByType = filterByGoalType(mergedGoals, selectedGoalType);
    const result = filteredByType.flatMap(goal => {
      const instances = goal.instances || [];
      let filteredInstances = filterByStatus(instances, selectedStatus);
      filteredInstances = filterByHistory(filteredInstances, showHistory);
      return filteredInstances.map(instance => ({ goal, instance }));
    });

    console.log('Filtered Goals', {
      selectedStatus,
      selectedGoalType,
      showHistory,
      goalCount: result.length,
      goals: result.map(({ goal, instance }) => ({
        goalId: goal.id,
        instanceId: instance.id,
        status: instance.status,
        goalType: goal.assignmentDetails?.find(ad => ad.id === instance.assignedGoalId)?.goalType,
        periodStart: instance.periodStart,
        periodEnd: instance.periodEnd
      }))
    });

    return result;
  }, [mergedGoals, selectedGoalType, selectedStatus, showHistory]);

  // Calculate summary statistics
  const stats = useMemo(() => {
    const filteredByType = filterByGoalType(mergedGoals, selectedGoalType);
    const allInstances = filteredByType.flatMap(goal => goal.instances || []);
    const totalGoals = allInstances.length;
    const completedGoals = allInstances.filter(instance => instance.status === "completed").length;
    const inProgressGoals = allInstances.filter(instance => instance.status === "in-progress").length;
    const overdueGoals = allInstances.filter(instance => instance.status === "overdue").length;
    const pendingGoals = allInstances.filter(instance => instance.status === "pending").length;

    const goalsByType = filteredByType
      .flatMap(goal => 
        goal.instances?.map(instance => ({
          instance,
          goalType: goal.assignmentDetails?.find(ad => ad.id === instance.assignedGoalId)?.goalType
        })) || []
      )
      .reduce((acc, { goalType }) => {
        if (goalType) {
          acc[goalType] = (acc[goalType] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

    const goalsByStatus = {
      completed: completedGoals,
      inProgress: inProgressGoals,
      overdue: overdueGoals,
      pending: pendingGoals
    };

    console.log('Stats Debug', {
      totalGoals,
      completedGoals,
      inProgressGoals,
      overdueGoals,
      pendingGoals,
      goalsByType,
      goalsByStatus,
      allInstances: allInstances.map(instance => ({
        instanceId: instance.id,
        status: instance.status,
        goalType: filteredByType
          .flatMap(goal => goal.assignmentDetails || [])
          .find(ad => ad.id === instance.assignedGoalId)?.goalType
      }))
    });

    return {
      totalGoals,
      completedGoals,
      inProgressGoals,
      overdueGoals,
      pendingGoals,
      goalsByType,
      goalsByStatus,
      completionRate: totalGoals ? Math.round((completedGoals / totalGoals) * 100) : 0
    };
  }, [mergedGoals, selectedGoalType]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !goals || goals.length === 0) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="text-center">
            <h3 className="text-lg font-medium">No Goals Assigned</h3>
            <p className="text-gray-500 mt-2">
              This employee doesn't have any goals assigned yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold">{stats.totalGoals}</CardTitle>
            <CardDescription>Total Goals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(stats.goalsByType).map(([type, count]) => (
                <Badge key={type} variant="outline">
                  {count} {type}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <CardTitle className="text-2xl font-bold">{stats.completedGoals}</CardTitle>
            </div>
            <CardDescription>Completed</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress
              value={stats.totalGoals > 0 ? (stats.completedGoals / stats.totalGoals) * 100 : 0}
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-2xl font-bold">{stats.inProgressGoals}</CardTitle>
            </div>
            <CardDescription>In Progress</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress
              value={stats.totalGoals > 0 ? (stats.inProgressGoals / stats.totalGoals) * 100 : 0}
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <CardTitle className="text-2xl font-bold">{stats.overdueGoals}</CardTitle>
            </div>
            <CardDescription>Overdue</CardDescription>
          </CardHeader>
          <CardContent>
            <Progress
              value={stats.totalGoals > 0 ? (stats.overdueGoals / stats.totalGoals) * 100 : 0}
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Goal Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center items-center">
            <GoalPieChart 
              data={[
                { name: 'Completed', value: stats.completedGoals, color: '#10b981' },
                { name: 'In Progress', value: stats.inProgressGoals, color: '#3b82f6' },
                { name: 'Overdue', value: stats.overdueGoals, color: '#ef4444' },
                { name: 'Pending', value: stats.pendingGoals, color: '#f59e0b' }
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Goal Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <GoalProgressTable 
              employee={employee} 
              goalStats={stats}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Goal Status</CardTitle>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={showHistory ? "default" : "outline"} 
                className="cursor-pointer" 
                onClick={() => setShowHistory(!showHistory)}
              >
                <Calendar className="h-4 w-4 mr-1" />
                {showHistory ? "Showing All History" : "Showing Current Only"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-4 justify-center sm:justify-start">
              <Button
                variant={selectedGoalType === "all" ? "default" : "outline"}
                onClick={() => setSelectedGoalType("all")}
                className="flex items-center gap-2"
              >
                <BarChart3 size={16} />
                All Goals
              </Button>
              <Button
                variant={selectedGoalType === "Daily" ? "default" : "outline"}
                onClick={() => setSelectedGoalType("Daily")}
                className="flex items-center gap-2"
              >
                <Clock size={16} />
                Daily
              </Button>
              <Button
                variant={selectedGoalType === "Weekly" ? "default" : "outline"}
                onClick={() => setSelectedGoalType("Weekly")}
                className="flex items-center gap-2"
              >
                <Calendar size={16} />
                Weekly
              </Button>
              <Button
                variant={selectedGoalType === "Monthly" ? "default" : "outline"}
                onClick={() => setSelectedGoalType("Monthly")}
                className="flex items-center gap-2"
              >
                <BarChart3 size={16} />
                Monthly
              </Button>
              <Button
                variant={selectedGoalType === "Yearly" ? "default" : "outline"}
                onClick={() => setSelectedGoalType("Yearly")}
                className="flex items-center gap-2"
              >
                <CheckCircle2 size={16} />
                Yearly
              </Button>
            </div> */}

            <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-4 justify-center sm:justify-start">
              <Button
                variant={selectedStatus === "all" ? "default" : "outline"}
                onClick={() => setSelectedStatus("all")}
                className="flex items-center gap-2"
              >
                <BarChart3 size={16} />
                All Statuses
              </Button>
              <Button
                variant={selectedStatus === "in-progress" ? "default" : "outline"}
                onClick={() => setSelectedStatus("in-progress")}
                className="flex items-center gap-2"
              >
                <BarChart3 size={16} />
                In Progress
              </Button>
              <Button
                variant={selectedStatus === "completed" ? "default" : "outline"}
                onClick={() => setSelectedStatus("completed")}
                className="flex items-center gap-2"
              >
                <CheckCircle2 size={16} />
                Completed
              </Button>
              <Button
                variant={selectedStatus === "overdue" ? "default" : "outline"}
                onClick={() => setSelectedStatus("overdue")}
                className="flex items-center gap-2"
              >
                <AlertTriangle size={16} />
                Overdue
              </Button>
              <Button
                variant={selectedStatus === "pending" ? "default" : "outline"}
                onClick={() => setSelectedStatus("pending")}
                className="flex items-center gap-2"
              >
                <Clock size={16} />
                Pending
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGoals.map(({ goal, instance }) => (
                <EmployeeGoalCard
                  key={`${goal.id}-${instance.id}`}
                  goal={goal}
                  goalInstance={instance}
                  employee={employee}
                  onInstanceUpdate={handleInstanceUpdate}
                />
              ))}
            </div>
            {filteredGoals.length === 0 && (
              <div className="text-center py-10">
                <p className="text-gray-500">No goals found with the selected filters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeGoalDashboard;

// 