import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList
} from "recharts";
import { EnhancedDateRangeSelector } from "@/components/ui/EnhancedDateRangeSelector";
import { Loader2, Briefcase, Trophy } from "lucide-react";
import { startOfYear, endOfYear } from "date-fns";

interface LabelProps {
  x?: number;
  y?: number;
  width?: number;
  value?: number;
  payload?: any;
}

// ADDED: employeeId is optional
interface ClientWorkflowChartProps {
  organizationId: string;
  employeeId?: string;
}

interface ChartData {
  client_name: string;
  submission_count: number;
  interview_count: number;
  onboard_count: number;
}

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export const ClientWorkflowChart: React.FC<ClientWorkflowChartProps> = ({
  organizationId,
  employeeId,
}) => {
  const [data, setData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<string>("sub_vs_int");

  const [dateRange, setDateRange] = useState<DateRange | null>({
    startDate: startOfYear(new Date()),
    endDate: endOfYear(new Date()),
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!organizationId || !dateRange?.startDate || !dateRange?.endDate)
        return;

      try {
        setIsLoading(true);

        // UPDATED: Pass recruiter_id to the RPC
        const { data: rpcData, error } = await supabase.rpc(
          "get_client_workflow_analytics",
          {
            org_id: organizationId,
            start_date: dateRange.startDate.toISOString(),
            end_date: dateRange.endDate.toISOString(),
            recruiter_id: employeeId || null, // Pass ID if available, else null
          }
        );

        if (error) throw error;
        setData(rpcData || []);
      } catch (error) {
        console.error("Error fetching client workflow data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [organizationId, employeeId, dateRange]); // Re-fetch if employeeId changes

  // Configuration based on Active Tab
  const config = useMemo(() => {
    switch (activeTab) {
      case "sub_vs_int":
        return {
          areaKey: "submission_count" as keyof ChartData,
          areaName: "Submission",
          areaColor: "#7e22ce",
          areaGradientId: "submissionGradient",
          barKey: "interview_count" as keyof ChartData,
          barName: "Interview",
          barColor: "#f59e0b",
          barGradientId: "interviewGradient",
        };
      case "int_vs_onb":
        return {
          areaKey: "interview_count" as keyof ChartData,
          areaName: "Interview",
          areaColor: "#f59e0b",
          areaGradientId: "interviewGradient",
          barKey: "onboard_count" as keyof ChartData,
          barName: "Onboard",
          barColor: "#10b981",
          barGradientId: "onboardingGradient1",
        };
      case "sub_vs_onb":
        return {
          areaKey: "submission_count" as keyof ChartData,
          areaName: "Submission",
          areaColor: "#7e22ce",
          areaGradientId: "submissionGradient",
          barKey: "onboard_count" as keyof ChartData,
          barName: "Onboard",
          barColor: "#10b981",
          barGradientId: "onboardingGradient1",
        };
      default:
        return {
          areaKey: "submission_count" as keyof ChartData,
          areaName: "Submission",
          areaColor: "#7e22ce",
          areaGradientId: "submissionGradient",
          barKey: "interview_count" as keyof ChartData,
          barName: "Interview",
          barColor: "#f59e0b",
          barGradientId: "interviewGradient",
        };
    }
  }, [activeTab]);

  const renderTotalLabel = useCallback((props: LabelProps) => {
    const { x, y, width, payload } = props;

    if (x == null || y == null || width == null || !payload) {
      return null;
    }

    const total =
      (Number(payload[config.areaKey]) || 0) +
      (Number(payload[config.barKey]) || 0);

    const radius = 10;

    return (
      <g>
        <circle
          cx={Number(x) + Number(width) / 2}
          cy={Number(y) - radius}
          r={radius}
          fill="#8884d8"
        />
        <text
          x={Number(x) + Number(width) / 2}
          y={Number(y) - radius}
          fill="#fff"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="12"
          fontWeight="bold"
        >
          {total}
        </text>
      </g>
    );
  }, [config.areaKey, config.barKey]);

  const topClients = useMemo(() => {
    if (!data.length) return [];
    return [...data]
      .sort((a, b) => {
        const totalA =
          (Number(a[config.areaKey]) || 0) + (Number(a[config.barKey]) || 0);
        const totalB =
          (Number(b[config.areaKey]) || 0) + (Number(b[config.barKey]) || 0);
        return totalB - totalA;
      })
      .slice(0, 10);
  }, [data, config]);

  return (
    <Card className="shadow-2xl bg-white/70 backdrop-blur-xl border border-white/20 hover:shadow-3xl transition-all duration-300 rounded-xl h-[400px] flex flex-col">
      <CardContent className="pt-6 flex flex-col h-full">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
          <div className="flex items-center">
            <h3 className="text-lg font-bold text-gray-800 flex items-center">
              <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-green-500 rounded-full mr-3"></div>
              {/* Dynamic Title based on context */}
              {employeeId ? "My Client Analytics" : "Client Workflow Analytics"}
              <span className="text-xs font-normal text-gray-500 ml-2">
                (Top 10)
              </span>
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex-shrink-0 order-1">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner space-x-0.5">
                  <TabsTrigger
                    value="sub_vs_int"
                    className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                  >
                    Sub vs Int
                  </TabsTrigger>
                  <TabsTrigger
                    value="int_vs_onb"
                    className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                  >
                    Int vs Onb
                  </TabsTrigger>
                  <TabsTrigger
                    value="sub_vs_onb"
                    className="px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                  >
                    Sub vs Onb
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <EnhancedDateRangeSelector
              value={dateRange}
              onChange={setDateRange}
              onApply={() => {}}
              monthsView={2}
            />
          </div>
        </div>

        <div className="flex-1 flex min-h-0 gap-4">
          {isLoading ? (
            <div className="flex h-full w-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : topClients.length > 0 ? (
            <>
              <div className="flex-[3] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topClients}
                    margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient
                        id="submissionGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#7235DD"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="50%"
                          stopColor="#7235DD"
                          stopOpacity={0.5}
                        />
                        <stop
                          offset="100%"
                          stopColor="#7235DD"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                      <linearGradient
                        id="interviewGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#F59E0B"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="50%"
                          stopColor="#F59E0B"
                          stopOpacity={0.5}
                        />
                        <stop
                          offset="100%"
                          stopColor="#F59E0B"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                      <linearGradient
                        id="onboardingGradient1"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#10b981"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="50%"
                          stopColor="#10b981"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="100%"
                          stopColor="#10b981"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e5e7eb"
                      strokeOpacity={0.5}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="client_name"
                      tick={{ fontSize: 10, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                      interval={0}
                      tickFormatter={(value) =>
                        value.length > 10
                          ? `${value.substring(0, 10)}...`
                          : value
                      }
                    />
                    <YAxis
                      tick={{
                        fontSize: 10,
                        fill: "#64748b",
                        fontWeight: "500",
                      }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(243, 244, 246, 0.4)" }}
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(10px)",
                        border: "none",
                        borderRadius: "12px",
                        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                        fontSize: "12px",
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      wrapperStyle={{
                        fontSize: "12px",
                        color: "#4b5563",
                        paddingBottom: "5px",
                      }}
                      iconType="rect"
                    />
                    <Bar
                      dataKey={config.areaKey}
                      stackId="a"
                      name={config.areaName}
                      fill={`url(#${config.areaGradientId})`}
                      maxBarSize={25}
                    />
                    <Bar
                      dataKey={config.barKey}
                      stackId="a"
                      name={config.barName}
                      fill={`url(#${config.barGradientId})`}
                      maxBarSize={25}
                      label={renderTotalLabel}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 min-w-[200px] border-l border-gray-100 pl-4 flex flex-col">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-yellow-500" /> Top Clients
                </div>
                <div className="overflow-y-auto pr-2 space-y-3 custom-scrollbar h-full">
                  {topClients.map((client, idx) => (
                    <div
                      key={idx}
                      className="group flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                    >
                      <div className="flex flex-col min-w-0 mr-2">
                        <span
                          className="text-xs font-semibold text-gray-700 truncate"
                          title={client.client_name}
                        >
                          {idx + 1}. {client.client_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <span style={{ color: config.areaColor }}>
                          {client[config.areaKey]}
                        </span>
                        <span className="text-gray-300">/</span>
                        <span style={{ color: config.barColor }}>
                          {client[config.barKey]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-gray-400">
              <Briefcase className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-sm">No data found for this period.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
// 