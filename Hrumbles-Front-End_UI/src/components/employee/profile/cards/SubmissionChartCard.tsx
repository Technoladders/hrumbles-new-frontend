import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface SubmissionChartCardProps {
  employeeId: string;
  role: string;
}

interface ChartData {
  name: string;
  count: number;
}

export const SubmissionChartCard: React.FC<SubmissionChartCardProps> = ({ employeeId, role }) => {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"week" | "month" | "year">("week");

  const isSuperAdmin = role === "organization_superadmin";

  useEffect(() => {
    const fetchCandidateData = async () => {
      try {
        setLoading(true);

        let query = supabase
          .from("hr_status_change_counts")
          .select(`
            count,
            created_at,
            hr_job_candidates (
              submission_date
            )
          `)
          .eq("sub_status_id", "71706ff4-1bab-4065-9692-2a1237629dda");

        // Apply candidate_owner filter only if not organization_superadmin
        if (!isSuperAdmin) {
          query = query.eq("candidate_owner", employeeId);
        }

        const now = new Date();
        let data: ChartData[] = [];

        if (activeTab === "week") {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
          startOfWeek.setHours(0, 0, 0, 0);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);

          const { data: counts, error } = await query
            .gte("created_at", startOfWeek.toISOString())
            .lte("created_at", endOfWeek.toISOString());

          if (error) throw error;

          const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
          data = days.map((day, index) => {
            const dayDate = new Date(startOfWeek);
            dayDate.setDate(startOfWeek.getDate() + index);
            const dayCount = counts
              .filter((record) => {
                const date = record.hr_job_candidates?.submission_date
                  ? new Date(record.hr_job_candidates.submission_date)
                  : new Date(record.created_at);
                return date.toDateString() === dayDate.toDateString();
              })
              .reduce((sum, record) => sum + record.count, 0);
            return { name: day, count: dayCount };
          });
        } else if (activeTab === "month") {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

          const { data: counts, error } = await query
            .gte("created_at", startOfMonth.toISOString())
            .lte("created_at", endOfMonth.toISOString());

          if (error) throw error;

          const weeks: { [key: string]: number } = {};
          counts.forEach((record) => {
            const date = record.hr_job_candidates?.submission_date
              ? new Date(record.hr_job_candidates.submission_date)
              : new Date(record.created_at);
            const weekNumber = Math.floor((date.getDate() - 1) / 7) + 1;
            const weekKey = `Week ${weekNumber}`;
            weeks[weekKey] = (weeks[weekKey] || 0) + record.count;
          });

          data = Array.from({ length: 5 }, (_, i) => `Week ${i + 1}`).map((week) => ({
            name: week,
            count: weeks[week] || 0,
          }));
        } else if (activeTab === "year") {
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

          const { data: counts, error } = await query
            .gte("created_at", startOfYear.toISOString())
            .lte("created_at", endOfYear.toISOString());

          if (error) throw error;

          const months = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
          ];
          data = months.map((month, index) => {
            const monthCount = counts
              .filter((record) => {
                const date = record.hr_job_candidates?.submission_date
                  ? new Date(record.hr_job_candidates.submission_date)
                  : new Date(record.created_at);
                return date.getMonth() === index;
              })
              .reduce((sum, record) => sum + record.count, 0);
            return { name: month, count: monthCount };
          });
        }

        setChartData(data);
      } catch (error: any) {
        console.error("Error fetching submission count:", error);
        toast.error(`Error loading submission data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (employeeId || isSuperAdmin) {
      fetchCandidateData();
    }
  }, [employeeId, role, activeTab]);

  return (
    <Card className="shadow-md rounded-xl h-[300px] md:h-[325px] lg:h-[300px] flex flex-col ">
      <CardContent className="pt-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <BarChart className="h-5 w-5 text-purple-500 dark:text-purple-400 mr-2" />
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Submission Count</h3>
          </div>
          <Tabs defaultValue="week" onValueChange={(value) => setActiveTab(value as "week" | "month" | "year")}>
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex-1 overflow-y-auto pr-2">
          {loading ? (
            <div className="text-gray-500 dark:text-gray-400 italic">Loading chart...</div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
    data={chartData}
    margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
  >
    <defs>
      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.8} /> {/* indigo-600 */}
        <stop offset="100%" stopColor="#7e22ce" stopOpacity={0.8} /> {/* purple-700 */}
      </linearGradient>
    </defs>

    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="name" />
    <YAxis />
    <Tooltip />
    <Area
      type="monotone"
      dataKey="count"
      stroke="#7e22ce"
      fill="url(#colorCount)"
    />
  </AreaChart>
</ResponsiveContainer>
          ) : (
            <div className="text-gray-500 dark:text-gray-400 italic">No submission data available</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};