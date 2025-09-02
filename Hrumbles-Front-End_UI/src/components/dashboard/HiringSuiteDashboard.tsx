// src/components/dashboard/HiringSuiteDashboard.tsx

import { useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Crown, Users, Target, Loader2, BrainCircuit, ShieldCheck, Briefcase, Clock } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { CalendarCard } from "../employee/profile/cards/CalendarCard"; // Ensure this path is correct
import { Badge } from "@/components/ui/badge";

// --- Reusable Component for Chart Cards ---
const ChartCard = ({ title, description, children, isLoading, className = "" }) => (
    <Card className={`shadow-md border-none bg-white h-full ${className}`}>
        <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-gray-700">{title}</CardTitle>
            {description && <CardDescription className="text-xs">{description}</CardDescription>}
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center h-[150px]"><Loader2 className="h-8 w-8 animate-spin text-indigo-600"/></div>
            ) : children}
        </CardContent>
    </Card>
);

// --- Main Dashboard Component ---
const HiringSuiteDashboard = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const { user, role } = useSelector((state: any) => state.auth);

  // --- Data Fetching Hooks ---

  const { data: topRecruiter, isLoading: topRecruiterLoading } = useQuery({
    queryKey: ['topRecruiterOfMonth', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_top_recruiter_of_month', { org_id: organizationId });
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!organizationId,
  });

// --- MODIFIED useQuery hook for funnelCounts ---
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

    // NEW: Fetch data for the Pipeline Hotspots card
  const { data: awaitingAction, isLoading: awaitingActionLoading } = useQuery({
    queryKey: ['candidatesAwaitingAction', organizationId],
    queryFn: async () => {
        const { data, error } = await supabase.rpc('get_candidates_awaiting_action', { org_id: organizationId, limit_count: 5 });
        if (error) throw error;
        return data;
    },
    enabled: !!organizationId,
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-9xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Hiring Suite Dashboard</h1>
        
        {/* --- ROW 1 --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
                <CardHeader><CardTitle className="text-xl">Recruiter of the Month!</CardTitle></CardHeader>
                <CardContent className="flex items-center justify-between">
                    {topRecruiterLoading ? <Loader2 className="h-8 w-8 animate-spin"/> :
                    topRecruiter ? (
                        <div><p className="text-3xl font-bold">{topRecruiter.recruiter_name}</p><p className="text-lg opacity-90">{topRecruiter.hires} Hires</p></div>
                    ) : <p>No hires recorded yet.</p>}
                    <Crown size={64} className="opacity-30" />
                </CardContent>
            </Card>
             <ChartCard title="Hiring Funnel" description="Live candidates in main stages" isLoading={funnelLoading} className="lg:col-span-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    {(funnelCounts || []).map(stage => (
                        <div className="p-4 bg-slate-50 rounded-lg" key={stage.stage_name}>
                            <div className="mx-auto h-8 w-8 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: stage.stage_color ? `${stage.stage_color}20` : '#e2e8f0' }}>
                                <Target className="h-5 w-5" style={{ color: stage.stage_color || '#64748b' }}/>
                            </div>
                            <p className="text-2xl font-bold">{stage.candidate_count}</p>
                            <p className="text-sm text-gray-500">{stage.stage_name}</p>
                        </div>
                    ))}
                </div>
            </ChartCard>
        </div>

        {/* --- ROW 2 --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ChartCard title="Top Jobs" description="By total candidate volume" isLoading={topJobsLoading} className="lg:col-span-1">
                <div className="space-y-4">
                    {topJobs?.jobs.length > 0 ? topJobs.jobs.map((job, index) => (
                        <div key={index}>
                            <div className="flex justify-between mb-1 text-sm">
                                <p className="font-medium text-gray-700 truncate pr-2">{job.job_title}</p>
                                <p className="font-semibold text-gray-600">{job.candidate_count}</p>
                            </div>
                            <Progress value={(job.candidate_count / (topJobs.total || 1)) * 100} />
                        </div>
                    )) : <p className="text-center text-sm text-gray-500 pt-8">No active jobs with candidates.</p>}
                </div>
            </ChartCard>

            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <ChartCard title="Weekly EPFO Verifications" isLoading={weeklyActivityLoading}>
                    <div className="text-2xl font-bold mb-2">{weeklyActivity?.reduce((acc, day) => acc + Number(day.epfo_verifications), 0)}</div>
                    <ResponsiveContainer width="100%" height={120}>
                        <BarChart data={weeklyActivity} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <XAxis dataKey="day_name" axisLine={false} tickLine={false} className="text-xs"/>
                            <Tooltip cursor={{fill: 'rgba(59, 130, 246, 0.1)'}} contentStyle={{ fontSize: '12px', padding: '4px 8px' }}/>
                            <Bar dataKey="epfo_verifications" name="EPFO" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
                <ChartCard title="Weekly AI Usage (Tokens)" isLoading={weeklyActivityLoading}>
                     <div className="text-2xl font-bold mb-2">{weeklyActivity?.reduce((acc, day) => acc + Number(day.gemini_tokens_used), 0).toLocaleString()}</div>
                    <ResponsiveContainer width="100%" height={120}>
                        <BarChart data={weeklyActivity} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <XAxis dataKey="day_name" axisLine={false} tickLine={false} className="text-xs"/>
                            <Tooltip cursor={{fill: 'rgba(168, 85, 247, 0.1)'}} contentStyle={{ fontSize: '12px', padding: '4px 8px' }}/>
                            <Bar dataKey="gemini_tokens_used" name="Tokens" fill="#a855f7" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </div>
        
        {/* --- ROW 3 --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                {/* Placeholder for a future large chart, or you can add more small cards here */}
                <ChartCard title="Pipeline Hotspots" description="Candidates awaiting action the longest" isLoading={awaitingActionLoading} className="lg:col-span-1">
                <ul className="space-y-4">
                    {awaitingAction?.length > 0 ? awaitingAction.map(candidate => (
                        <li key={candidate.candidate_name} className="flex items-center space-x-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{candidate.candidate_name}</p>
                                <div className="flex items-center gap-2">
                                    <Badge style={{ backgroundColor: `${candidate.status_color}20`, color: candidate.status_color, border: `1px solid ${candidate.status_color}50` }}>
                                        {candidate.status_name}
                                    </Badge>
                                    <span className="text-xs text-gray-500 truncate">{candidate.job_title}</span>
                                </div>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                                <Clock className="h-4 w-4 mr-1.5 text-gray-400"/>
                                {candidate.days_in_current_status} days
                            </div>
                        </li>
                    )) : <p className="text-center text-sm text-gray-500 pt-8">No bottlenecks found!</p>}
                </ul>
            </ChartCard>
            </div>
            <div className="lg:col-span-2">
                <CalendarCard employeeId={user.id} isHumanResourceEmployee={false} role={role} organizationId={organizationId}/>
            </div>
        </div>

      </div>
    </div>
  );
};

export default HiringSuiteDashboard;