import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { PeriodwiseDatePicker } from "@/components/ui/custom/PeriodwiseDatePicker";
import { Loader2, Target, Users, CalendarClock, TrendingUp, CheckCircle2, Clock, TrendingDown, AlertCircle, Award, Zap, ArrowUp, ArrowDown, Minus, BarChart3 } from "lucide-react";
import { startOfMonth, endOfMonth, isSameDay, format, addDays, startOfWeek, endOfWeek, startOfYear, endOfYear, subMonths, subWeeks, subYears, subDays, differenceInDays } from "date-fns";

interface OrgGoalDashboardChartProps {
  organizationId: string;
}

interface AnalyticsData {
  entity_name: string;
  target_total: number;
  current_total: number;
  avg_progress: number;
}

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface PerformanceDetail {
  name: string;
  progress: number;
  status: string;
  target: number;
  achieved: number;
  goal_type?: string;
}

interface PerformanceBreakdown {
  entity_name: string;
  details: PerformanceDetail[];
}

interface EnhancedMetrics {
  entity_name: string;
  current_progress: number;
  previous_progress: number;
  progress_change: number;
  completed_count: number;
  in_progress_count: number;
  overdue_count: number;
  not_started_count: number;
  top_goal_type: string;
  top_goal_contribution: number;
  forecast_completion: number;
  vs_team_average: number;
  total_goals: number;
  completion_rate: number;
}

export const OrgGoalDashboardChart: React.FC<OrgGoalDashboardChartProps> = ({ organizationId }) => {
  const [data, setData] = useState<AnalyticsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [performanceBreakdown, setPerformanceBreakdown] = useState<PerformanceBreakdown[]>([]);
  const [previousPeriodData, setPreviousPeriodData] = useState<AnalyticsData[]>([]);
  const [employeeList, setEmployeeList] = useState<{ id: string; name: string }[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [teamAverage, setTeamAverage] = useState<number>(0);
  const [enhancedMetrics, setEnhancedMetrics] = useState<EnhancedMetrics[]>([]);
  
  // View Mode: 'goal' vs 'employee'
  const [viewMode, setViewMode] = useState<string>("goal");

  // Goal Type Filter: 'All', 'Daily', 'Weekly', 'Monthly', 'Yearly'
  const [goalType, setGoalType] = useState<string>("All");
  
  const [dateRange, setDateRange] = useState<DateRange | null>({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
  });

  const pickerMode = goalType === 'All' ? 'daily' : (goalType.toLowerCase() as any);

  const computeStartIso = (date: Date | null): string | null => {
    if (!date) return null;
    return `${format(date, 'yyyy-MM-dd')}T00:00:00.000Z`;
  };

  const computeEndIso = (start: Date | null, end: Date | null): string | null => {
    if (!start) return null;
    let endDate = end ? new Date(end) : new Date(start);
    const nextDay = addDays(endDate, 1);
    return `${format(nextDay, 'yyyy-MM-dd')}T00:00:00.000Z`;
  };

  const getPreviousPeriodRange = (startDate: Date | null, endDate: Date | null): DateRange | null => {
    if (!startDate || !endDate) return null;
    
    const daysDiff = differenceInDays(endDate, startDate) + 1;
    
    switch (goalType) {
      case 'Daily':
        return {
          startDate: subDays(startDate, 1),
          endDate: subDays(endDate, 1)
        };
      case 'Weekly':
        return {
          startDate: subWeeks(startDate, 1),
          endDate: subWeeks(endDate, 1)
        };
      case 'Monthly':
        return {
          startDate: subMonths(startDate, 1),
          endDate: subMonths(endDate, 1)
        };
      case 'Yearly':
        return {
          startDate: subYears(startDate, 1),
          endDate: subYears(endDate, 1)
        };
      default:
        // For 'All', subtract the same number of days
        return {
          startDate: subDays(startDate, daysDiff),
          endDate: subDays(endDate, daysDiff)
        };
    }
  };

  // Auto-update date range when goal type filter changes
  useEffect(() => {
    const now = new Date();
    let newDateRange: DateRange | null = null;

    switch (goalType) {
      case 'Daily':
        newDateRange = {
          startDate: now,
          endDate: now
        };
        break;
      case 'Weekly':
        newDateRange = {
          startDate: startOfWeek(now),
          endDate: endOfWeek(now)
        };
        break;
      case 'Monthly':
        newDateRange = {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now)
        };
        break;
      case 'Yearly':
        newDateRange = {
          startDate: startOfYear(now),
          endDate: endOfYear(now)
        };
        break;
      case 'All':
      default:
        newDateRange = {
          startDate: startOfMonth(now),
          endDate: endOfMonth(now)
        };
        break;
    }

    setDateRange(newDateRange);
  }, [goalType]);

  // Reset selected employee when switching view modes
  useEffect(() => {
    setSelectedEmployee("all");
  }, [viewMode]);

  useEffect(() => {
    const fetchData = async () => {
      if (!organizationId || !dateRange?.startDate) return;

      try {
        setIsLoading(true);
        
        const searchStartDate = computeStartIso(dateRange.startDate);
        let searchEndDate: string | null;
        if (!dateRange.endDate || isSameDay(dateRange.startDate, dateRange.endDate)) {
          searchEndDate = computeEndIso(dateRange.startDate, dateRange.startDate);
        } else {
          searchEndDate = computeEndIso(dateRange.startDate, dateRange.endDate);
        }

        if (!searchStartDate || !searchEndDate) return;
        
        // Fetch current period data
        const groupByType = (viewMode === 'employee' && selectedEmployee !== 'all') ? 'goal' : viewMode;
        
        const { data: rpcData, error } = await supabase.rpc('get_org_goal_analytics', {
          org_id: organizationId,
          search_start_date: searchStartDate,
          search_end_date: searchEndDate,
          group_by_type: groupByType,
          filter_goal_type: goalType
        });

        if (error) throw error;
        
        // Filter data by selected employee if needed
        let filteredData = rpcData || [];
        if (viewMode === 'employee' && selectedEmployee !== 'all') {
          const { data: empGoalsData, error: empError } = await supabase
            .from('hr_goal_instances')
            .select(`
              hr_assigned_goals!inner(
                employee_id,
                hr_goals(name)
              )
            `)
            .eq('hr_assigned_goals.employee_id', selectedEmployee)
            .gte('period_start', searchStartDate)
            .lte('period_end', searchEndDate);
          
          if (!empError && empGoalsData) {
            const employeeGoalNames = new Set(
              empGoalsData
                .map(inst => inst.hr_assigned_goals?.hr_goals?.name)
                .filter(Boolean)
            );
            filteredData = filteredData.filter(d => employeeGoalNames.has(d.entity_name));
          }
        }
        
        setData(filteredData);

        // Calculate team average
        if (filteredData.length > 0) {
          const avgProgress = filteredData.reduce((sum, item) => sum + item.avg_progress, 0) / filteredData.length;
          setTeamAverage(avgProgress);
        }

        // Fetch previous period data for comparison
        const previousRange = getPreviousPeriodRange(dateRange.startDate, dateRange.endDate);
        if (previousRange?.startDate && previousRange?.endDate) {
          const prevStartDate = computeStartIso(previousRange.startDate);
          const prevEndDate = computeEndIso(previousRange.startDate, previousRange.endDate);
          
          if (prevStartDate && prevEndDate) {
            const { data: prevRpcData, error: prevError } = await supabase.rpc('get_org_goal_analytics', {
              org_id: organizationId,
              search_start_date: prevStartDate,
              search_end_date: prevEndDate,
              group_by_type: groupByType,
              filter_goal_type: goalType
            });

            if (!prevError) {
              setPreviousPeriodData(prevRpcData || []);
            }
          }
        }

        // Fetch list of employees if in employee view
        if (viewMode === 'employee') {
          const { data: employeesData, error: empError } = await supabase
            .from('hr_employees')
            .select('id, first_name, last_name')
            .eq('organization_id', organizationId)
            .order('first_name');

          if (!empError && employeesData) {
            const empList = employeesData.map(emp => ({
              id: emp.id,
              name: `${emp.first_name} ${emp.last_name}`
            }));
            setEmployeeList(empList);
          }
        }

        // Fetch detailed breakdown data
        const { data: detailsData, error: detailsError } = await supabase
          .from('hr_goal_instances')
          .select(`
            id,
            progress,
            status,
            current_value,
            target_value,
            period_start,
            period_end,
            hr_assigned_goals!inner(
              id,
              employee_id,
              goal_type,
              hr_employees!inner(
                id,
                first_name,
                last_name
              ),
              hr_goals!inner(
                id,
                name,
                sector
              )
            )
          `)
          .gte('period_start', searchStartDate)
          .lte('period_end', searchEndDate);

        if (detailsError) throw detailsError;

        // Process breakdown data with goal types
        const breakdownMap = new Map<string, PerformanceDetail[]>();
        const metricsMap = new Map<string, {
          completed: number;
          in_progress: number;
          overdue: number;
          not_started: number;
          goal_type_contributions: Map<string, number>;
          total_achieved: number;
          total_target: number;
        }>();

        detailsData?.forEach((instance: any) => {
          const assignment = instance.hr_assigned_goals;
          if (!assignment) return;

          const employee = assignment.hr_employees;
          const goal = assignment.hr_goals;
          
          if (!employee || !goal) return;

          // Filter by goal type if needed
          if (goalType !== 'All' && assignment.goal_type !== goalType) return;

          const employeeName = `${employee.first_name} ${employee.last_name}`;
          const goalName = goal.name;

          // Filter by selected employee in employee view
          if (viewMode === 'employee' && selectedEmployee !== 'all') {
            if (employee.id !== selectedEmployee) return;
          }

          let key: string;
          let detailName: string;

          if (viewMode === 'goal') {
            key = goalName;
            detailName = employeeName;
          } else {
            if (selectedEmployee !== 'all') {
              key = employeeName;
              detailName = goalName;
            } else {
              key = employeeName;
              detailName = goalName;
            }
          }

          // Initialize metrics tracking
          if (!metricsMap.has(key)) {
            metricsMap.set(key, {
              completed: 0,
              in_progress: 0,
              overdue: 0,
              not_started: 0,
              goal_type_contributions: new Map(),
              total_achieved: 0,
              total_target: 0
            });
          }

          const metrics = metricsMap.get(key)!;
          const currentValue = parseFloat(instance.current_value || '0');
          const targetValue = parseFloat(instance.target_value || '0');
          
          // Update status counts
          if (instance.status === 'completed') {
            metrics.completed++;
          } else if (instance.status === 'in_progress') {
            metrics.in_progress++;
          } else if (instance.status === 'overdue') {
            metrics.overdue++;
          } else {
            metrics.not_started++;
          }

          // Track goal type contributions
          const currentContribution = metrics.goal_type_contributions.get(assignment.goal_type) || 0;
          metrics.goal_type_contributions.set(
            assignment.goal_type,
            currentContribution + currentValue
          );

          metrics.total_achieved += currentValue;
          metrics.total_target += targetValue;

          // Add to breakdown
          if (!breakdownMap.has(key)) {
            breakdownMap.set(key, []);
          }

          const existing = breakdownMap.get(key)!.find(d => d.name === detailName);
          if (!existing) {
            breakdownMap.get(key)!.push({
              name: detailName,
              progress: instance.progress || 0,
              status: instance.status || 'pending',
              target: targetValue,
              achieved: currentValue,
              goal_type: assignment.goal_type
            });
          }
        });

        // Calculate enhanced metrics
        const enhancedMetricsArray: EnhancedMetrics[] = Array.from(breakdownMap.entries()).map(([entity_name, details]) => {
          const currentData = filteredData.find(d => d.entity_name === entity_name);
          const previousData = previousPeriodData.find(d => d.entity_name === entity_name);
          const metrics = metricsMap.get(entity_name);

          const current_progress = currentData?.avg_progress || 0;
          const previous_progress = previousData?.avg_progress || 0;
          const progress_change = current_progress - previous_progress;

          // Find top goal type by contribution
          let top_goal_type = 'N/A';
          let top_goal_contribution = 0;
          if (metrics) {
            let maxContribution = 0;
            metrics.goal_type_contributions.forEach((contribution, goalType) => {
              if (contribution > maxContribution) {
                maxContribution = contribution;
                top_goal_type = goalType;
                top_goal_contribution = contribution;
              }
            });
          }

          // Calculate forecast
          const days_passed = differenceInDays(new Date(), dateRange.startDate!) + 1;
          const total_days = differenceInDays(dateRange.endDate!, dateRange.startDate!) + 1;
          const expected_progress = (days_passed / total_days) * 100;
          const forecast_completion = current_progress > 0 ? 
            Math.min((current_progress / expected_progress) * 100, 200) : 0;

          // Calculate total instances (not unique goals)
          const total_instances = (metrics?.completed || 0) + 
                                  (metrics?.in_progress || 0) + 
                                  (metrics?.overdue || 0) + 
                                  (metrics?.not_started || 0);
          
          const completion_rate = total_instances > 0 ? 
            (metrics?.completed || 0) / total_instances * 100 : 0;

          return {
            entity_name,
            current_progress,
            previous_progress,
            progress_change,
            completed_count: metrics?.completed || 0,
            in_progress_count: metrics?.in_progress || 0,
            overdue_count: metrics?.overdue || 0,
            not_started_count: metrics?.not_started || 0,
            top_goal_type,
            top_goal_contribution,
            forecast_completion,
            vs_team_average: current_progress - teamAverage,
            total_goals: total_instances,
            completion_rate
          };
        });

        setEnhancedMetrics(enhancedMetricsArray.sort((a, b) => b.current_progress - a.current_progress).slice(0, 10));

        // Convert breakdown to array and take top 10
        const breakdownArray: PerformanceBreakdown[] = Array.from(breakdownMap.entries())
          .map(([entity_name, details]) => ({
            entity_name,
            details: details.sort((a, b) => b.progress - a.progress)
          }))
          .sort((a, b) => {
            const totalA = a.details.reduce((sum, d) => sum + d.achieved, 0);
            const totalB = b.details.reduce((sum, d) => sum + d.achieved, 0);
            return totalB - totalA;
          })
          .slice(0, 10);

        setPerformanceBreakdown(breakdownArray);
        
      } catch (error) {
        console.error("Error fetching org goal analytics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [organizationId, dateRange, viewMode, goalType, selectedEmployee]);

  // Sort and Top 10 Logic
  const topResults = useMemo(() => {
    if (!data.length) return [];
    
    let filteredData = [...data];
    
    if (viewMode === 'employee' && selectedEmployee !== 'all') {
      const selectedEmp = employeeList.find(e => e.id === selectedEmployee);
      if (selectedEmp) {
        filteredData = filteredData.filter(item => item.entity_name === selectedEmp.name);
      }
    }
    
    return filteredData
      .sort((a, b) => b.target_total - a.target_total)
      .slice(0, 10);
  }, [data, viewMode, selectedEmployee, employeeList]);

  // Normalize bar heights
  const maxTarget = useMemo(() => {
    if (viewMode === 'employee' && selectedEmployee !== 'all') {
      const employeeData = performanceBreakdown.find(pb => {
        const emp = employeeList.find(e => e.id === selectedEmployee);
        return emp && pb.entity_name === emp.name;
      });
      if (employeeData && employeeData.details.length) {
        return Math.max(...employeeData.details.map(d => d.target), 1);
      }
    }
    return Math.max(...topResults.map(item => item.target_total), 1);
  }, [topResults, viewMode, selectedEmployee, employeeList, performanceBreakdown]);

  // Transform for chart
  const chartData = useMemo(() => {
    if (viewMode === 'employee' && selectedEmployee !== 'all') {
      const employeeData = performanceBreakdown.find(pb => {
        const emp = employeeList.find(e => e.id === selectedEmployee);
        return emp && pb.entity_name === emp.name;
      });
      
      if (!employeeData || !employeeData.details.length) return [];
      
      const maxGoalTarget = Math.max(...employeeData.details.map(d => d.target), 1);
      
      return employeeData.details.map(detail => {
        const progressRatio = detail.target > 0 ? detail.achieved / detail.target : 0;
        const achievedScaled = progressRatio * maxGoalTarget;
        const remainingScaled = maxGoalTarget - achievedScaled;
        return {
          entity_name: detail.name,
          achieved: achievedScaled,
          remaining: remainingScaled,
          actual_achieved: detail.achieved,
          actual_target: detail.target,
          progress: detail.progress
        };
      });
    }
    
    return topResults.map(item => {
      const progressRatio = item.target_total > 0 ? item.current_total / item.target_total : 0;
      const achievedScaled = progressRatio * maxTarget;
      const remainingScaled = maxTarget - achievedScaled;
      return {
        entity_name: item.entity_name,
        achieved: achievedScaled,
        remaining: remainingScaled,
        actual_achieved: item.current_total,
        actual_target: item.target_total,
        progress: item.avg_progress
      };
    });
  }, [topResults, maxTarget, viewMode, selectedEmployee, employeeList, performanceBreakdown]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 rounded shadow-lg border">
          <p className="font-bold">{data.entity_name}</p>
          <p>Achieved: {data.actual_achieved}</p>
          <p>Target: {data.actual_target}</p>
          <p>Progress: {data.progress.toFixed(0)}%</p>
        </div>
      );
    }
    return null;
  };

  const getAchievedGradient = (progress: number) => progress >= 100 ? "url(#achievedGreenGradient)" : "url(#achievedYellowGradient)";

  const getTrendIcon = (change: number) => {
    if (change > 5) return <ArrowUp className="w-4 h-4 text-green-600" />;
    if (change < -5) return <ArrowDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = (change: number) => {
    if (change > 5) return 'text-green-600 bg-green-50';
    if (change < -5) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  return (
    <Card className="shadow-2xl bg-white/70 backdrop-blur-xl border border-white/20 hover:shadow-3xl transition-all duration-300 rounded-xl h-[450px] flex flex-col">
      <CardContent className="pt-6 flex flex-col h-full">
        {/* Header Section */}
        <div className="flex flex-col gap-4 mb-4">
          {/* Top Row: Title (Left), View Mode Tabs (Center), Period Filters + Date (Right) */}
          <div className="flex items-center justify-between gap-4">
            {/* Left: Title */}
            <h3 className="text-lg font-bold text-gray-800 flex items-center flex-shrink-0">
              <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-emerald-500 rounded-full mr-3"></div>
              Goal Performance
              <span className="text-xs font-normal text-gray-500 ml-2 hidden lg:inline">
                {viewMode === 'employee' && selectedEmployee !== 'all' 
                  ? `(${employeeList.find(e => e.id === selectedEmployee)?.name}${"'"}s Goals)`
                  : `(Top 10 ${viewMode === 'goal' ? 'Goals' : 'Employees'})`
                }
              </span>
            </h3>

            {/* Center: View Mode Tabs */}
            <div className="flex-shrink-0 hidden md:block">
              <Tabs value={viewMode} onValueChange={setViewMode}>
                <TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner space-x-0.5">
                  <TabsTrigger 
                    value="goal" 
                    className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all flex items-center gap-2"
                  >
                    <Target className="w-4 h-4" /> By Goal
                  </TabsTrigger>
                  <TabsTrigger 
                    value="employee" 
                    className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all flex items-center gap-2"
                  >
                    <Users className="w-4 h-4" /> By Employee
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            {/* Right: Period Filters + Date Picker */}
            <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
              {/* Period Filter Tabs */}
              <Tabs value={goalType} onValueChange={setGoalType}>
                <TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner space-x-0.5">
                  <TabsTrigger 
                    value="All" 
                    className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                  >
                    All
                  </TabsTrigger>
                  <TabsTrigger 
                    value="Daily" 
                    className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                  >
                    Daily
                  </TabsTrigger>
                  <TabsTrigger 
                    value="Weekly" 
                    className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                  >
                    Weekly
                  </TabsTrigger>
                  <TabsTrigger 
                    value="Monthly" 
                    className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                  >
                    Monthly
                  </TabsTrigger>
                  <TabsTrigger 
                    value="Yearly" 
                    className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                  >
                    Yearly
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Date Picker */}
              <PeriodwiseDatePicker
                value={dateRange}
                onChange={setDateRange}
                onApply={() => {}}
                monthsView={2}
                mode={pickerMode}
              />
            </div>
          </div>

          {/* Mobile View Mode Tabs */}
          <div className="md:hidden">
            <Tabs value={viewMode} onValueChange={setViewMode} className="w-full">
              <TabsList className="inline-flex w-full items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner space-x-0.5">
                <TabsTrigger 
                  value="goal" 
                  className="flex-1 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all flex items-center justify-center gap-1"
                >
                  <Target className="w-3 h-3" /> By Goal
                </TabsTrigger>
                <TabsTrigger 
                  value="employee" 
                  className="flex-1 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all flex items-center justify-center gap-1"
                >
                  <Users className="w-3 h-3" /> By Employee
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Mobile/Tablet Filters Row */}
          <div className="lg:hidden flex flex-col sm:flex-row items-center gap-3">
            {/* Period Filter Tabs */}
            <Tabs value={goalType} onValueChange={setGoalType} className="w-full sm:w-auto overflow-x-auto no-scrollbar">
              <TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner space-x-0.5">
                <TabsTrigger 
                  value="All" 
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                >
                  All
                </TabsTrigger>
                <TabsTrigger 
                  value="Daily" 
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                >
                  Daily
                </TabsTrigger>
                <TabsTrigger 
                  value="Weekly" 
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                >
                  Weekly
                </TabsTrigger>
                <TabsTrigger 
                  value="Monthly" 
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                >
                  Monthly
                </TabsTrigger>
                <TabsTrigger 
                  value="Yearly" 
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                >
                  Yearly
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Date Picker */}
            <PeriodwiseDatePicker
              value={dateRange}
              onChange={setDateRange}
              onApply={() => {}}
              monthsView={1}
              mode={pickerMode}
            />
          </div>
          
          {/* Employee Selector Row */}
          {viewMode === 'employee' && employeeList.length > 0 && (
            <div className="flex items-center justify-end">
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-full sm:w-[280px] bg-white border-gray-200 rounded-full text-sm font-medium shadow-sm">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all" className="text-sm font-medium">
                    All Employees
                  </SelectItem>
                  {employeeList.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id} className="text-sm">
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        {/* Main Content */}
        <div className="flex-1 flex min-h-0 gap-4">
          {isLoading ? (
            <div className="flex h-full w-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : chartData.length > 0 ? (
            <>
              {/* Chart Section (75%) */}
              <div className="flex-[3] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart 
                    data={chartData} 
                    margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
                    style={{ backgroundColor: '#FDFEFE', borderRadius: '12px' }}
                  >
                    <defs>
                      <path id="oceanWave"
                            d="M0 20 Q 25 10 50 20 T 100 20 V 50 H 0 Z">
                        <animateTransform
                          attributeName="transform"
                          type="translate"
                          from="-50 0"
                          to="50 0"
                          dur="2.5s"
                          repeatCount="indefinite"
                        />
                      </path>

                      <linearGradient id="achievedYellowGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#fbbf24" />
                        <stop offset="35%"  stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#d97706" />
                      </linearGradient>

                      <linearGradient id="achievedGreenGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="#34d399" />
                        <stop offset="35%"  stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>

                      <linearGradient id="targetMainGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"   stopColor="rgba(80,80,80,0.65)" />
                        <stop offset="35%"  stopColor="rgba(80,80,80,0.45)" />
                        <stop offset="100%" stopColor="rgba(80,80,80,0.30)" />
                      </linearGradient>
                    </defs>

                    <CartesianGrid 
                      strokeDasharray="4 4" 
                      stroke="#e5e7eb" 
                      strokeOpacity={0.4} 
                      vertical={false} 
                    />
                    
                    <XAxis 
                      dataKey="entity_name" 
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                      interval={0}
                      tickFormatter={(value) => value.length > 12 ? `${value.substring(0, 10)}...` : value}
                      padding={{ left: 20, right: 20 }}
                    />
                    
                    <YAxis 
                      type="number"
                      domain={[0, maxTarget]}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      dx={-10}
                    />
                    
                    <Tooltip content={<CustomTooltip />} 
                      cursor={{ fill: 'rgba(0, 0, 0, 0)', stroke: "none" }} 
                      contentStyle={{ 
                        backgroundColor: "rgba(255, 255, 255, 0.97)", 
                        backdropFilter: "blur(12px)", 
                        border: "1px solid rgba(0,0,0,0.05)", 
                        borderRadius: "12px", 
                        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
                        fontSize: '12px' 
                      }} 
                    />
                    
                    <Legend 
                      verticalAlign="top" 
                      height={36} 
                      wrapperStyle={{ fontSize: "12px", color: "#4b5563", paddingBottom: "5px" }} 
                      iconType="rect" 
                    />

                    <Bar
                      dataKey="achieved"
                      stackId="a"
                      fill="#f59e0b" 
                      radius={[0, 0, 0, 0]}
                      maxBarSize={50}
                      shape={(props) => {
                        const { x, y, width, height, payload, index } = props;
                        const gradientId = getAchievedGradient(payload.progress);
                        const clipId = `clipWave-${index}`;

                        return (
                          <g>
                            <rect
                              x={x}
                              y={y}
                              width={width}
                              height={height}
                              fill={gradientId}
                              rx={0}
                              ry={0}
                            />
                            <clipPath id={clipId}>
                              <rect
                                x={x}
                                y={y}
                                width={width}
                                height={height}
                              />
                            </clipPath>
                            <use
                              href="#oceanWave"
                              x={x}
                              y={y - 20}
                              clipPath={`url(#${clipId})`}
                              width={width}
                              fill={gradientId}
                              opacity={0.3}
                            />
                          </g>
                        );
                      }}
                    >
                      <LabelList
                        dataKey="progress"
                        position="top"
                        formatter={(value) => `${value.toFixed(0)}%`}
                        fill="#1f2937"
                        fontSize={11}
                        fontWeight="bold"
                      />
                    </Bar>

                    <Bar
                      dataKey="remaining"
                      stackId="a"
                      fill="url(#targetMainGradient)"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={50}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Enhanced Performance Overview Panel (25%) */}
              <div className="flex-1 min-w-[280px] border-l border-gray-200 pl-6 flex flex-col">
                <div className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-600" /> 
                  Performance Insights
                </div>
                
                {enhancedMetrics.length > 0 ? (
                  <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                    {enhancedMetrics.map((metric, idx) => (
                      <div key={idx} className="bg-gradient-to-br from-white to-purple-50/30 rounded-2xl border border-purple-100 p-4 hover:shadow-lg transition-all duration-300">
                        {/* Entity Header with Progress */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-gray-800 truncate mb-1">
                              {metric.entity_name}
                            </h4>
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col">
                                <span className="text-xs text-gray-500 uppercase font-medium">Current Period</span>
                                <span className="text-2xl font-black text-purple-600">
                                  {metric.current_progress.toFixed(0)}%
                                </span>
                              </div>
                              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${getTrendColor(metric.progress_change)}`}>
                                {getTrendIcon(metric.progress_change)}
                                {Math.abs(metric.progress_change).toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Goal Status Breakdown */}
                        <div className="grid grid-cols-2 gap-2 mb-3 pb-3 border-b border-purple-100">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] text-gray-500 uppercase">Completed</div>
                              <div className="text-sm font-bold text-gray-800">{metric.completed_count}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] text-gray-500 uppercase">In Progress</div>
                              <div className="text-sm font-bold text-gray-800">{metric.in_progress_count}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] text-gray-500 uppercase">Overdue</div>
                              <div className="text-sm font-bold text-gray-800">{metric.overdue_count}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] text-gray-500 uppercase">Not Started</div>
                              <div className="text-sm font-bold text-gray-800">{metric.not_started_count}</div>
                            </div>
                          </div>
                        </div>

                        {/* Key Metrics Grid */}
                        <div className="space-y-2">
                          {/* Value-Based Progress (what the chart shows) */}
                          <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg px-3 py-2 border border-purple-200">
                            <div className="flex items-center gap-2">
                              <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
                              <span className="text-[10px] text-purple-800 font-bold uppercase">Value Progress</span>
                            </div>
                            <span className="text-sm font-black text-purple-600">
                              {metric.current_progress.toFixed(0)}%
                            </span>
                          </div>

                          {/* Top Contribution */}
                          <div className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Award className="w-3.5 h-3.5 text-purple-500" />
                              <span className="text-[10px] text-gray-600 font-medium">Top Focus</span>
                            </div>
                            <span className="text-xs font-bold text-purple-600 capitalize">
                              {metric.top_goal_type}
                            </span>
                          </div>

                          {/* Forecast */}
                          <div className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-[10px] text-gray-600 font-medium">On-Track</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className={`text-xs font-bold ${
                                metric.forecast_completion >= 100 ? 'text-green-600' : 
                                metric.forecast_completion >= 80 ? 'text-amber-600' : 'text-red-600'
                              }`}>
                                {metric.forecast_completion.toFixed(0)}%
                              </span>
                              {metric.forecast_completion >= 100 ? (
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                              ) : metric.forecast_completion >= 80 ? (
                                <Clock className="w-3 h-3 text-amber-500" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-red-500" />
                              )}
                            </div>
                          </div>

                          {/* vs Team Average */}
                          <div className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Users className="w-3.5 h-3.5 text-indigo-500" />
                              <span className="text-[10px] text-gray-600 font-medium">vs Team Avg</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {metric.vs_team_average > 0 ? (
                                <>
                                  <ArrowUp className="w-3 h-3 text-green-600" />
                                  <span className="text-xs font-bold text-green-600">
                                    +{metric.vs_team_average.toFixed(1)}%
                                  </span>
                                </>
                              ) : metric.vs_team_average < 0 ? (
                                <>
                                  <ArrowDown className="w-3 h-3 text-red-600" />
                                  <span className="text-xs font-bold text-red-600">
                                    {metric.vs_team_average.toFixed(1)}%
                                  </span>
                                </>
                              ) : (
                                <span className="text-xs font-bold text-gray-600">
                                  At Average
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Status-Based Completion Rate */}
                          <div className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Target className="w-3.5 h-3.5 text-blue-500" />
                              <span className="text-[10px] text-gray-600 font-medium">Status Completion</span>
                            </div>
                            <span className="text-xs font-bold text-blue-600">
                              {metric.completion_rate.toFixed(0)}%
                            </span>
                          </div>
                        </div>

                        {/* Summary Footer */}
                        <div className="mt-3 pt-3 border-t border-purple-100 text-center">
                          <span className="text-[10px] text-gray-500">
                            {metric.total_goals} total instance{metric.total_goals !== 1 ? 's' : ''} tracked
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <Zap className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-xs text-center px-4 font-medium">
                      No performance insights available
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-gray-400">
              <CalendarClock className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-sm">No {goalType === 'All' ? '' : goalType.toLowerCase()} goals found.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};


