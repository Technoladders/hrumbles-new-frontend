import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BarChart2, Users } from "lucide-react";
import { ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { MiniDateRangePicker } from "@/components/ui/MiniDateRangePicker"; // <-- Use the new component

interface CombinedChartCardProps {
  employeeId: string;
  role: string;
  organizationId: string;
}

interface ChartData {
  name: string;
  submissions: number;
  onboarding: number;
}

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
  key: string;
}


export const CombinedSubmissionOnboardingChart: React.FC<CombinedChartCardProps> = ({ employeeId, role, organizationId }) => {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"week" | "month" | "year">("year");
  const [dateRange, setDateRange] = useState<DateRange | null>(null); 

  const isEmployee = role === "employee";
  const isSuperAdmin = role === "organization_superadmin";
  const currentYear = new Date().getFullYear().toString();

  console.log("CombinedSubmissionOnboardingChart", employeeId, role, organizationId);

useEffect(() => {
  const fetchCombinedData = async () => {

     if (!organizationId || (!employeeId && !isSuperAdmin)) {
        setLoading(false);
        return;
      }

    try {
      setLoading(true);

       const { data: statuses, error: statusError } = await supabase
          .from('job_statuses')
          .select('id, name')
          .eq('type', 'sub')
          .eq('organization_id', organizationId)
          .in('name', ['Processed (Client)', 'Joined']);

        if (statusError) throw statusError;

        const submissionStatus = statuses.find(s => s.name === 'Processed (Client)');
        const onboardingStatus = statuses.find(s => s.name === 'Joined');

        // If the required statuses don't exist for this org, we can't show the chart.
        if (!submissionStatus || !onboardingStatus) {
          console.warn("Required statuses ('Processed (Client)' or 'Joined') not found for this organization.");
          setChartData([]);
          setLoading(false);
          return;
        }

        const submissionStatusId = submissionStatus.id;
        const onboardingStatusId = onboardingStatus.id;

      let startDate: Date;
      let endDate: Date;
      const now = new Date();

      // --- NEW LOGIC: Determine the date range to fetch ---
      if (dateRange && dateRange.startDate && dateRange.endDate) {
        // 1. A custom date range from the picker has been selected
        startDate = dateRange.startDate;
        endDate = dateRange.endDate;
      } else {
        // 2. No custom range, so use the active tab
        if (activeTab === "week") {
          startDate = new Date(now);
          startDate.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
        } else if (activeTab === "month") {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else { // Year
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31);
        }
      }

      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      // --- The Supabase queries are now much simpler ---
      let submissionQuery = supabase.from("hr_status_change_counts")
          .select("count, created_at, hr_job_candidates(submission_date)")
          .eq("sub_status_id", submissionStatusId) // <-- DYNAMIC ID
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());

        let onboardingQuery = supabase.from("hr_status_change_counts")
          .select("count, created_at, hr_job_candidates(joining_date)")
          .eq("sub_status_id", onboardingStatusId) // <-- DYNAMIC ID
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString());

      if (!isSuperAdmin) {
          submissionQuery = submissionQuery.eq("candidate_owner", employeeId);
          onboardingQuery = onboardingQuery.eq("candidate_owner", employeeId);
        }
        
        const [submissionResult, onboardingResult] = await Promise.all([submissionQuery, onboardingQuery]);
        if (submissionResult.error || onboardingResult.error) throw submissionResult.error || onboardingResult.error;

      // --- Data processing logic remains similar, just adapted ---
      let data: ChartData[] = [];
      if (activeTab === 'year' && !dateRange) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        data = months.map((month, index) => {
          const submissionCount = submissionResult.data.filter(r => new Date(r.hr_job_candidates?.submission_date || r.created_at).getMonth() === index).reduce((sum, r) => sum + r.count, 0);
          const onboardingCount = onboardingResult.data.filter(r => new Date(r.hr_job_candidates?.joining_date || r.created_at).getMonth() === index).reduce((sum, r) => sum + r.count, 0);
          return { name: month, submissions: submissionCount, onboarding: onboardingCount };
        });
      } else {
        // Logic for Week, Month, and Custom Date Ranges (daily breakdown)
        const labels: { name: string; date: Date }[] = [];
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          labels.push({ name: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), date: new Date(d) });
        }

        data = labels.map(label => {
          const submissionCount = submissionResult.data.filter(r => new Date(r.hr_job_candidates?.submission_date || r.created_at).toDateString() === label.date.toDateString()).reduce((sum, r) => sum + r.count, 0);
          const onboardingCount = onboardingResult.data.filter(r => new Date(r.hr_job_candidates?.joining_date || r.created_at).toDateString() === label.date.toDateString()).reduce((sum, r) => sum + r.count, 0);
          return { name: label.name, submissions: submissionCount, onboarding: onboardingCount };
        });
      }

      setChartData(data);
    } catch (error: any) {
      console.error("Error fetching combined data:", error);
      toast.error(`Error loading chart data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  
    fetchCombinedData();
  
}, [employeeId, role, activeTab, dateRange, organizationId, isSuperAdmin]); // <-- IMPORTANT: Add dateRange to the dependency array

  return (
    <Card className="shadow-2xl bg-white/70 backdrop-blur-xl border border-white/20 hover:shadow-3xl transition-all duration-300 rounded-xl h-[300px] md:h-[280px] md:h-[300px] lg:h-[280px] flex flex-col">
      <CardContent className="pt-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            {/* <div className="flex items-center space-x-2">
              <BarChart2 className="h-5 w-5 text-purple-500 mr-1" />
              <Users className="h-5 w-5 text-green-500 mr-2" />
            </div> */}
            <h3 className="text-lg font-bold text-gray-800 flex items-center">
              <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-green-500 rounded-full mr-3"></div>
              Submission & Onboarding Analytics
            </h3>
          </div>
           <div className="flex items-center gap-4"> 
          <Tabs 
  value={activeTab} 
  onValueChange={(value) => {
    setActiveTab(value as "week" | "month" | "year");
    setDateRange(null); // Clear custom date range when a tab is clicked
  }}
>
  <TabsList className="grid grid-cols-3"> {/* Simplified to always show 3 tabs */}
    <TabsTrigger value="week">Week</TabsTrigger>
    <TabsTrigger value="month">Month</TabsTrigger>
    <TabsTrigger value="year">Year</TabsTrigger>
  </TabsList>
</Tabs>
           <MiniDateRangePicker
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      onApply={() => {}} // You can add logic here if needed when Apply is clicked
    />
        </div>
      </div>
        
        <div className="flex-1 overflow-y-auto pr-2">
          {loading ? (
            <div className="text-gray-500 italic">Loading chart...</div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="submissionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7235DD" stopOpacity={0.8} />
                    <stop offset="50%" stopColor="#7235DD" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#7235DD" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="onboardingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#505050" stopOpacity={0.8} />
                    <stop offset="50%" stopColor="#505050" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#505050" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                
                <YAxis 
                  yAxisId="left"
                  orientation="left"
                  tick={{ fontSize: 11, fill: '#7235DD', fontWeight: '600' }}
                  axisLine={false}
                  tickLine={false}
                />
                
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: '#10b981', fontWeight: '600' }}
                  axisLine={false}
                  tickLine={false}
                />
                
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    backdropFilter: "blur(10px)",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
                  }}
                  labelStyle={{ fontWeight: 'bold', color: '#374151' }}
                />
                
                <Legend 
                  verticalAlign="top" 
                  height={36} 
                  wrapperStyle={{ fontSize: "12px", color: "#4b5563", paddingBottom: "10px" }}
                  iconType="rect"
                />

                {/* Submission Area Chart (Background) */}
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="submissions"
                  name="Submissions"
                  stroke="#7e22ce"
                  strokeWidth={2}
                  fill="url(#submissionGradient)"
                  fillOpacity={1}
                />

                {/* Onboarding Bar Chart */}
                <Bar
                  yAxisId="right"
                  dataKey="onboarding"
                  name="Onboarding"
                  fill="url(#onboardingGradient)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-gray-500 italic">No data available</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};


export default CombinedSubmissionOnboardingChart; // This is CORRECT