import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getGoalsWithDetails, getGoalInstances } from "@/lib/goalService";
import { GoalWithDetails, GoalInstance, Employee } from "@/types/goal";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const GoalDetailView: React.FC = () => {
  const { goalId, goalType } = useParams<{ goalId: string; goalType?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [goal, setGoal] = useState<GoalWithDetails | null>(null);
  const [instances, setInstances] = useState<GoalInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterError, setFilterError] = useState<string | null>(null);

  const fetchInstances = async () => {
    try {
      setIsLoading(true);
      let data: GoalInstance[] = [];

      if (!goalType || goalType === "All") {
        // Fetch all goal types for this goal
        const goalTypes = ["Daily", "Weekly", "Monthly"];
        for (const type of goalTypes) {
          const typeData = await getGoalInstances(goalId!, type);
          data = [...data, ...typeData];
        }
      } else {
        data = await getGoalInstances(goalId!, goalType);
      }

      // Log raw data for debugging
      console.log("Raw instances:", JSON.stringify(data, null, 2));

      // Filter instances with strict requirements
      const validInstances = data.filter((instance) => {
        const hasValidId = !!instance.id;
        const hasAssignedGoal = !!instance.assigned_goal;
        const hasValidGoalType =
          hasAssignedGoal &&
          typeof instance.assigned_goal.goal_type === "string" &&
          instance.assigned_goal.goal_type.trim() !== "" &&
          (!goalType || goalType === "All" || instance.assigned_goal.goal_type === goalType);
        const hasEmployee = !!instance.employee;
        const hasValidEmployeeName =
          hasEmployee &&
          (typeof instance.employee.first_name === "string" ||
            typeof instance.employee.last_name === "string") &&
          (instance.employee.first_name?.trim() || instance.employee.last_name?.trim());

        if (!hasValidId) console.warn(`Instance filtered out: missing id`);
        if (!hasAssignedGoal) console.warn(`Instance ${instance.id} filtered out: missing assigned_goal`);
        if (hasAssignedGoal && !hasValidGoalType)
          console.warn(
            `Instance ${instance.id} filtered out: invalid goal_type "${
              instance.assigned_goal?.goal_type ?? "undefined"
            }" for goalType "${goalType || "All"}"`
          );
        if (!hasEmployee) console.warn(`Instance ${instance.id} filtered out: missing employee data`);
        if (hasEmployee && !hasValidEmployeeName)
          console.warn(`Instance ${instance.id} filtered out: missing or invalid employee first_name and last_name`);

        return hasValidId && hasAssignedGoal && hasValidGoalType && hasEmployee && hasValidEmployeeName;
      });

      // Sort by period_end (newest first)
      const sortedInstances = validInstances.sort(
        (a, b) => new Date(b.period_end).getTime() - new Date(a.period_end).getTime()
      );

      console.log(`Fetched ${data.length} instances, filtered to ${sortedInstances.length}`);
      setInstances(sortedInstances);

      if (sortedInstances.length === 0 && data.length > 0) {
        setFilterError(
          `No valid instances found for goal type "${goalType || "All"}". Data may be missing valid employee or goal information.`
        );
      } else {
        setFilterError(null);
      }
    } catch (error) {
      console.error("Error fetching goal instances:", error);
      toast({
        title: "Error",
        description: "Failed to load goal instances.",
        variant: "destructive",
      });
      setFilterError("Failed to load instances. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchGoalData = async () => {
      setIsLoading(true);
      try {
        const goals = await getGoalsWithDetails();
        const selectedGoal = goals.find((g) => g.id === goalId);
        if (!selectedGoal) {
          toast({
            title: "Error",
            description: "Goal not found.",
            variant: "destructive",
          });
          navigate("/goals");
          return;
        }
        setGoal(selectedGoal);
        console.log("Raw assignments:", JSON.stringify(selectedGoal.assignments, null, 2));
        await fetchInstances();
      } catch (error) {
        console.error("Error fetching goal details:", error);
        toast({
          title: "Error",
          description: "Failed to load goal details.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (goalId) {
      fetchGoalData();
    }
  }, [goalId, goalType, navigate, toast]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch (e) {
      console.error("Invalid date:", dateStr);
      return "Invalid date";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Filter assignments by selected goal type with strict validation
  const filteredAssignments = (goalType
    ? goal?.assignments.filter((a) => {
        const hasValidGoalType = typeof a.goal_type === "string" && a.goal_type.trim() !== "" && a.goal_type === goalType;
        const hasValidEmployee = !!a.employee && (a.employee.first_name?.trim() || a.employee.last_name?.trim());
        if (!hasValidGoalType) {
          console.warn(`Assignment ${a.id} filtered out: invalid goal_type "${a.goal_type ?? "undefined"}" for goalType "${goalType}"`);
        }
        if (!hasValidEmployee) {
          console.warn(`Assignment ${a.id} filtered out: missing or invalid employee data`);
        }
        return hasValidGoalType && hasValidEmployee;
      }) || []
    : goal?.assignments.filter((a) => {
        const hasValidGoalType = typeof a.goal_type === "string" && a.goal_type.trim() !== "";
        const hasValidEmployee = !!a.employee && (a.employee.first_name?.trim() || a.employee.last_name?.trim());
        if (!hasValidGoalType) {
          console.warn(`Assignment ${a.id} filtered out: invalid goal_type "${a.goal_type ?? "undefined"}"`);
        }
        if (!hasValidEmployee) {
          console.warn(`Assignment ${a.id} filtered out: missing or invalid employee data`);
        }
        return hasValidGoalType && hasValidEmployee;
      }) || []
  );

  // Calculate progress and totals for the selected goal type
  const typeProgress = filteredAssignments.length > 0
    ? Math.min(
        Math.round(
          (filteredAssignments.reduce((sum, a) => sum + (a.current_value || 0), 0) /
            filteredAssignments.reduce((sum, a) => sum + (a.target_value || 1), 0)) * 100
        ),
        100
      )
    : 0;

  const totalCurrentValue = filteredAssignments.reduce((sum, a) => sum + (a.current_value || 0), 0);
  const totalTargetValue = filteredAssignments.reduce((sum, a) => sum + (a.target_value || 0), 0);

  // Prepare data for current performance comparison chart
  const chartData = {
    labels: filteredAssignments.map((a) => `${a.employee?.first_name || ""} ${a.employee?.last_name || ""}`.trim()) || [],
    datasets: [
      {
        label: "Progress (%)",
        data: filteredAssignments.map((a) => a.progress || 0) || [],
        backgroundColor: "rgba(59, 130, 246, 0.5)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: true,
        text: `Current Employee Progress (${goalType || "All Types"})`,
        font: {
          size: 16,
        },
      },
      tooltip: {
        bodyFont: {
          size: 12,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: "Progress (%)",
          font: {
            size: 12,
          },
        },
        ticks: {
          font: {
            size: 10,
          },
        },
      },
      x: {
        ticks: {
          font: {
            size: 10,
          },
          maxRotation: 0,
          minRotation: 0,
        },
      },
    },
  };

  // Prepare data for historical performance comparison chart
  const historicalChartData = (() => {
    const employeeProgress: Record<string, { totalProgress: number; count: number }> = {};

    instances.forEach((instance) => {
      if (!instance.employee) {
        console.warn(`Instance ${instance.id} skipped in chart: employee is undefined`);
        return;
      }
      const employeeName = `${instance.employee.first_name || ""} ${instance.employee.last_name || ""}`.trim();
      if (!employeeName) {
        console.warn(`Instance ${instance.id} skipped in chart: employee name is empty`);
        return;
      }

      if (!employeeProgress[employeeName]) {
        employeeProgress[employeeName] = { totalProgress: 0, count: 0 };
      }
      employeeProgress[employeeName].totalProgress += instance.progress || 0;
      employeeProgress[employeeName].count += 1;
    });

    const labels = Object.keys(employeeProgress);
    const data = labels.map(
      (label) =>
        employeeProgress[label].count > 0
          ? Math.round(employeeProgress[label].totalProgress / employeeProgress[label].count)
          : 0
    );

    return {
      labels,
      datasets: [
        {
          label: "Average Progress (%)",
          data,
          backgroundColor: "rgba(34, 197, 94, 0.5)",
          borderColor: "rgba(34, 197, 94, 1)",
          borderWidth: 1,
        },
      ],
    };
  })();

  const historicalChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: true,
        text: `Historical Employee Progress (${goalType || "All Types"})`,
        font: {
          size: 16,
        },
      },
      tooltip: {
        bodyFont: {
          size: 12,
        },
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            return `Average Progress: ${value}%`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: "Average Progress (%)",
          font: {
            size: 12,
          },
        },
        ticks: {
          font: {
            size: 10,
          },
        },
      },
      x: {
        ticks: {
          font: {
            size: 10,
          },
          maxRotation: 0,
          minRotation: 0,
        },
      },
    },
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <p className="ml-2 text-gray-500 text-sm sm:text-base">Loading goal details...</p>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-500 text-sm sm:text-base">Goal not found.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-full">
      <Button
        variant="outline"
        onClick={() => navigate("/goals")}
        className="mb-6 text-sm sm:text-base px-3 sm:px-4 py-1 sm:py-2"
      >
        ← Back to Goals
      </Button>

      {/* Goal Overview */}
      <Card className="mb-6 w-full">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">
            {goal.name} {goalType ? `- ${goalType}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm sm:text-base">
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Description</p>
              <p>{goal.description || "No description available"}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Sector</p>
              <p>{goal.sector || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Date Range</p>
              <p>
                {formatDate(goal.start_date)} - {formatDate(goal.end_date)}
              </p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Metric Unit</p>
              <p>{goal.metric_unit || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Overall Progress</p>
              <p>{typeProgress}%</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-500">Total Value</p>
              <p>
                {totalCurrentValue} / {totalTargetValue} {goal.metric_unit}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Performance Comparison */}
      <Card className="mb-6 w-full">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">
            Current Performance Comparison {goalType ? `(${goalType})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] sm:h-[300px]">
            <Bar
              data={chartData}
              options={chartOptions}
              aria-label={`Current performance comparison chart for ${goalType || "all"} goal types`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Assigned Employees */}
      <Card className="mb-6 w-full">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">
            Assigned Employees {goalType ? `(${goalType})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <ScrollArea className="h-[300px] w-full">
              <Table className="w-full min-w-[600px]">
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="min-w-[120px] text-xs sm:text-sm">Employee</TableHead>
                    <TableHead className="min-w-[80px] text-xs sm:text-sm">Goal Type</TableHead>
                    <TableHead className="min-w-[80px] text-xs sm:text-sm">Progress</TableHead>
                    <TableHead className="min-w-[120px] text-xs sm:text-sm">Current / Target</TableHead>
                    <TableHead className="min-w-[80px] text-xs sm:text-sm">Status</TableHead>
                    <TableHead className="min-w-[120px] text-xs sm:text-sm">Period</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="text-xs sm:text-sm truncate max-w-[120px]">
                        {`${assignment.employee?.first_name || ""} ${assignment.employee?.last_name || ""}`.trim()}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">{assignment.goal_type}</TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {assignment.progress !== undefined ? `${assignment.progress}%` : "N/A"}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {assignment.current_value !== undefined && assignment.target_value !== undefined
                          ? `${assignment.current_value} / ${assignment.target_value} ${goal.metric_unit || ""}`
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        <Badge className={getStatusColor(assignment.status || "unknown")}>
                          {assignment.status || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {formatDate(assignment.period_start)} - {formatDate(assignment.period_end)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
          {filteredAssignments.length === 0 && (
            <p className="text-center text-gray-500 mt-4 text-sm sm:text-base">
              No valid assignments found for {goalType || "this goal"}.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Historical Performance Comparison */}
      <Card className="mb-6 w-full">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">
            Historical Performance Comparison {goalType ? `(${goalType})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] sm:h-[300px]">
            <Bar
              data={historicalChartData}
              options={historicalChartOptions}
              aria-label={`Historical performance comparison chart for ${goalType || "all"} goal types`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Historical Instances */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">
            Historical Instances {goalType ? `(${goalType})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filterError ? (
            <p className="text-center text-red-500 mt-4 text-sm sm:text-base">{filterError}</p>
          ) : (
            <div className="overflow-x-auto">
              <ScrollArea className="h-[300px] w-full">
                <Table className="w-full min-w-[600px]">
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow>
                      <TableHead className="min-w-[120px] text-xs sm:text-sm">Employee</TableHead>
                      <TableHead className="min-w-[80px] text-xs sm:text-sm">Goal Type</TableHead>
                      <TableHead className="min-w-[120px] text-xs sm:text-sm">Period</TableHead>
                      <TableHead className="min-w-[80px] text-xs sm:text-sm">Progress</TableHead>
                      <TableHead className="min-w-[120px] text-xs sm:text-sm">Current / Target</TableHead>
                      <TableHead className="min-w-[80px] text-xs sm:text-sm">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {instances.map((instance) => (
                      <TableRow key={instance.id}>
                        <TableCell className="text-xs sm:text-sm truncate max-w-[120px]">
                          {`${instance.employee?.first_name || ""} ${instance.employee?.last_name || ""}`.trim()}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">{instance.assigned_goal?.goal_type || "N/A"}</TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {formatDate(instance.period_start)} - {formatDate(instance.period_end)}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {instance.progress !== undefined ? `${instance.progress}%` : "N/A"}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {instance.current_value !== undefined && instance.target_value !== undefined
                            ? `${instance.current_value} / ${instance.target_value} ${goal.metric_unit || ""}`
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          <Badge className={getStatusColor(instance.status || "unknown")}>
                            {instance.status || "Unknown"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
          {instances.length === 0 && !filterError && (
            <p className="text-center text-gray-500 mt-4 text-sm sm:text-base">
              No historical instances found for {goalType || "this goal"}.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GoalDetailView;