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
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  LineController,  
  BarController,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, isSameDay } from "date-fns";
import { useNavigate } from "react-router-dom";
import CreateAndAssignGoalWizard from '@/components/goals/wizard/CreateAndAssignGoalWizard';
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, LineController, BarController, PointElement, Title, Tooltip, Legend);

const GoalsIndex = () => {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<GoalWithDetails[]>([]);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardKey, setWizardKey] = useState(0);
  const [selectedTimeframe, setSelectedTimeframe] = useState<"all" | GoalType>("all");
  const [loading, setLoading] = useState(true);
  const [activeDepartments, setActiveDepartments] = useState<{ id: string; name: string }[]>([]);
  const [createGoalDialogOpen, setCreateGoalDialogOpen] = useState(false);
  const [assignGoalDialogOpen, setAssignGoalDialogOpen] = useState(false);
  const [activeTimeframeTab, setActiveTimeframeTab] = useState("This Year");
  const [activeDepartmentTab, setActiveDepartmentTab] = useState("All Departments");
  const [chartTimeframe, setChartTimeframe] = useState<'day' | 'week' | 'month' | 'year'>('year');

  const tabToTimeframe = {
    "This Day": 'day' as const,
    "This Week": 'week' as const,
    "This Month": 'month' as const,
    "This Year": 'year' as const,
  };

  useEffect(() => {
    setChartTimeframe(tabToTimeframe[activeTimeframeTab]);
  }, [activeTimeframeTab]);

  useEffect(() => {
    if (isWizardOpen) {
      setWizardKey(prev => prev + 1);
    }
  }, [isWizardOpen]);

  useEffect(() => {
    fetchData();
  }, [createGoalDialogOpen, assignGoalDialogOpen]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const goalsData = await getGoalsWithDetails();
      
      const assignedSectors = [...new Set(goalsData.map(g => g.sector))];
      const { data: allDepartments, error } = await supabase
        .from('hr_departments')
        .select('id, name')
        .in('name', assignedSectors)
        .order('name');
      
      if (error) console.error("Error fetching departments:", error);
      
      setActiveDepartments(allDepartments || []);
      setActiveDepartmentTab("All Departments");
      setGoals(goalsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectedSector = activeDepartmentTab === "All Departments" ? "all" : activeDepartmentTab;

  const goalCardFilteredGoals = useMemo(() => {
    return selectedSector === "all"
      ? goals
      : goals.filter(goal => goal.sector.toLowerCase() === selectedSector.toLowerCase());
  }, [goals, selectedSector]);

  const timeframeFilteredGoals = selectedTimeframe !== "all"
    ? goalCardFilteredGoals.filter((goal) =>
        goal.assignments?.some((a) => a.goal_type === selectedTimeframe)
      )
    : goalCardFilteredGoals;

  const timeframeStatuses = useMemo(() => [
    { id: "day", name: "This Day" },
    { id: "week", name: "This Week" },
    { id: "month", name: "This Month" },
    { id: "year", name: "This Year" },
  ], []);

  const departmentStatuses = useMemo(() => [
    { id: "all-departments", name: "All Departments" },
    ...activeDepartments.map(dept => ({ id: `dept-${dept.id}`, name: dept.name })),
  ], [activeDepartments]);

  const timeframeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const now = new Date();
    const timeframes = ['day', 'week', 'month', 'year'] as const;

    timeframes.forEach(tf => {
      let start: Date, end: Date;
      switch(tf) {
        case 'day': start = startOfDay(now); end = endOfDay(now); break;
        case 'week': start = startOfWeek(now); end = endOfWeek(now); break;
        case 'month': start = startOfMonth(now); end = endOfMonth(now); break;
        case 'year': start = startOfYear(now); end = endOfYear(now); break;
      }

      let count = 0;
      goals.forEach(goal => {
        const hasData = goal.assignments?.some(a => 
          a.instances?.some(i => {
            const ps = new Date(i.period_start);
            const pe = new Date(i.period_end || i.period_start);
            return pe >= start && ps <= end;
          })
        ) || false;
        if (hasData) count++;
      });
      counts[`This ${tf.charAt(0).toUpperCase() + tf.slice(1)}`] = count;
    });

    return counts;
  }, [goals]);

  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = { "All Departments": goals.length };
    activeDepartments.forEach(dept => {
      counts[dept.name] = goals.filter(g => g.sector === dept.name).length;
    });
    return counts;
  }, [goals, activeDepartments]);

  const getTimeframeCount = (name: string) => timeframeCounts[name] || 0;
  const getDepartmentCount = (name: string) => departmentCounts[name] || 0;

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

  const now = useMemo(() => new Date(), []);
  const interval = useMemo(() => {
    switch (chartTimeframe) {
      case 'day': return { start: startOfDay(now), end: endOfDay(now) };
      case 'week': return { start: startOfWeek(now), end: endOfWeek(now) };
      case 'month': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'year': return { start: startOfYear(now), end: endOfYear(now) };
      default: return { start: startOfWeek(now), end: endOfWeek(now) };
    }
  }, [now, chartTimeframe]);

  const chartData = useMemo(() => {
    const goalStats: Record<string, { progressSum: number; instanceCount: number; targetSum: number; assignmentCount: number }> = {};

    goals.forEach(goal => {
      let progressSum = 0;
      let instanceCount = 0;
      let targetSum = 0;
      let assignmentCount = 0;

      goal.assignments?.forEach(assignment => {
        const relevantInstance = assignment.instances?.find(inst => 
          isWithinInterval(new Date(inst.period_start), interval) || 
          isWithinInterval(new Date(inst.period_end), interval)
        );
        
        if (relevantInstance) {
          progressSum += relevantInstance.progress || 0;
          targetSum += parseFloat(relevantInstance.target_value || "0");
          instanceCount += 1;
          assignmentCount += 1;
        }
      });

      if (instanceCount > 0) {
        goalStats[goal.id] = {
          progressSum,
          instanceCount,
          targetSum,
          assignmentCount,
        };
      }
    });

    const filteredGoals = goals.filter(g => goalStats[g.id]);
    const labels = filteredGoals.map(g => g.name.length > 20 ? `${g.name.substring(0, 20)}...` : g.name);
    const avgProgressData = filteredGoals.map(g => Math.round(goalStats[g.id].progressSum / goalStats[g.id].instanceCount));
    const targetData = filteredGoals.map(g => goalStats[g.id].targetSum);
    const countData = filteredGoals.map(g => goalStats[g.id].assignmentCount);

    return {
      labels,
      datasets: [
        {
          type: 'bar' as const,
          label: `Average Progress This ${chartTimeframe} (%)`,
          data: avgProgressData,
          backgroundColor: (ctx: any) => {
            const chart = ctx.chart;
            const { ctx: chartCtx, chartArea } = chart;
            if (!chartArea) return 'rgba(59, 130, 246, 0.6)';
            const gradient = chartCtx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
            gradient.addColorStop(1, 'rgba(59, 130, 246, 0.2)');
            return gradient;
          },
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
          yAxisID: 'y',
          borderRadius: 4,
        },
        {
          type: 'line' as const,
          label: `Total Target Value This ${chartTimeframe}`,
          data: targetData,
          borderColor: (ctx: any) => {
            const chart = ctx.chart;
            const { ctx: chartCtx, chartArea } = chart;
            if (!chartArea) return 'rgba(99, 102, 241, 1)';
            const gradient = chartCtx.createLinearGradient(0, chartArea.left, 0, chartArea.right);
            gradient.addColorStop(0, 'rgba(99, 102, 241, 1)');
            gradient.addColorStop(1, 'rgba(139, 92, 246, 1)');
            return gradient;
          },
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          yAxisID: 'y1',
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: 'rgba(99, 102, 241, 1)',
        },
      ],
    };
  }, [goals, interval]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: { 
          font: { size: 12 },
          padding: 20,
          usePointStyle: true,
        },
      },
      title: {
        display: true,
        text: "Goal-Wise Performance Comparison",
        font: { size: 16, weight: 'bold' },
        padding: { top: 10, bottom: 20 },
      },
      tooltip: { 
        mode: 'index' as const,
        intersect: false,
        bodyFont: { size: 12 },
        titleFont: { size: 14 },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        beginAtZero: true,
        max: 100,
        title: { 
          display: true, 
          text: "Progress (%)", 
          font: { size: 12, weight: 'bold' },
          color: 'rgba(59, 130, 246, 1)',
        },
        ticks: { 
          font: { size: 10 },
          color: 'rgba(59, 130, 246, 0.7)',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        beginAtZero: true,
        grid: {
          drawOnChartArea: false,
        },
        title: { 
          display: true, 
          text: "Total Target Value", 
          font: { size: 12, weight: 'bold' },
          color: 'rgba(99, 102, 241, 1)',
        },
        ticks: { 
          font: { size: 10 },
          color: 'rgba(99, 102, 241, 0.7)',
        },
      },
      x: {
        ticks: {
          font: { size: 10 },
          maxRotation: 0,
          minRotation: 0,
          color: 'rgba(0, 0, 0, 0.6)',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
    animation: {
      duration: 1200,
      easing: 'easeInOutQuart',
    },
  };

  const periodTypeData = useMemo(() => {
    const typeStats: Record<GoalType, { count: number; totalProgress: number }> = {
      Daily: { count: 0, totalProgress: 0 },
      Weekly: { count: 0, totalProgress: 0 },
      Monthly: { count: 0, totalProgress: 0 },
      Yearly: { count: 0, totalProgress: 0 },
    };

    goals.forEach(goal => {
      goal.assignments?.forEach(a => {
        const type = a.goal_type as GoalType;
        if (type && typeStats[type]) {
          typeStats[type].count += 1;
          typeStats[type].totalProgress += a.progress || 0;
        }
      });
    });

    const labels = ['Daily', 'Weekly', 'Monthly', 'Yearly'];
    const countData = labels.map(label => typeStats[label].count);
    const avgProgressData = labels.map(label => 
      typeStats[label].count > 0 
        ? Math.round(typeStats[label].totalProgress / typeStats[label].count) 
        : 0
    );

    return {
      labels,
      datasets: [
        {
          label: 'Assignments Count',
          data: countData,
          backgroundColor: (ctx: any) => {
            const chart = ctx.chart;
            const { ctx: chartCtx, chartArea } = chart;
            if (!chartArea) return 'rgba(59, 130, 246, 0.6)';
            const gradient = chartCtx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
            gradient.addColorStop(1, 'rgba(59, 130, 246, 0.2)');
            return gradient;
          },
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
          yAxisID: 'y',
          borderRadius: 4,
        },
        {
          type: 'line' as const,
          label: 'Average Progress (%)',
          data: avgProgressData,
          borderColor: 'rgba(34, 197, 94, 1)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          yAxisID: 'y1',
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: 'rgba(34, 197, 94, 1)',
        },
      ],
    };
  }, [goals]);

  const periodTypeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: { 
          font: { size: 11 },
          padding: 15,
          usePointStyle: true,
        },
      },
      title: {
        display: true,
        text: "Performance by Period Type",
        font: { size: 14, weight: 'bold' },
        padding: { top: 10, bottom: 15 },
      },
      tooltip: { 
        mode: 'index' as const,
        intersect: false,
        bodyFont: { size: 11 },
        titleFont: { size: 12 },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        cornerRadius: 6,
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        beginAtZero: true,
        title: { 
          display: true, 
          text: "Assignments Count", 
          font: { size: 11, weight: 'bold' },
          color: 'rgba(59, 130, 246, 1)',
        },
        ticks: { 
          font: { size: 9 },
          color: 'rgba(59, 130, 246, 0.7)',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        beginAtZero: true,
        max: 100,
        grid: {
          drawOnChartArea: false,
        },
        title: { 
          display: true, 
          text: "Avg Progress (%)", 
          font: { size: 11, weight: 'bold' },
          color: 'rgba(34, 197, 94, 1)',
        },
        ticks: { 
          font: { size: 9 },
          color: 'rgba(34, 197, 94, 0.7)',
        },
      },
      x: {
        ticks: {
          font: { size: 10 },
          color: 'rgba(0, 0, 0, 0.6)',
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
    animation: {
      duration: 1000,
      easing: 'easeInOutQuart',
    },
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { pending: 0, 'in-progress': 0, completed: 0, overdue: 0 };
    goals.forEach(goal => {
      goal.assignments?.forEach(a => {
        const s = a.status || 'pending';
        counts[s] = (counts[s] || 0) + 1;
      });
    });
    return counts;
  }, [goals]);

  const pieData = useMemo(() => {
    const labels = Object.keys(statusCounts);
    const data = Object.values(statusCounts);
    const backgroundColors = {
      pending: 'rgba(156, 163, 175, 0.8)',
      'in-progress': 'rgba(59, 130, 246, 0.8)',
      completed: 'rgba(34, 197, 94, 0.8)',
      overdue: 'rgba(239, 68, 68, 0.8)',
    };
    return {
      labels,
      datasets: [{
        data,
        backgroundColor: labels.map(label => backgroundColors[label as keyof typeof backgroundColors]),
        borderWidth: 2,
        borderColor: '#fff',
        hoverOffset: 10,
      }],
    };
  }, [statusCounts]);

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { font: { size: 10 }, padding: 15 },
      },
      title: {
        display: true,
        text: "Assignment Status Distribution",
        font: { size: 14, weight: 'bold' },
      },
    },
    animation: { 
      animateRotate: true,
      duration: 1000,
    },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  return (
    <div className="min-h-screen ">
      <header className="bg-white/90 backdrop-blur-md shadow-lg border-b border-gray-200/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Goal Management Dashboard
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Track, analyze, and optimize employee goals across departments
              </p>
            </motion.div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
                <DialogTrigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-2 text-sm sm:text-base px-4 py-2 bg-purple text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                  >
                    <Target className="h-4 w-4" />
                    <span>New Goal Assignment</span>
                  </motion.button>
                </DialogTrigger>
                <CreateAndAssignGoalWizard 
                  key={wizardKey}
                  onCancel={() => setIsWizardOpen(false)} 
                  onSuccess={() => {
                    setIsWizardOpen(false);
                    fetchData();
                  }} 
                />
              </Dialog>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate("/goalsview")}
                className="flex items-center gap-2 text-sm sm:text-base px-4 py-2 border border-gray-200 hover:bg-gray-50 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl bg-white text-gray-700"
              >
                <Eye className="h-4 w-4" />
                <span>Employee View</span>
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-10"
            key="loading"
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <motion.div
                key={`skeleton-${i}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm p-6"
              >
                <div className="flex items-start">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse mr-4"></div>
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-12" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mb-10"
            key="stats"
          >
            <motion.div variants={itemVariants} className="group">
              <AnimatedCard
                animation="fade"
                delay={100}
                className="flex items-start hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 border border-gray-100/50 transition-all duration-500"
              >
                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div className="space-y-2 flex-1">
                  <p className="text-gray-500 text-sm font-medium">Active Assignments</p>
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">{stats.totalAssignments}</h3>
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 mt-1 animate-pulse">
                    {activeDepartments.length} Sectors
                  </Badge>
                </div>
              </AnimatedCard>
            </motion.div>
            <motion.div variants={itemVariants} className="group">
              <AnimatedCard
                animation="fade"
                delay={200}
                className="flex items-start hover:bg-gradient-to-br hover:from-amber-50 hover:to-orange-50 border border-gray-100/50 transition-all duration-500"
              >
                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div className="space-y-2 flex-1">
                  <p className="text-gray-500 text-sm font-medium">Average Progress</p>
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-amber-600 transition-colors duration-300">{stats.averageProgress}%</h3>
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 mt-1 animate-pulse">
                    Across {stats.totalAssignments} assignments
                  </Badge>
                </div>
              </AnimatedCard>
            </motion.div>
            <motion.div variants={itemVariants} className="group">
              <AnimatedCard
                animation="fade"
                delay={300}
                className="flex items-start hover:bg-gradient-to-br hover:from-green-50 hover:to-emerald-50 border border-gray-100/50 transition-all duration-500"
              >
                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle2 className="h-6 w-6 text-white" />
                </div>
                <div className="space-y-2 flex-1">
                  <p className="text-gray-500 text-sm font-medium">Completed Instances</p>
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-green-600 transition-colors duration-300">{stats.completedInstances}</h3>
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 mt-1 animate-pulse">
                    Historical
                  </Badge>
                </div>
              </AnimatedCard>
            </motion.div>
            <motion.div variants={itemVariants} className="group">
              <AnimatedCard
                animation="fade"
                delay={400}
                className="flex items-start hover:bg-gradient-to-br hover:from-red-50 hover:to-rose-50 border border-gray-100/50 transition-all duration-500"
              >
                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-red-500 to-rose-600 flex items-center justify-center mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <div className="space-y-2 flex-1">
                  <p className="text-gray-500 text-sm font-medium">Overdue Instances</p>
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-red-600 transition-colors duration-300">{stats.overdueInstances}</h3>
                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 mt-1 animate-pulse">
                    Historical
                  </Badge>
                </div>
              </AnimatedCard>
            </motion.div>
            <motion.div variants={itemVariants} className="group">
              <AnimatedCard
                animation="fade"
                delay={500}
                className="flex items-start hover:bg-gradient-to-br hover:from-purple-50 hover:to-violet-50 border border-gray-100/50 transition-all duration-500"
              >
                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-purple-500 to-violet-600 flex items-center justify-center mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div className="space-y-2 flex-1">
                  <p className="text-gray-500 text-sm font-medium">Top Department</p>
                  <h3 className="text-2xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors duration-300">{stats.topDepartment.name}</h3>
                  <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 mt-1 animate-pulse">
                    {stats.topDepartment.progress}% Progress
                  </Badge>
                </div>
              </AnimatedCard>
            </motion.div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card className="mb-8 bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl border border-gray-200/50 overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-xl font-bold text-gray-900">Goal-Wise Performance Overview</CardTitle>
                <div className="flex-shrink-0">
                  <Tabs value={activeTimeframeTab} onValueChange={setActiveTimeframeTab}>
                    <TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner space-x-0.5">
                      {timeframeStatuses.map((status) => {
                        const isActive = activeTimeframeTab === status.name;
                        return (
                          <TabsTrigger
                            key={status.id}
                            value={status.name}
                            className={`relative px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
                              data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all
                              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                                isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-primary"
                              }`}
                          >
                            <span className="relative flex items-center">
                              {status.name}
                              <span
                                className={`ml-2 text-xs rounded-full h-5 w-5 flex items-center justify-center ${
                                  isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                                }`}
                              >
                                {getTimeframeCount(status.name)}
                              </span>
                            </span>
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>
                  </Tabs>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[450px] p-6">
                {chartData.labels.length > 0 ? (
                  <Bar data={chartData} options={chartOptions as any} />
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center h-full text-gray-500"
                  >
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No goal data available for the selected period.</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
        >
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl border border-gray-200/50 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-gray-900">Performance by Period Type</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[300px] p-6">
                <Bar data={periodTypeData} options={periodTypeOptions as any} />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl border border-gray-200/50 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-gray-900">Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[300px] p-6">
                <Doughnut data={pieData} options={pieOptions as any} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="mb-8 bg-white/80 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h4 className="text-sm font-semibold text-gray-700">Filter Goals by Department</h4>
                <div className="flex-shrink-0 order-1">
                  <Tabs value={activeDepartmentTab} onValueChange={setActiveDepartmentTab}>
                    <TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner space-x-0.5">
                      {departmentStatuses.map((status) => {
                        const isActive = activeDepartmentTab === status.name;
                        return (
                          <TabsTrigger
                            key={status.id}
                            value={status.name}
                            className={`relative px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 
                              data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all
                              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                                isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-primary"
                              }`}
                          >
                            <span className="relative flex items-center">
                              {status.name}
                              <span
                                className={`ml-2 text-xs rounded-full h-5 w-5 flex items-center justify-center ${
                                  isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                                }`}
                              >
                                {getDepartmentCount(status.name)}
                              </span>
                            </span>
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>
                  </Tabs>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-gray-500 col-span-full py-12"
            >
              <Skeleton className="h-8 w-48 mx-auto mb-4" />
              <p>Loading goals...</p>
            </motion.div>
          ) : timeframeFilteredGoals.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center text-gray-500 col-span-full py-12"
            >
              No goals found for the selected department and timeframe.
            </motion.div>
          ) : (
            timeframeFilteredGoals.map((goal, index) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.05 }}
                className="group"
              >
                <GoalCard 
                  goal={goal} 
                  onUpdate={fetchData} 
                  className="h-full bg-white/80 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-xl transition-all duration-500 group-hover:bg-gradient-to-br group-hover:from-blue-50 group-hover:to-indigo-50 border border-gray-100/50" 
                />
              </motion.div>
            ))
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default GoalsIndex;