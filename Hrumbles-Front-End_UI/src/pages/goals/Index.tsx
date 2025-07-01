import React, { useState, useEffect } from "react";
import GoalCard from "@/components/goals/common/GoalCard";
import AnimatedCard from "@/components/ui/custom/AnimatedCard";
import { Badge } from "@/components/ui/badge";
import { Calendar, CalendarDays, BarChart3, Target, CheckCircle2, AlertTriangle, Users, Eye } from "lucide-react";
import { getGoalsWithDetails, calculateGoalStatistics } from "@/lib/goalService";
import { GoalType, GoalWithDetails } from "@/types/goal";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import CreateGoalForm from "@/components/goals/goals/CreateGoalForm";
import AssignGoalsForm from "@/components/goals/goals/AssignGoalsForm";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";
import { isSameDay } from "date-fns";
import { useNavigate } from "react-router-dom";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const GoalsIndex = () => {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<GoalWithDetails[]>([]);
  const [sectors, setSectors] = useState<{ name: string; count: number }[]>([]);
  const [selectedSector, setSelectedSector] = useState("all");
  const [selectedTimeframe, setSelectedTimeframe] = useState<"all" | GoalType>("all");
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [createGoalDialogOpen, setCreateGoalDialogOpen] = useState(false);
  const [assignGoalDialogOpen, setAssignGoalDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [createGoalDialogOpen, assignGoalDialogOpen]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const goalsData = await getGoalsWithDetails();
      console.log("Fetched Goals:", goalsData);
      
      const { data: departmentsData, error } = await supabase
        .from('hr_departments')
        .select('id, name')
        .order('name');
      
      if (error) {
        console.error("Error fetching departments:", error);
      } else {
        setDepartments(departmentsData || []);
      }

      const sectorCounts = goalsData.reduce((acc, goal) => {
        acc[goal.sector] = (acc[goal.sector] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const sectorsData = Object.entries(sectorCounts).map(([name, count]) => ({
        name,
        count,
      }));

      setGoals(goalsData);
      setSectors(sectorsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Apply sector filter
  const filteredGoals = goals.filter((goal) => {
    if (selectedSector !== "all") {
      return goal.sector.toLowerCase() === selectedSector.toLowerCase();
    }
    return true;
  });

  console.log("Filtered Goals:", filteredGoals);

  // Apply timeframe filter
  const timeframeFilteredGoals = selectedTimeframe !== "all"
    ? filteredGoals.filter((goal) =>
        goal.assignments?.some((a) => a.goal_type === selectedTimeframe)
      )
    : filteredGoals;

  console.log("Timeframe Filtered Goals:", timeframeFilteredGoals);

  // Calculate stats based on hr_assigned_goals and hr_goal_instances
  const stats = {
    totalAssignments: 0,
    averageProgress: 0,
    completedInstances: 0,
    overdueInstances: 0,
    topDepartment: { name: "N/A", progress: 0 },
  };

  // Total active assignments and average progress
  let totalAssignments = 0;
  let totalProgress = 0;
  const departmentProgress: Record<string, { total: number; count: number }> = {};

  timeframeFilteredGoals.forEach((goal) => {
    const currentAssignments = goal.assignments?.filter((a) => {
      const now = new Date();
      const periodEnd = new Date(a.period_end || now);
      const isActive = isSameDay(periodEnd, now) || periodEnd > now;
      const matchesTimeframe = selectedTimeframe === "all" || a.goal_type === selectedTimeframe;
      console.log(`Assignment ${a.id}: period_end=${a.period_end}, isActive=${isActive}, matchesTimeframe=${matchesTimeframe}`);
      return isActive && matchesTimeframe;
    }) || [];

    console.log(`Goal ${goal.id}: ${currentAssignments.length} active assignments`);

    totalAssignments += currentAssignments.length;
    currentAssignments.forEach((a) => {
      const progress = a.progress || 0;
      totalProgress += progress;

      // Aggregate department progress
      const dept = goal.sector || "Unknown";
      if (!departmentProgress[dept]) {
        departmentProgress[dept] = { total: 0, count: 0 };
      }
      departmentProgress[dept].total += progress;
      departmentProgress[dept].count += 1;
    });

    // Completed and overdue instances
    goal.assignments?.forEach((a) => {
      const instances = a.instances || [];
      stats.completedInstances += instances.filter((i) => i.status === "completed").length;
      stats.overdueInstances += instances.filter((i) => i.status === "overdue").length;
    });
  });

  stats.totalAssignments = totalAssignments;
  stats.averageProgress = totalAssignments > 0 ? Math.round(totalProgress / totalAssignments) : 0;

  console.log("Stats:", stats);

  // Find top performing department
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

  // Chart data for department progress
  const chartData = {
    labels: Object.keys(departmentProgress),
    datasets: [
      {
        label: "Average Progress (%)",
        data: Object.values(departmentProgress).map((data) =>
          data.count > 0 ? Math.round(data.total / data.count) : 0
        ),
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

                {/* New Employee View Button */}
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

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
                  {sectors.length} Sectors
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
            <AnimatedCard
              animation="fade"
              delay={600}
              className="bg-white p-4 sm:p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow col-span-1 sm:col-span-2 lg:col-span-3"
            >
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Department Performance</h3>
              <div className="h-[200px] sm:h-[300px]">
                <Bar
                  data={chartData}
                  options={chartOptions}
                  aria-label="Average progress by department chart"
                />
              </div>
            </AnimatedCard>
          </div>
        )}

        <div className="mb-6 bg-white p-4 sm:p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <h3 className="font-semibold text-lg sm:text-xl text-gray-900 mb-4">Filter Goals</h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm text-gray-500 mb-2">Department</h4>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedSector === "all" ? "default" : "outline"}
                  size="sm"
                  className="flex items-center gap-1 text-sm sm:text-base hover:bg-gray-100"
                  onClick={() => setSelectedSector("all")}
                >
                  <Calendar className="h-4 w-4" />
                  <span>All Departments</span>
                </Button>
                {departments.map((department) => (
                  <Button
                    key={department.id}
                    variant={selectedSector === department.name.toLowerCase() ? "default" : "outline"}
                    size="sm"
                    className="flex items-center gap-1 text-sm sm:text-base hover:bg-gray-100"
                    onClick={() => setSelectedSector(department.name.toLowerCase())}
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>{department.name}</span>
                  </Button>
                ))}
              </div>
            </div>
            {/* <div>
              <h4 className="text-sm text-gray-500 mb-2">Timeframe</h4>
              <div className="flex flex-wrap gap-2">
                {["all", "Daily", "Weekly", "Monthly", "Yearly"].map((timeframe) => (
                  <Button
                    key={timeframe}
                    variant={selectedTimeframe === timeframe ? "default" : "outline"}
                    size="sm"
                    className="flex items-center gap-1 text-sm sm:text-base hover:bg-gray-100"
                    onClick={() => setSelectedTimeframe(timeframe as any)}
                  >
                    {timeframe === "all" ? <Calendar className="h-4 w-4" /> : 
                     timeframe === "Daily" ? <CalendarDays className="h-4 w-4" /> :
                     <Calendar className="h-4 w-4" />}
                    <span>{timeframe === "all" ? "All Timeframes" : timeframe}</span>
                  </Button>
                ))}
              </div>
            </div> */}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-500 text-sm sm:text-base">Loading goals data...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {timeframeFilteredGoals.length === 0 ? (
              <p className="text-center text-gray-500 col-span-full text-sm sm:text-base">
                No goals found for the selected filters.
              </p>
            ) : (
              timeframeFilteredGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onUpdate={fetchData}
                  className="hover:shadow-md transition-shadow"
                />
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default GoalsIndex;