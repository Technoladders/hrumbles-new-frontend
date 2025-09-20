import React, { useState, useEffect } from "react";
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react'; // For loading spinner (assuming ShadCN or similar)
import RevenueExpenseChart from "./RevenueExpenseChart";
import { useSelector } from "react-redux";
import { CalendarCard } from "../employee/profile/cards/CalendarCard";
import { TimelineCard } from "../employee/profile/cards/SuperadminTimeline";
// import { SubmissionChartCard } from "../employee/profile/cards/SubmissionChartCard";
import {OnboardingChartCard} from "../employee/profile/cards/OnboardingChartCard";
import HiringSuiteDashboard from "./HiringSuiteDashboard";
import CombinedSubmissionOnboardingChart from '@/components/employee/profile/cards/SubmissionChartCard';

 
interface RecruiterData {
  recruiter: string;
  total_resumes_analyzed: number;
}
 
interface ResumeStatsData {
  name: string;
  value: number;
  fill: string;
}
 
const OriginalDashboardContent = () => {
  const [recruiterData, setRecruiterData] = useState<RecruiterData[]>([]);
  const [resumeStatsData, setResumeStatsData] = useState<ResumeStatsData[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resumeStatsError, setResumeStatsError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true); // Loading state
    const { role, user } = useSelector((state) => state.auth);
     const organizationId = useSelector((state: any) => state.auth.organization_id);
    const id = user?.id; // Ensure the user ID is available
    
 
  useEffect(() => {
    const fetchData = async (filter: string) => {
      setIsLoading(true);
      try {
        let dateFilter: { gte?: string; lte?: string } = {};
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
 
        if (filter === 'today') {
          dateFilter = { gte: startOfDay, lte: endOfDay };
        } else if (filter === 'this_week') {
          const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay())).toISOString();
          dateFilter = { gte: startOfWeek, lte: endOfDay };
        } else if (filter === 'this_month') {
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
          dateFilter = { gte: startOfMonth, lte: endOfDay };
        } else if (filter === 'year') {
          const startOfYear = new Date(today.getFullYear(), 0, 1).toISOString();
          dateFilter = { gte: startOfYear, lte: endOfDay };
        }
 
        let candidateQuery = supabase
          .from('hr_job_candidates')
          .select(`
            created_by,
            created_at,
            hr_employees!hr_job_candidates_created_by_fkey (
              first_name
            )
          `);
 
        if (filter !== 'all') {
          candidateQuery = candidateQuery
            .gte('created_at', dateFilter.gte!)
            .lte('created_at', dateFilter.lte!);
        }
 
        const { data: candidateData, error: candidateError } = await candidateQuery;
 
        if (candidateError) {
          console.error("Supabase query error (hr_job_candidates):", candidateError);
          throw new Error(`Error fetching candidate data: ${candidateError.message}`);
        }
 
        // console.log("Raw candidate data from Supabase:", candidateData);
 
        const candidateCounts: { [key: string]: number } = candidateData?.reduce((acc: any, record: any) => {
          if (!record.created_by) {
            console.warn("Skipping record with null created_by in hr_job_candidates");
            return acc;
          }
          if (!record.hr_employees || !record.hr_employees.first_name) {
            console.warn(`No hr_employees data or missing first_name for created_by: ${record.created_by}`);
            return acc;
          }
          const recruiterName = record.hr_employees.first_name;
          acc[recruiterName] = (acc[recruiterName] || 0) + 1;
          return acc;
        }, {}) || {};
 
        let analysisQuery = supabase
          .from('candidate_resume_analysis')
          .select(`
            candidate_id,
            updated_at,
            hr_job_candidates!candidate_resume_analysis_candidate_id_fkey (
              created_by,
              hr_employees!hr_job_candidates_created_by_fkey (
                first_name
              )
            )
          `);
 
        if (filter !== 'all') {
          analysisQuery = analysisQuery
            .gte('updated_at', dateFilter.gte!)
            .lte('updated_at', dateFilter.lte!);
        }
 
        const { data: analysisData, error: analysisError } = await analysisQuery;
 
        if (analysisError) {
          console.error("Supabase query error (candidate_resume_analysis):", analysisError);
          throw new Error(`Error fetching resume analysis data: ${analysisError.message}`);
        }
 
        // console.log("Raw analysis data from Supabase:", analysisData);
 
        const seenCandidateIds = new Set<string>();
        const analysisCounts: { [key: string]: number } = analysisData?.reduce((acc: any, record: any) => {
          if (!record.hr_job_candidates) {
            console.warn(`No hr_job_candidates data for candidate_id: ${record.candidate_id}`);
            return acc;
          }
          if (!record.hr_job_candidates.created_by) {
            console.warn(`Skipping record with null created_by for candidate_id: ${record.candidate_id}`);
            return acc;
          }
          if (!record.hr_job_candidates.hr_employees || !record.hr_job_candidates.hr_employees.first_name) {
            console.warn(`No hr_employees data or missing first_name for created_by: ${record.hr_job_candidates.created_by}`);
            return acc;
          }
          if (seenCandidateIds.has(record.candidate_id)) {
            console.log(`Skipping duplicate candidate_id: ${record.candidate_id}`);
            return acc;
          }
          seenCandidateIds.add(record.candidate_id);
 
          const recruiterName = record.hr_job_candidates.hr_employees.first_name;
          acc[recruiterName] = (acc[recruiterName] || 0) + 1;
          return acc;
        }, {}) || {};
 
        const allRecruiters = new Set([
          ...Object.keys(candidateCounts),
          ...Object.keys(analysisCounts),
        ]);
 
        const formattedRecruiterData: RecruiterData[] = Array.from(allRecruiters).map(recruiter => ({
          recruiter,
          total_resumes_analyzed: (candidateCounts[recruiter] || 0) + (analysisCounts[recruiter] || 0),
        }));
 
        if (formattedRecruiterData.length === 0) {
          setRecruiterData([]);
          setErrorMessage("No valid recruiter data found.");
        } else {
          setRecruiterData(formattedRecruiterData);
          setErrorMessage(null);
        }
 
        try {
          const { data: withAttachmentData, error: withAttachmentError } = await supabase
            .from('candidate_resume_analysis')
            .select('report_url')
            .not('report_url', 'is', null);
 
          if (withAttachmentError) {
            console.error("Supabase query error (candidate_resume_analysis report_url):", withAttachmentError);
            throw new Error(`Error fetching report_url data: ${withAttachmentError.message}`);
          }
 
          const withAttachmentCount = withAttachmentData?.length || 0;
 
          const { data: resumeTextData, error: resumeTextError } = await supabase
            .from('resume_analysis')
            .select('resume_text')
            .not('resume_text', 'is', null);
 
          if (resumeTextError) {
            console.error("Supabase query error (resume_analysis resume_text):", resumeTextError);
            throw new Error(`Error fetching resume_text data: ${resumeTextError.message}`);
          }
 
          const resumeTextCount = resumeTextData?.length || 0;
 
          const pieData: ResumeStatsData[] = [
            { name: 'With Attachment', value: withAttachmentCount, fill: '#4f46e5' },
            { name: 'Without Attachment', value: resumeTextCount, fill: '#a5b4fc' },
          ];
 
          setResumeStatsData(pieData);
          setResumeStatsError(null);
        } catch (err) {
          console.error("Error fetching pie chart data:", err);
          setResumeStatsData([]);
          setResumeStatsError("Error fetching resume stats data. Check the console for details.");
        }
      } catch (err) {
        console.error("Error in fetchData:", err);
        setRecruiterData([]);
        setErrorMessage("Error fetching data. Check the console for details.");
      } finally {
        setIsLoading(false);
      }
    };
 
    fetchData(timeFilter);
  }, [timeFilter]);
 
  const hasNoResumeStatsData = resumeStatsData.every(item => item.value === 0);
 
return (
  <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6 md:p-10">
    <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 text-center mb-10 tracking-tight">
      Organization SuperAdmin Dashboard
    </h1>
 
    <div className="w-full max-w-9xl mx-auto space-y-8">
      <div className="w-full">
        <RevenueExpenseChart />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart: Resumes Analyzed by Recruiter */}
        <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl md:text-xl font-semibold">
                Resumes Analyzed by Recruiter
              </CardTitle>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-[160px] bg-white text-gray-800 border-gray-300 focus:ring-2 focus:ring-indigo-400 transition-all duration-200">
                  <SelectValue placeholder="Select time period" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 shadow-lg">
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-4 overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            ) : errorMessage ? (
              <p className="text-red-500 text-center font-medium">{errorMessage}</p>
            ) : recruiterData.length === 0 ? (
              <div className="flex items-center justify-center h-[400px] text-gray-500 font-medium">
                <p>No recruiter data available.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={450}>
                <BarChart
                  data={recruiterData}
                  margin={{ top: 20, right: 20, left: 0, bottom: 60 }}
                  className="animate-fade-in"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="recruiter"
                    angle={0}
                    textAnchor="middle"
                    interval={0}
                    height={50}
                    label={{ value: "Recruiters", position: "insideBottom", offset: -10, fill: "#4b5563" }}
                    className="text-sm font-medium"
                  />
                  <YAxis
                    label={{ value: "Resumes Analyzed", angle: -90, position: "insideLeft", offset: -10, fill: "#4b5563" }}
                    className="text-sm font-medium"
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar
                    dataKey="total_resumes_analyzed"
                    fill="#4f46e5"
                    name="Resumes Analyzed"
                    radius={[12, 12, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
 
        {/* Pie Chart: Total Resumes in Database */}
        <Card className="shadow-xl border-none bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6">
            <CardTitle className="text-xl md:text-xl font-semibold">
              Total Resumes in Database
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            ) : resumeStatsError ? (
              <p className="text-red-500 text-center font-medium">{resumeStatsError}</p>
            ) : hasNoResumeStatsData ? (
              <div className="flex items-center justify-center h-[400px] text-gray-500 font-medium">
                <p>No data to display</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart className="animate-fade-in">
                  <Pie
                    data={resumeStatsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    className="font-medium"
                  >
                    {resumeStatsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                    formatter={(value, name) => [
                      `${value} (${((value as number / resumeStatsData.reduce((sum, entry) => sum + entry.value, 0)) * 100).toFixed(1)}%)`,
                      name,
                    ]}
                  />
                  <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: "14px", color: "#4b5563" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        
       <div className="h-full">
                  <CalendarCard employeeId={user.id} isHumanResourceEmployee={false} role={role} organizationId={organizationId}/>
                  </div>
          <div className="h-full">
                  <TimelineCard />
                  </div>
 
                   <div className="h-full">
                                <SubmissionChartCard employeeId={user.id} role={role} organizationId={organizationId} />
                              </div>
                              <div className="h-full">
                                {/* <OnboardingChartCard employeeId={user.id} role={role} /> */}
                              </div>
      </div>
 
      {/* Revenue and Expense Chart */}
      
    </div>
  </div>
);
}

// --- NEW: Self-Contained Component for the Ascendion Dashboard ---
const AscendionDashboard = () => {
    const organizationId = useSelector((state: any) => state.auth.organization_id);
    const { user, role } = useSelector((state: any) => state.auth);

    // Fetch data for the UAN verification chart
    const { data: weeklyUanData, isLoading: uanLoading } = useQuery({
        queryKey: ['weeklyUanVerifications', organizationId], // A unique query key for this data
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_weekly_activity_summary', { org_id: organizationId });
            if (error) throw error;
            return data;
        },
        enabled: !!organizationId,
    });

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8">
            <div className="max-w-9xl mx-auto space-y-6">
                {/* <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Dashboard</h1> */}
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Card for the UAN Verification Chart */}
                   

                    {/* Card for the Calendar */}
                    <div className="h-full">
                        <CalendarCard employeeId={user.id} isHumanResourceEmployee={false} role={role} organizationId={organizationId}/>
                    </div>
                     <Card className="shadow-md border-none bg-white h-full">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base font-semibold text-gray-700">Weekly Employment Verifications</CardTitle>
                            <CardDescription className="text-xs">Number of UAN/EPFO checks performed this week</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {uanLoading ? (
                                <div className="flex justify-center items-center h-[350px]">
                                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600"/>
                                </div>
                            ) : (
                                <>
                                    <div className="text-3xl font-bold mb-4 text-gray-800">
                                        {weeklyUanData?.reduce((acc, day) => acc + Number(day.epfo_verifications), 0) ?? 0}
                                    </div>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart data={weeklyUanData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="day_name" axisLine={false} tickLine={false} className="text-xs text-gray-600"/>
                                            <YAxis axisLine={false} tickLine={false} className="text-xs text-gray-600" />
                                            <Tooltip 
                                                cursor={{fill: 'rgba(185, 16, 154, 0.1)'}} 
                                                contentStyle={{ fontSize: '12px', padding: '4px 8px', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}
                                            />
                                            <Bar dataKey="epfo_verifications" name="Verifications" fill="#A855F7" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
 

 

// --- Main Component acting as a router ---
function OrganizationSuperadminDashboard() {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const { role, user } = useSelector((state) => state.auth);
  const [organizationDetails, setOrganizationDetails] = useState<{ is_recruitment_firm: boolean } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  

   const ASCENDION_ORG_ID = "22068cb4-88fb-49e4-9fb8-4fa7ae9c23e5";

  // Define the organizations that will see the new dashboard
  const ITECH_HIRING_SUITE_ORGS = [
    "1961d419-1272-4371-8dc7-63a4ec71be83",
    "4d57d118-d3a2-493c-8c3f-2cf1f3113fe9",
    "53989f03-bdc9-439a-901c-45b274eff506",
    "87fd4bb2-dbaf-4775-954a-eb82f70ac961",
    "96593f3f-59fa-4805-bc84-bbec17ed964e"
  ];

  // --- START: New useEffect to fetch the organization's properties ---
  useEffect(() => {
    if (!organizationId) {
      setIsLoading(false);
      return;
    }

    const fetchOrganizationDetails = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('hr_organizations')
          .select('is_recruitment_firm')
          .eq('id', organizationId)
          .single();

        if (error) throw error;
        
        setOrganizationDetails(data);
      } catch (error) {
        console.error("Error fetching organization details:", error);
        setOrganizationDetails(null); // Set to null on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganizationDetails();
  }, [organizationId]); // Rerun this effect if the organizationId changes
  // --- END: New useEffect ---

  

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (organizationId === ASCENDION_ORG_ID) {
    return <AscendionDashboard />;
  } 

    if (organizationDetails?.is_recruitment_firm) {
    return <HiringSuiteDashboard employeeId={user.id}/>;
  }
  
  // Then it checks for the other Hiring Suite orgs.
  if (ITECH_HIRING_SUITE_ORGS.includes(organizationId)) {
    return <HiringSuiteDashboard />;
  } 
  
  // Finally, it falls back to the original dashboard.
  return <OriginalDashboardContent />;

}

export const SubmissionChartCard = CombinedSubmissionOnboardingChart;

export default OrganizationSuperadminDashboard;
