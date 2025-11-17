// src/components/goals/employee/EmployeeGoalDashboard.tsx

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEmployeeGoals } from "@/lib/supabaseData";
import { Employee, GoalWithDetails } from "@/types/goal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, CheckCircle2, AlertTriangle, Users } from "lucide-react";
import EmployeeGoalCard from "./EmployeeGoalCard"; // This will be our new card component
import { Doughnut, Bar } from "react-chartjs-2";
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
import { motion, AnimatePresence } from "framer-motion";
import AnimatedCard from "@/components/ui/custom/AnimatedCard";
import { Badge } from "@/components/ui/badge";
import GoalProgressTable from "../common/GoalProgressTable";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, LineElement, PointElement, LineController, BarController, Title, Tooltip, Legend);

interface EmployeeGoalDashboardProps {
  employee: Employee;
}

const EmployeeGoalDashboard: React.FC<EmployeeGoalDashboardProps> = ({ employee }) => {
  const [chartTimeframe, setChartTimeframe] = useState<'day' | 'week' | 'month' | 'year'>('week');
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

  const statusCounts = useMemo(() => {
    if (!goals) {
      return { pending: 0, 'in-progress': 0, completed: 0, overdue: 0 };
    }
    const counts: Record<string, number> = { pending: 0, 'in-progress': 0, completed: 0, overdue: 0 };
    const allInstances = goals.flatMap(goal => goal.instances || []);
    allInstances.forEach(instance => {
      const s = instance.status || 'pending';
      counts[s] = (counts[s] || 0) + 1;
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

  const periodTypeData = useMemo(() => {
    if (!goals) {
      return { labels: [], datasets: [] };
    }
    const typeStats: Record<string, { count: number; totalProgress: number }> = {
      Daily: { count: 0, totalProgress: 0 },
      Weekly: { count: 0, totalProgress: 0 },
      Monthly: { count: 0, totalProgress: 0 },
      Yearly: { count: 0, totalProgress: 0 },
    };

    goals.forEach(goal => {
      goal.assignments?.forEach(a => {
        let type = a.goalType as string;
        // Normalize type to title case to handle potential case mismatches
        if (type) {
          type = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
        }
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
          <p className="text-gray-500 mt-2">This employee doesn't have any goals assigned yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <motion.div variants={itemVariants} className="group">
          <AnimatedCard
            animation="fade"
            delay={100}
            className="flex flex-col items-center text-center hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 border border-gray-100/50 transition-all duration-500"
          >
            <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">{stats.totalGoals}</h3>
            <p className="text-gray-500 text-sm font-medium mt-1">Total Goal Instances</p>
          </AnimatedCard>
        </motion.div>
        <motion.div variants={itemVariants} className="group">
          <AnimatedCard
            animation="fade"
            delay={200}
            className="flex flex-col items-center text-center hover:bg-gradient-to-br hover:from-green-50 hover:to-emerald-50 border border-gray-100/50 transition-all duration-500"
          >
            <div className="h-12 w-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <CheckCircle2 className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 group-hover:text-green-600 transition-colors duration-300">{stats.completedGoals}</h3>
            <p className="text-gray-500 text-sm font-medium mt-1">Completed</p>
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 mt-1 animate-pulse">
              {stats.completionRate}% Rate
            </Badge>
          </AnimatedCard>
        </motion.div>
        <motion.div variants={itemVariants} className="group">
          <AnimatedCard
            animation="fade"
            delay={300}
            className="flex flex-col items-center text-center hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 border border-gray-100/50 transition-all duration-500"
          >
            <div className="h-12 w-12 rounded-full bg-gradient-to-r from-indigo-500 to-blue-600 flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors duration-300">{stats.inProgressGoals}</h3>
            <p className="text-gray-500 text-sm font-medium mt-1">In Progress</p>
          </AnimatedCard>
        </motion.div>
        <motion.div variants={itemVariants} className="group">
          <AnimatedCard
            animation="fade"
            delay={400}
            className="flex flex-col items-center text-center hover:bg-gradient-to-br hover:from-red-50 hover:to-rose-50 border border-gray-100/50 transition-all duration-500"
          >
            <div className="h-12 w-12 rounded-full bg-gradient-to-r from-red-500 to-rose-600 flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 group-hover:text-red-600 transition-colors duration-300">{stats.overdueGoals}</h3>
            <p className="text-gray-500 text-sm font-medium mt-1">Overdue</p>
          </AnimatedCard>
        </motion.div>
      </motion.div>

      {/* Charts Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
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

      {/* Goal Performance Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <Card className="bg-white/80 backdrop-blur-sm shadow-xl rounded-2xl border border-gray-200/50 overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-gray-900">Goal Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <GoalProgressTable employee={employee} goalStats={stats} />
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Main Goal Cards Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg rounded-xl border border-gray-200/50">
          <CardHeader>
            <CardTitle>My Goals</CardTitle>
            <CardDescription>Select a goal type within each card to view and update progress for the current period.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {goals.map((goal, index) => (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.6, delay: index * 0.05 }}
                    className="group"
                  >
                    <EmployeeGoalCard
                      goal={goal}
                      employee={employee}
                      onUpdate={refetch}
                      className="h-full bg-white/80 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-xl transition-all duration-500 group-hover:bg-gradient-to-br group-hover:from-blue-50 group-hover:to-indigo-50 border border-gray-100/50" 
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {goals.length === 0 && (
              <div className="text-center py-10">
                <p className="text-gray-500">No goals found.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default EmployeeGoalDashboard;