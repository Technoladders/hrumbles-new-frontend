import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Loader2, Target, Trophy, CalendarClock } from "lucide-react";
import { startOfMonth, endOfMonth, isSameDay, format, addDays } from "date-fns";

interface GoalPerformanceChartProps {
  organizationId: string;
  employeeId?: string; // Optional: if provided, filters by specific employee
}

interface GoalData {
  goal_name: string;
  target_total: number;
  current_total: number;
  avg_progress: number;
}

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export const GoalPerformanceChart: React.FC<GoalPerformanceChartProps> = ({ organizationId, employeeId }) => {
  const [data, setData] = useState<GoalData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Goal Type Filter: 'All', 'Daily', 'Weekly', 'Monthly', 'Yearly'
  const [goalType, setGoalType] = useState<string>("All");
  
  const [dateRange, setDateRange] = useState<DateRange | null>({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
  });

  const pickerMode = goalType === 'All' ? 'daily' : (goalType.toLowerCase() as any);

  // Date Formatting Helpers
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
        
        const { data: rpcData, error } = await supabase.rpc('get_goal_performance_analytics', {
          org_id: organizationId,
          search_start_date: searchStartDate,
          search_end_date: searchEndDate,
          filter_recruiter_id: employeeId || null,
          filter_goal_type: goalType // Passing new filter
        });

        if (error) throw error;
        setData(rpcData || []);
        
      } catch (error) {
        console.error("Error fetching goal data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [organizationId, employeeId, dateRange, goalType]);

  // Sort by highest Target value and take top 10
  const topGoals = useMemo(() => {
    if (!data.length) return [];
    return [...data]
      .sort((a, b) => b.target_total - a.target_total)
      .slice(0, 10);
  }, [data]);

  // Normalize bar heights to max target for consistent visualization
  const maxTarget = useMemo(() => {
    return Math.max(...topGoals.map(item => item.target_total), 1);
  }, [topGoals]);

  // Transform for stacked bar with normalized heights
  const chartData = useMemo(() => 
    topGoals.map(item => {
      const progressRatio = item.target_total > 0 ? item.current_total / item.target_total : 0;
      const achievedScaled = progressRatio * maxTarget;
      const remainingScaled = maxTarget - achievedScaled;
      return {
        goal_name: item.goal_name,
        achieved: achievedScaled, // for bar
        remaining: remainingScaled, // for bar
        actual_achieved: item.current_total, // for display
        actual_target: item.target_total, // for display
        progress: item.avg_progress
      };
    }), 
  [topGoals, maxTarget]);

  // Visual Config
  const config = {
    achievedColor: "#f59e0b", // Yellow
    remainingColor: "#505050", // Grey
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 rounded shadow-lg border">
          <p className="font-bold">{data.goal_name}</p>
          <p>Achieved: {data.actual_achieved}</p>
          <p>Target: {data.actual_target}</p>
          <p>Progress: {data.progress.toFixed(0)}%</p>
        </div>
      );
    }
    return null;
  };

  const getAchievedGradient = (progress: number) => progress >= 100 ? "url(#achievedGreenGradient)" : "url(#achievedYellowGradient)";

  const getTopRoundedPath = (x: number, y: number, width: number, height: number, radius: number) => {
  return `
    M ${x} ${y + height} 
    L ${x} ${y + radius}
    Q ${x} ${y} ${x + radius} ${y}
    L ${x + width - radius} ${y}
    Q ${x + width} ${y} ${x + width} ${y + radius}
    L ${x + width} ${y + height}
    Z
  `;
};


  return (
    <Card className="shadow-2xl bg-white/70 backdrop-blur-xl border border-white/20 hover:shadow-3xl transition-all duration-300 rounded-xl h-[450px] flex flex-col">
      <CardContent className="pt-6 flex flex-col h-full">
        {/* Header Section */}
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800 flex items-center">
              <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-emerald-500 rounded-full mr-3"></div>
              {employeeId ? "My Goal Performance" : "Team Goal Performance"}
              <span className="text-xs font-normal text-gray-500 ml-2 hidden sm:inline">(Top 10)</span>
            </h3>
            
            {/* Desktop Date Picker */}
            <div className="hidden sm:block">
               <PeriodwiseDatePicker
                  value={dateRange}
                  onChange={setDateRange}
                  onApply={() => {}}
                  monthsView={2}
                  mode={pickerMode}
               />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
             {/* Goal Type Tabs */}
            <Tabs value={goalType} onValueChange={setGoalType} className="w-full sm:w-auto overflow-x-auto no-scrollbar">
              <TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner space-x-0.5">
                <TabsTrigger 
                  value="All" 
                  className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                >
                  All
                </TabsTrigger>
                <TabsTrigger 
                  value="Daily" 
                  className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                >
                  Daily
                </TabsTrigger>
                <TabsTrigger 
                  value="Weekly" 
                  className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                >
                  Weekly
                </TabsTrigger>
                <TabsTrigger 
                  value="Monthly" 
                  className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                >
                  Monthly
                </TabsTrigger>
                <TabsTrigger 
                  value="Yearly" 
                  className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                >
                  Yearly
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Mobile Date Picker */}
            <div className="sm:hidden w-full flex justify-end">
               <PeriodwiseDatePicker
                  value={dateRange}
                  onChange={setDateRange}
                  onApply={() => {}}
                  monthsView={1}
                  mode={pickerMode}
               />
            </div>
          </div>
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
                      dataKey="goal_name" 
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

                    {/* Achieved Bar (Bottom Layer) */}
             <Bar
  dataKey="achieved"
  stackId="a"
 fill="#f59e0b" 
  maxBarSize={50}
  shape={(props) => {
    const { x, y, width, height, payload, index } = props;

    const gradientId = getAchievedGradient(payload.progress);
    const clipId = `clipWave-${index}`;

    // Only round top if progress >= 100
    const radius = payload.progress >= 100 ? 8 : 0;

    // Get the rounded-top path
    const barPath = getTopRoundedPath(x, y, width, height, radius);

    return (
      <g>
        {/* 1. Main bar shape */}
        <path d={barPath} fill={gradientId} />

        {/* 2. ClipPath for wave with SAME rounded shape */}
        <clipPath id={clipId}>
          <path d={barPath} />
        </clipPath>

        {/* 3. Wave inside clipped region */}
        <use
          href="#oceanWave"
          x={x}
          y={y - 20}
          clipPath={`url(#${clipId})`}
          width={width}
          opacity={0.35}
          fill={gradientId}
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


                    {/* Target Remaining Bar with 3D Depth (Top Layer) */}
                    <Bar
                      dataKey="remaining"
                      stackId="a"
                      fill="url(#targetMainGradient)"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={50}
                      style={{ mask: "url(#waveMask)" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Leaderboard Panel (25%) */}
              <div className="flex-1 min-w-[220px] border-l border-gray-200 pl-6 flex flex-col">
                <div className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />Performance
                </div>
                <div className="space-y-3 overflow-y-auto pr-2 h-full custom-scrollbar">
                  {chartData.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-50/70 hover:bg-purple-50 transition-all border border-transparent hover:border-purple-200"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-gray-800 text-sm truncate pr-2">
                          {idx + 1}. {item.goal_name}
                        </span>
                        <div className="w-32 h-2 bg-gray-200 rounded-full mt-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.min(item.progress, 100)}%`,
                              background: item.progress >= 100
                                ? "linear-gradient(90deg, #10b981, #34d399)"
                                : "linear-gradient(90deg, #f59e0b, #fbbf24)",
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-amber-600">{item.actual_achieved}</div>
                        <div className="text-xs text-gray-500">/ {item.actual_target}</div>
                        <div className="text-xs font-bold text-purple-600 mt-1">
                          {item.progress.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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