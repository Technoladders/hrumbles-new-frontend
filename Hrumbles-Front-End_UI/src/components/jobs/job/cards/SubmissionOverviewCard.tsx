import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/jobs/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Button } from "@/components/jobs/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/jobs/ui/tabs";
import { Skeleton } from "@/components/jobs/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { getCandidateStatusCounts } from "@/services/candidateService";
import { JobData } from "@/lib/types";

interface SubmissionOverviewCardProps {
  job: JobData;
}

type StatusCount = {
  name: string;
  count: number;
  color: string;
};

const SubmissionOverviewCard = ({ job }: SubmissionOverviewCardProps) => {
  const [viewType, setViewType] = useState<"main" | "sub">("main");

  // Fetch status counts based on the selected view type
  const {
    data: statusCounts = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["candidate-status-counts", job.id, viewType],
    queryFn: () => getCandidateStatusCounts(job.id, viewType),
    enabled: !!job.id,
  });

  // Format data for the pie chart
  const chartData = statusCounts.map((status) => ({
    name: status.name,
    value: status.count,
    color: status.color || getDefaultColor(status.name),
  }));

  // Default colors for statuses without defined colors
  function getDefaultColor(statusName: string): string {
    const colorMap: Record<string, string> = {
      New: "#6c757d",
      Processed: "#007bff",
      Interview: "#6f42c1",
      Offered: "#fd7e14",
      Joined: "#28a745",
      "Technical Assessment": "#17a2b8",
      L1: "#20c997",
      L2: "#e83e8c",
      L3: "#dc3545",
      "End Client Round": "#6610f2",
    };

    return colorMap[statusName] || "#7B43F1";
  }

  // Handle empty or error states
  const noData = isError || (!isLoading && (!statusCounts || statusCounts.length === 0));

  // Get total candidates count
  const totalCandidates = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="md:col-span-1 shadow-lg">
      <CardHeader className="pb-2 pt-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <CardTitle className="text-lg font-semibold purple-text-color flex items-center">
            <svg
              className="mr-2"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6M5 17h14"
              />
            </svg>
            Submission Overview
          </CardTitle>

          <Tabs
            defaultValue="main"
            className="h-8"
            onValueChange={(value) => setViewType(value as "main" | "sub")}
          >
            <TabsList className="w-auto grid grid-cols-2 sm:flex sm:gap-1">
              <TabsTrigger value="main" className="text-xs sm:text-sm px-2 sm:px-4">
                Main Status
              </TabsTrigger>
              <TabsTrigger value="sub" className="text-xs sm:text-sm px-2 sm:px-4">
                Sub Status
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center">
            <Skeleton className="h-[180px] w-[180px] rounded-full" />
            <Skeleton className="h-4 w-[200px] mt-4" />
            <Skeleton className="h-4 w-[120px] mt-2" />
          </div>
        ) : noData ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-500">
            <svg
              width="64"
              height="64"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              className="mb-3 text-gray-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6M5 17h14"
              />
            </svg>
            <p>No candidates found for this job</p>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-2">
              Refresh
            </Button>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={totalCandidates > 0 ? 60 : 0}
                  outerRadius={90}
                  cornerRadius={6}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="#ffffff"
                  strokeWidth={1}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
  formatter={(value: number, name: string) => [value, name]}
  content={({ payload }) => {
    if (!payload || !payload[0]) return null;
    const { value, name } = payload[0].payload;
    return (
      <div
        style={{
          backgroundColor: "black",
          color: "white",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "6px",
          fontSize: "12px",
        }}
      >
        <div>{name}: {value}</div>

      </div>
    );
  }}
/>
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  formatter={(value) => <span className="text-xs">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="mt-4 flex justify-between items-center">
          <span className="text-sm text-gray-500 flex items-center">
            <svg
              className="mr-2 text-purple-500"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            Total Candidates: {totalCandidates}
          </span>
          <span
            className={`text-sm font-medium px-2 py-1 rounded-full ${
              job.status === "OPEN"
                ? "bg-green-100 text-green-800"
                : job.status === "HOLD"
                ? "bg-orange-100 text-orange-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {job.status}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubmissionOverviewCard;