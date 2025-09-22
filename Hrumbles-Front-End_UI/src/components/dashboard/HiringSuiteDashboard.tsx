import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Crown, Users, Target, Loader2, BrainCircuit, ShieldCheck, Briefcase, Clock, CheckCheck, Tag } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { CalendarCard } from "../employee/profile/cards/CalendarCard";
import { Badge } from "@/components/ui/badge";
import { HeroCarousel, CarouselSlide } from './HeroCarousel';
import { useDashboardData } from "@/hooks/use-dashboard-data";
import { GreetingSlide, EventsSlide, CelebrationsSlide } from './DashboardCarouselSlides';
import { DashboardHeroCarousel } from './DashboardHeroCarousel';
import CombinedSubmissionOnboardingChart from '@/components/employee/profile/cards/SubmissionChartCard';


// --- Reusable Component for Chart Cards ---
const ChartCard = ({ title, description, children, isLoading, className = "" }) => (
  <Card className={`shadow-md border-none bg-white h-full ${className}`}>
    <CardHeader className="pb-2 sm:pb-4">
      <CardTitle className="text-sm sm:text-base font-semibold text-gray-700">{title}</CardTitle>
      {description && <CardDescription className="text-[10px] sm:text-xs">{description}</CardDescription>}
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <div className="flex justify-center items-center h-[100px] sm:h-[150px]">
          <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-indigo-600" />
        </div>
      ) : children}
    </CardContent>
  </Card>
);

// --- Main Dashboard Component ---
const HiringSuiteDashboard = ({ employeeId }: { employeeId: string; role: string }) => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const { user, role } = useSelector((state: any) => state.auth);

  const carouselThemes = [
    {
      title: 'Recruiter of the Month!',
      gradient: 'bg-gradient-to-br from-purple-600 to-indigo-700',
    },
    {
      title: 'Average Time to Hire',
      gradient: 'bg-gradient-to-br from-sky-500 to-blue-600',
    },
    {
      title: 'Offer Acceptance Rate',
      gradient: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    }
  ];

  // --- Data Fetching Hooks ---
  const { data: dashboardData, isLoading: dashboardDataLoading } = useDashboardData(organizationId);

  console.log("dashboardData", dashboardData);

  const { data: topRecruiter, isLoading: topRecruiterLoading } = useQuery({
    queryKey: ['topRecruiterOfMonth', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_top_recruiter_of_month', { org_id: organizationId });
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!organizationId,
  });

  const { data: avgTimeToHire, isLoading: timeToHireLoading } = useQuery({
    queryKey: ['avgTimeToHire', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_avg_time_to_hire', { org_id: organizationId });
      if (error) throw error;
      return data?.[0] || { avg_days: 0 };
    },
    enabled: !!organizationId,
  });

  const { data: acceptanceRate, isLoading: acceptanceRateLoading } = useQuery({
    queryKey: ['offerAcceptanceRate', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_offer_acceptance_rate', { org_id: organizationId });
      if (error) throw error;
      return data?.[0] || { acceptance_rate: 0 };
    },
    enabled: !!organizationId,
  });

  const { data: funnelCounts, isLoading: funnelLoading } = useQuery({
    queryKey: ['dynamicFunnelCounts', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_dynamic_funnel_counts', { org_id: organizationId });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
  });

  console.log('funnelCounts', funnelCounts);

  const { data: topJobs, isLoading: topJobsLoading } = useQuery({
    queryKey: ['topJobsByCandidates', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_top_jobs_by_candidates', { org_id: organizationId });
      if (error) throw error;
      const total = data.reduce((sum, job) => sum + Number(job.candidate_count), 0);
      return { jobs: data, total };
    },
    enabled: !!organizationId
  });

  const { data: weeklyActivity, isLoading: weeklyActivityLoading } = useQuery({
    queryKey: ['weeklyActivitySummary', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_weekly_activity_summary', { org_id: organizationId });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId
  });

  const { data: verificationStats, isLoading: verificationLoading } = useQuery({
    queryKey: ['verificationStats', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_verification_stats', { org_id: organizationId });
      if (error) throw error;
      return data?.[0] || { total_epfo_checks: 0, successful_epfo_checks: 0 };
    },
    enabled: !!organizationId,
  });

  const { data: awaitingAction, isLoading: awaitingActionLoading } = useQuery({
    queryKey: ['candidatesAwaitingAction', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_candidates_awaiting_action', { org_id: organizationId, limit_count: 5 });
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // --- useMemo hook for heroSlides ---
  const heroSlides: CarouselSlide[] = useMemo(() => {
    const slides: CarouselSlide[] = [];

    // Slide 1: Greeting
    slides.push({
      content: <GreetingSlide user={user} />,
      gradient: carouselThemes[0].gradient,
    });

   // Check for events and celebrations data
    const hasEvents = dashboardData?.events?.length > 0;
    const celebrations = dashboardData?.celebrations || {};
    const hasCelebrations = (celebrations.birthdays?.length || 0) + (celebrations.anniversaries?.length || 0) + (celebrations.newJoiners?.length || 0) > 0;

    let themeIndex = 1;

    // Conditionally add Events slide if data exists
    if (hasEvents) {
      slides.push({
        content: <EventsSlide events={dashboardData?.events} />,
        gradient: carouselThemes[themeIndex % carouselThemes.length].gradient,
      });
      themeIndex++;
    }

    // Conditionally add Celebrations slide if data exists
    if (hasCelebrations) {
      slides.push({
        content: <CelebrationsSlide celebrations={dashboardData?.celebrations} />,
        gradient: carouselThemes[themeIndex % carouselThemes.length].gradient,
      });
      themeIndex++;
    }

    // Fallback Slides if needed (to ensure at least 3 slides)
    // const fallbackSlides: CarouselSlide[] = [
    //   {
    //     content: (
    //       <div className="flex flex-col justify-center items-center h-full text-center text-white/90 px-2 sm:px-4">
    //         <Crown size={32} className="mb-2 sm:mb-4 sm:h-10 sm:w-10" />
    //         <h3 className="font-semibold text-base sm:text-lg">Top Recruiter</h3>
    //         <p className="text-xs sm:text-sm">{topRecruiter ? `${topRecruiter.name} with ${topRecruiter.hires} hires!` : "No data available yet."}</p>
    //       </div>
    //     ),
    //     gradient: carouselThemes[0].gradient,
    //   },
    //   {
    //     content: (
    //       <div className="flex flex-col justify-center items-center h-full text-center text-white/90 px-2 sm:px-4">
    //         <Clock size={32} className="mb-2 sm:mb-4 sm:h-10 sm:w-10" />
    //         <h3 className="font-semibold text-base sm:text-lg">Average Time to Hire</h3>
    //         <p className="text-xs sm:text-sm">{avgTimeToHire?.avg_days ? `${avgTimeToHire.avg_days} days` : "No data available yet."}</p>
    //       </div>
    //     ),
    //     gradient: carouselThemes[1].gradient,
    //   },
    //   {
    //     content: (
    //       <div className="flex flex-col justify-center items-center h-full text-center text-white/90 px-2 sm:px-4">
    //         <CheckCheck size={32} className="mb-2 sm:mb-4 sm:h-10 sm:w-10" />
    //         <h3 className="font-semibold text-base sm:text-lg">Offer Acceptance Rate</h3>
    //         <p className="text-xs sm:text-sm">{acceptanceRate?.acceptance_rate ? `${(acceptanceRate.acceptance_rate * 100).toFixed(1)}%` : "No data available yet."}</p>
    //       </div>
    //     ),
    //     gradient: carouselThemes[2].gradient,
    //   },
    // ];

    // // Ensure at least 3 slides by adding fallbacks if necessary
    // while (slides.length < 3) {
    //   slides.push(fallbackSlides[slides.length % fallbackSlides.length]);
    // }

    return slides;
  }, [dashboardData, user, topRecruiter, avgTimeToHire, acceptanceRate]);

  return (
    <div className="min-h-screen bg-slate-50 p-2 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-8xl mx-auto space-y-4 sm:space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 tracking-tight">Hiring Suite Dashboard</h1>
        
        {/* --- ROW 1 --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
           <div className="lg:col-span-1">
            <DashboardHeroCarousel organizationId={organizationId} user={user} />
          </div>
          <ChartCard title="Hiring Funnel" description="Live candidates in main stages" isLoading={funnelLoading} className="sm:col-span-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 text-center">
              {(funnelCounts || []).map(stage => (
                <div className="p-3 sm:p-4 bg-slate-50 rounded-lg" key={stage.stage_name}>
                  <div className="mx-auto h-6 w-6 sm:h-8 sm:w-8 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: stage.stage_color ? `${stage.stage_color}20` : '#e2e8f0' }}>
                    <Target className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: stage.stage_color || '#64748b' }} />
                  </div>
                  <p className="text-lg sm:text-2xl font-bold">{stage.candidate_count}</p>
                  <p className="text-xs sm:text-sm text-gray-500">{stage.stage_name}</p>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* --- ROW 2 --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <ChartCard title="Top Jobs" description="By total candidate volume" isLoading={topJobsLoading} className="sm:col-span-2 lg:col-span-1">
            <div className="space-y-3 sm:space-y-4">
              {topJobs?.jobs.length > 0 ? topJobs.jobs.map((job, index) => (
                <div key={index}>
                  <div className="flex justify-between mb-1 text-xs sm:text-sm">
                    <p className="font-medium text-gray-700 truncate pr-2">{job.job_title}</p>
                    <p className="font-semibold text-gray-600">{job.candidate_count}</p>
                  </div>
                  <Progress value={(job.candidate_count / (topJobs.total || 1)) * 100} />
                </div>
              )) : <p className="text-center text-xs sm:text-sm text-gray-500 pt-6 sm:pt-8">No active jobs with candidates.</p>}
            </div>
          </ChartCard>

          <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <ChartCard title="Weekly EPFO Verifications" isLoading={weeklyActivityLoading}>
              <div className="text-lg sm:text-2xl font-bold mb-2">{weeklyActivity?.reduce((acc, day) => acc + Number(day.epfo_verifications), 0)}</div>
              <ResponsiveContainer width="100%" height={100} className="sm:h-[120px]">
                <BarChart data={weeklyActivity} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="day_name" axisLine={false} tickLine={false} className="text-[10px] sm:text-xs" />
                  <Tooltip cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} contentStyle={{ fontSize: '10px sm:12px', padding: '4px 8px' }} />
                  <Bar dataKey="epfo_verifications" name="EPFO" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Weekly AI Usage (Tokens)" isLoading={weeklyActivityLoading}>
              <div className="text-lg sm:text-2xl font-bold mb-2">{weeklyActivity?.reduce((acc, day) => acc + Number(day.gemini_tokens_used), 0).toLocaleString()}</div>
              <ResponsiveContainer width="100%" height={100} className="sm:h-[120px]">
                <BarChart data={weeklyActivity} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="day_name" axisLine={false} tickLine={false} className="text-[10px] sm:text-xs" />
                  <Tooltip cursor={{ fill: 'rgba(168, 85, 247, 0.1)' }} contentStyle={{ fontSize: '10px sm:12px', padding: '4px 8px' }} />
                  <Bar dataKey="gemini_tokens_used" name="Tokens" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
        
        {/* --- ROW 3 --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="sm:col-span-2">
            <CalendarCard employeeId={user.id} isHumanResourceEmployee={false} role={role} organizationId={organizationId} />
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <ChartCard title="Pipeline Hotspots" description="Candidates awaiting action the longest" isLoading={awaitingActionLoading} className="sm:col-span-2 lg:col-span-1">
              <ul className="space-y-3 sm:space-y-4">
                {awaitingAction?.length > 0 ? awaitingAction.map(candidate => (
                  <li key={candidate.candidate_name} className="flex items-center space-x-2 sm:space-x-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{candidate.candidate_name}</p>
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Badge style={{ backgroundColor: `${candidate.status_color}20`, color: candidate.status_color, border: `1px solid ${candidate.status_color}50` }}>
                          {candidate.status_name}
                        </Badge>
                        <span className="text-[10px] sm:text-xs text-gray-500 truncate">{candidate.job_title}</span>
                      </div>
                    </div>
                    <div className="flex items-center text-xs sm:text-sm text-gray-600">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 text-gray-400" />
                      {candidate.days_in_current_status} days
                    </div>
                  </li>
                )) : <p className="text-center text-xs sm:text-sm text-gray-500 pt-6 sm:pt-8">No bottlenecks found!</p>}
              </ul>
            </ChartCard>
          </div>
        
        </div>
      </div>
        <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-1 gap-4 sm:gap-6">

      <div className="w-full h-[300px] md:h-[325px] lg:h-[300px] mt-5">
                <SubmissionChartCard employeeId={employeeId} role={role} organizationId={organizationId} />
                {/* <OnboardingChartCard employeeId={employeeId} role={role} /> */}
              </div>
              </div>
    </div>
  );
};

export const SubmissionChartCard = CombinedSubmissionOnboardingChart;

export default HiringSuiteDashboard;