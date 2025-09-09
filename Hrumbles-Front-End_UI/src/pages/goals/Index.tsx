import React, { useState, useEffect, useMemo } from "react";
import GoalCard from "@/components/goals/common/GoalCard";
import AnimatedCard from "@/components/ui/custom/AnimatedCard";
import { Badge } from "@/components/ui/badge";
import { Calendar, BarChart3, Target, CheckCircle2, AlertTriangle, Users, Eye } from "lucide-react";
import { getGoalsWithDetails } from "@/lib/goalService";
import { GoalType, GoalWithDetails } from "@/types/goal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import CreateGoalForm from "@/components/goals/goals/CreateGoalForm";
import AssignGoalsForm from "@/components/goals/goals/AssignGoalsForm";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, isSameDay } from "date-fns";
import { useNavigate } from "react-router-dom";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const GoalsIndex = () => {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<GoalWithDetails[]>([]);
  const [selectedSector, setSelectedSector] = useState<string>("");
  const [selectedTimeframe, setSelectedTimeframe] = useState<"all" | GoalType>("all");
  const [loading, setLoading] = useState(true);
  const [activeDepartments, setActiveDepartments] = useState<{ id: string; name: string }[]>([]);
  const [createGoalDialogOpen, setCreateGoalDialogOpen] = useState(false);
  const [assignGoalDialogOpen, setAssignGoalDialogOpen] = useState(false);
  const [chartTimeframe, setChartTimeframe] = useState<'day' | 'week' | 'month' | 'year'>('week');

  useEffect(() => {
    fetchData();
  }, [createGoalDialogOpen, assignGoalDialogOpen]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const goalsData = await getGoalsWithDetails();
      
      // Fetch only departments with assigned goals
      const assignedSectors = [...new Set(goalsData.map(g => g.sector))];
      const { data: allDepartments, error } = await supabase
        .from('hr_departments')
        .select('id, name')
        .in('name', assignedSectors)
        .order('name');
      
      if (error) console.error("Error fetching departments:", error);
      
      setActiveDepartments(allDepartments || []);
      if (allDepartments && allDepartments.length > 0) {
        setSelectedSector(allDepartments[0].name.toLowerCase());
      }
      setGoals(goalsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter goals for GoalCard components only
  const goalCardFilteredGoals = useMemo(() => {
    return goals.filter(goal => goal.sector.toLowerCase() === selectedSector.toLowerCase());
  }, [goals, selectedSector]);

  // Apply timeframe filter for GoalCard components
  const timeframeFilteredGoals = selectedTimeframe !== "all"
    ? goalCardFilteredGoals.filter((goal) =>
        goal.assignments?.some((a) => a.goal_type === selectedTimeframe)
      )
    : goalCardFilteredGoals;

  // Calculate stats based on all goals (unfiltered by sector)
  const stats = useMemo(() => {
    const stats = {
      totalAssignments: 0,
      averageProgress: 0,
      completedInstances: 0,
      overdueInstances: 0,
      topDepartment: { name: "N/A", progress: 0 },
    };

    let totalAssignments = 0;
    let totalProgress = 0;
    const departmentProgress: Record<string, { total: number; count: number }> = {};

    goals.forEach((goal) => {
      const currentAssignments = goal.assignments?.filter((a) => {
        const now = new Date();
        const periodEnd = new Date(a.period_end || now);
        const isActive = isSameDay(periodEnd, now) || periodEnd > now;
        const matchesTimeframe = selectedTimeframe === "all" || a.goal_type === selectedTimeframe;
        return isActive && matchesTimeframe;
      }) || [];

      totalAssignments += currentAssignments.length;
      currentAssignments.forEach((a) => {
        const progress = a.progress || 0;
        totalProgress += progress;

        const dept = goal.sector || "Unknown";
        if (!departmentProgress[dept]) {
          departmentProgress[dept] = { total: 0, count: 0 };
        }
        departmentProgress[dept].total += progress;
        departmentProgress[dept].count += 1;
      });

      goal.assignments?.forEach((a) => {
        const instances = a.instances || [];
        stats.completedInstances += instances.filter((i) => i.status === "completed").length;
        stats.overdueInstances += instances.filter((i) => i.status === "overdue").length;
      });
    });

    stats.totalAssignments = totalAssignments;
    stats.averageProgress = totalAssignments > 0 ? Math.round(totalProgress / totalAssignments) : 0;

    let maxProgress = 0;
    let topDept = "N/A";
    Object.entries(departmentProgress).forEach(([dept, data]) => {
      const avgProgress = data.count > 0 ? Math.round(data.total / data.count) : 0;
      if (avgProgress > maxProgress) {
        maxProgress = avgProgress;
        topDept = dept;
      }
    });
    stats.topDepartment = { name: topDept, progress: maxProgress };

    return stats;
  }, [goals, selectedTimeframe]);

  // Chart data for department progress (unfiltered by sector)
  const chartData = useMemo(() => {
    const now = new Date();
    let interval: { start: Date; end: Date };

    switch (chartTimeframe) {
      case 'day': interval = { start: startOfDay(now), end: endOfDay(now) }; break;
      case 'week': interval = { start: startOfWeek(now), end: endOfWeek(now) }; break;
      case 'month': interval = { start: startOfMonth(now), end: endOfMonth(now) }; break;
      case 'year': interval = { start: startOfYear(now), end: endOfYear(now) }; break;
    }

    const departmentProgress: Record<string, { total: number; count: number }> = {};

    goals.forEach(goal => {
      goal.assignments?.forEach(assignment => {
        const relevantInstance = assignment.instances?.find(inst => 
          isWithinInterval(new Date(inst.period_start), interval) || 
          isWithinInterval(new Date(inst.period_end), interval)
        );
        
        if (relevantInstance) {
          const dept = goal.sector || "Unknown";
          if (!departmentProgress[dept]) {
            departmentProgress[dept] = { total: 0, count: 0 };
          }
          departmentProgress[dept].total += relevantInstance.progress || 0;
          departmentProgress[dept].count += 1;
        }
      });
    });

    const labels = Object.keys(departmentProgress);
    const data = Object.values(departmentProgress).map(d => d.count > 0 ? Math.round(d.total / d.count) : 0);

    return {
      labels,
      datasets: [{
        label: `Average Progress This ${chartTimeframe}`,
        data,
        backgroundColor: "rgba(79, 70, 229, 0.8)",
        borderRadius: 4,
      }],
    };
  }, [goals, chartTimeframe]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: { font: { size: 12 } },
      },
      title: {
        display: true,
        text: "Average Progress by Department",
        font: { size: 16 },
      },
      tooltip: { bodyFont: { size: 12 } },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: { display: true, text: "Progress (%)", font: { size: 12 } },
        ticks: { font: { size: 10 } },
      },
      x: {
        ticks: {
          font: { size: 10 },
          maxRotation: 45,
          minRotation: 45,
        },
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Goal Management</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Track and manage employee goals across all departments
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Dialog open={createGoalDialogOpen} onOpenChange={setCreateGoalDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 text-sm sm:text-base px-3 sm:px-4 py-1 sm:py-2 hover:bg-gray-100"
                  >
                    <Target className="h-4 w-4" />
                    <span>Create Goal</span>
                  </Button>
                </DialogTrigger>
                <CreateGoalForm onClose={() => setCreateGoalDialogOpen(false)} />
              </Dialog>
              <Dialog open={assignGoalDialogOpen} onOpenChange={setAssignGoalDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="flex items-center gap-2 text-sm sm:text-base px-3 sm:px-4 py-1 sm:py-2 hover:bg-primary-dark"
                  >
                    <Users className="h-4 w-4" />
                    <span>Assign Goals</span>
                  </Button>
                </DialogTrigger>
                <AssignGoalsForm onClose={() => setAssignGoalDialogOpen(false)} />
              </Dialog>
              <Button
                variant="secondary"
                onClick={() => navigate("/goalsview")}
                className="flex items-center gap-2 text-sm sm:text-base px-3 sm:px-4 py-1 sm:py-2"
              >
                <Eye className="h-4 w-4" />
                <span>Employee View</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className=" mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-10">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="p-6">
                <div className="flex items-start">
                  <div className="h-12 w-12 rounded-full bg-gray-100 mr-4"></div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-12" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-10">
            <AnimatedCard
              animation="fade"
              delay={100}
              className="bg-white flex items-start p-4 sm:p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-gray-500 text-xs sm:text-sm">Active Assignments</p>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalAssignments}</h3>
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-100 mt-1">
                  {activeDepartments.length} Sectors
                </Badge>
              </div>
            </AnimatedCard>
            <AnimatedCard
              animation="fade"
              delay={200}
              className="bg-white flex items-start p-4 sm:p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center mr-4">
                <BarChart3 className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-gray-500 text-xs sm:text-sm">Average Progress</p>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{stats.averageProgress}%</h3>
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-100 mt-1">
                  Across {stats.totalAssignments} assignments
                </Badge>
              </div>
            </AnimatedCard>
            <AnimatedCard
              animation="fade"
              delay={300}
              className="bg-white flex items-start p-4 sm:p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mr-4">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-gray-500 text-xs sm:text-sm">Completed Instances</p>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{stats.completedInstances}</h3>
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-100 mt-1">
                  Historical
                </Badge>
              </div>
            </AnimatedCard>
            <AnimatedCard
              animation="fade"
              delay={400}
              className="bg-white flex items-start p-4 sm:p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mr-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-gray-500 text-xs sm:text-sm">Overdue Instances</p>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{stats.overdueInstances}</h3>
                <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-100 mt-1">
                  Historical
                </Badge>
              </div>
            </AnimatedCard>
            <AnimatedCard
              animation="fade"
              delay={500}
              className="bg-white flex items-start p-4 sm:p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mr-4">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-gray-500 text-xs sm:text-sm">Top Department</p>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{stats.topDepartment.name}</h3>
                <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-100 mt-1">
                  {stats.topDepartment.progress}% Progress
                </Badge>
              </div>
            </AnimatedCard>
          </div>
        )}

        {/* Department Chart with Timeframe Filters */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Department Performance</CardTitle>
              <div className="flex items-center gap-2">
                {(['day', 'week', 'month', 'year'] as const).map(tf => (
                  <Button key={tf} size="sm" variant={chartTimeframe === tf ? "default" : "outline"} onClick={() => setChartTimeframe(tf)}>
                    This {tf.charAt(0).toUpperCase() + tf.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {chartData.labels.length > 0 ? (
                <Bar data={chartData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No goal data available for the selected period.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Department Filter for Goal Cards */}
        <Card className="mb-8">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <h4 className="text-sm font-medium text-gray-600">Filter Goals by Department:</h4>
              <div className="flex flex-wrap gap-2">
                {activeDepartments.map((dept) => (
                  <Button
                    key={dept.id}
                    variant={selectedSector === dept.name.toLowerCase() ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSector(dept.name.toLowerCase())}
                  >
                    {dept.name}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goal Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <p>Loading...</p>
          ) : timeframeFilteredGoals.length === 0 ? (
            <p className="text-center text-gray-500 col-span-full">No goals found for the selected department and timeframe.</p>
          ) : (
            timeframeFilteredGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} onUpdate={fetchData} />
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default GoalsIndex;