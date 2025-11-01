// src/components/goals/employee/EmployeeGoalDashboard.tsx

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEmployeeGoals } from "@/lib/supabaseData";
import { Employee, GoalWithDetails } from "@/types/goal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, CheckCircle2, AlertTriangle } from "lucide-react";
import EmployeeGoalCard from "./EmployeeGoalCard"; // This will be our new card component
import GoalPieChart from "../charts/GoalPieChart";
import GoalProgressTable from "../common/GoalProgressTable";

interface EmployeeGoalDashboardProps {
  employee: Employee;
}

const EmployeeGoalDashboard: React.FC<EmployeeGoalDashboardProps> = ({ employee }) => {
  const { data: goals, isLoading, error, refetch } = useQuery({
    queryKey: ["employeeGoals", employee.id],
    queryFn: () => getEmployeeGoals(employee.id),
    enabled: !!employee.id,
  });

  const stats = useMemo(() => {
    if (!goals) {
      return { totalGoals: 0, completedGoals: 0, inProgressGoals: 0, overdueGoals: 0, pendingGoals: 0, goalsByType: {}, completionRate: 0 };
    }
    const allInstances = goals.flatMap(goal => goal.instances || []);
    const totalGoals = allInstances.length;
    const completedGoals = allInstances.filter(instance => instance.status === "completed").length;
    const inProgressGoals = allInstances.filter(instance => instance.status === "in-progress").length;
    const overdueGoals = allInstances.filter(instance => instance.status === "overdue").length;
    const pendingGoals = allInstances.filter(instance => instance.status === "pending").length;

    const goalsByType = goals.flatMap(goal => goal.assignmentDetails || [])
      .reduce((acc, detail) => {
        acc[detail.goalType] = (acc[detail.goalType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return {
      totalGoals,
      completedGoals,
      inProgressGoals,
      overdueGoals,
      pendingGoals,
      goalsByType,
      completionRate: totalGoals ? Math.round((completedGoals / totalGoals) * 100) : 0
    };
  }, [goals]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader><Skeleton className="h-8 w-64" /></CardHeader>
          <CardContent className="space-y-4"><Skeleton className="h-40 w-full" /></CardContent>
        </Card>
      </div>
    );
  }

  if (error || !goals || goals.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <h3 className="text-lg font-medium">No Goals Assigned</h3>
          <p className="text-gray-500 mt-2">This employee doesn&apos;t have any goals assigned yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats and Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
            <CardHeader className="pb-2"><CardTitle className="text-2xl font-bold">{stats.totalGoals}</CardTitle><CardDescription>Total Goal Instances</CardDescription></CardHeader>
        </Card>
        <Card>
            <CardHeader className="pb-2"><div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" /><CardTitle>{stats.completedGoals}</CardTitle></div><CardDescription>Completed</CardDescription></CardHeader>
        </Card>
        <Card>
            <CardHeader className="pb-2"><div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-blue-500" /><CardTitle>{stats.inProgressGoals}</CardTitle></div><CardDescription>In Progress</CardDescription></CardHeader>
        </Card>
        <Card>
            <CardHeader className="pb-2"><div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" /><CardTitle>{stats.overdueGoals}</CardTitle></div><CardDescription>Overdue</CardDescription></CardHeader>
        </Card>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
            <CardHeader><CardTitle>Goal Status Distribution</CardTitle></CardHeader>
            <CardContent className="flex justify-center items-center">
                <GoalPieChart data={[{ name: 'Completed', value: stats.completedGoals, color: '#10b981' }, { name: 'In Progress', value: stats.inProgressGoals, color: '#3b82f6' }, { name: 'Overdue', value: stats.overdueGoals, color: '#ef4444' }, { name: 'Pending', value: stats.pendingGoals, color: '#f59e0b' }]} />
            </CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle>Goal Performance Summary</CardTitle></CardHeader>
            <CardContent><GoalProgressTable employee={employee} goalStats={stats} /></CardContent>
        </Card>
      </div>
      
      {/* Main Goal Cards Section */}
      <Card>
        <CardHeader>
          <CardTitle>My Goals</CardTitle>
          <CardDescription>Select a goal type within each card to view and update progress for the current period.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map((goal) => (
              <EmployeeGoalCard
                key={goal.id}
                goal={goal}
                employee={employee}
                onUpdate={refetch}
              />
            ))}
          </div>
          {goals.length === 0 && (
            <div className="text-center py-10">
              <p className="text-gray-500">No goals found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeGoalDashboard;