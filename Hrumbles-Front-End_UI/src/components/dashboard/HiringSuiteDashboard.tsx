import React, { useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Users,
  Briefcase,
  Clock,
  CheckCircle2,
  Coins,
  UserCheck,
} from "lucide-react";
import { motion } from "framer-motion";

// ── Existing components — DO NOT MODIFY ──
import CombinedSubmissionOnboardingChart from "@/components/employee/profile/cards/SubmissionChartCard";
import { ClientWorkflowChart } from "@/components/dashboard/chart/ClientWorkflowChart";
import { OrgGoalDashboardChart } from "@/components/dashboard/chart/OrgGoalDashboardChart";
import { DashboardHeroCarousel } from "@/components/dashboard/DashboardHeroCarousel";
import { CalendarCard } from "@/components/employee/profile/cards/CalendarCard";

// ── New components ──
import DashboardHeader from "./layout/DashboardHeader";
import CreditGauge from "./cards/CreditGauge";
import HiringFunnel from "./charts/HiringFunnel";
import CreditTrendChart from "./charts/CreditTrendChart";
import WeeklyActivityChart from "./charts/WeeklyActivityChart";
import SalesActivityWidget from "./cards/SalesActivityWidget";
import ContactsPipelineWidget from "./cards/ContactsPipelineWidget";
import CompaniesPipelineWidget from "./cards/CompaniesPipelineWidget";
import StageConversionChart from "./charts/StageConversionChart";

// ── Hooks ──
import { useCreditSummary, useCreditDailyTrend } from "./hooks/useCreditUsage";
import {
  useFunnelData,
  useTopRecruiters,
  useTopJobs,
  useWeeklyActivity,
  useHiringMetrics,
  useGeminiUsage,
  useActiveJobsCount,
  usePipelineCount,
} from "./hooks/useDashboardStats";

import { supabase } from "@/integrations/supabase/client";

// ─────────────────────────────────────────────────────────────────────────────
// HiringSuiteDashboard — Organization Superadmin View (Light Theme)
// ─────────────────────────────────────────────────────────────────────────────

const HiringSuiteDashboard: React.FC = () => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const user = useSelector((state: any) => state.auth.user);
  const role = useSelector((state: any) => state.auth.role) || user?.role || "superadmin";
  const queryClient = useQueryClient();
  const employeeId = user?.id || "";

  const [dateRange, setDateRange] = useState<{ from: string; to: string } | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);

  React.useEffect(() => {
    console.log("[HiringSuiteDashboard] organizationId:", organizationId);
  }, [organizationId]);

  // ── Organization info ──
  const { data: orgData } = useQuery({
    queryKey: ["org-info", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_organizations")
        // Added subscription_features to the selection query
        .select("credit_balance, name, subscription_features")
        .eq("id", organizationId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  // Extract the sales_suite flag from the JSONB feature column
  const isSalesSuiteEnabled = orgData?.subscription_features?.sales_suite === true;

  // ── Data hooks ──
  const { data: creditSummary } = useCreditSummary(organizationId, dateRange);
  const { data: creditTrend, isLoading: trendLoading } = useCreditDailyTrend(organizationId, 7);
  const { data: funnelData, isLoading: funnelLoading } = useFunnelData(organizationId);
  const { data: weeklyActivity, isLoading: activityLoading } = useWeeklyActivity(organizationId);
  const { avgTimeToHire, offerAcceptanceRate } = useHiringMetrics(organizationId);
  const { data: activeJobsCount } = useActiveJobsCount(organizationId);
  const { data: pipelineCount } = usePipelineCount(organizationId);
  const { data: topJobs } = useTopJobs(organizationId);

  // ── Derived ──
  const funnelTotal = (funnelData ||[]).reduce((s, f) => s + f.count, 0);
  const displayPipeline = pipelineCount ?? funnelTotal;
  const displayActiveJobs = activeJobsCount ?? topJobs?.length ?? 0;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries();
    setTimeout(() => setIsRefreshing(false), 800);
  }, [queryClient]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5">

        {/* ═══ HEADER ═══ */}
        <DashboardHeader
          organizationName={orgData?.name || "Organization"}
          onDateRangeChange={setDateRange}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        {/* ═══ ROW 0 — HERO CAROUSEL + KPI MINI-CARDS + CALENDAR ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-5 items-stretch">
          {/* LEFT — carousel stacked above 2×2 KPI grid */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="rounded-2xl overflow-hidden flex-shrink-0"
            >
              <DashboardHeroCarousel organizationId={organizationId} user={user} />
            </motion.div>

            {/* 2×2 KPI mini-cards to fill the void below carousel */}
            <div className="flex-1 grid grid-cols-2 gap-3">
              {[
                {
                  label: "Pipeline",
                  value: displayPipeline.toLocaleString(),
                  sub: "Candidates in funnel",
                  icon: <Users className="w-3.5 h-3.5" />,
                  accent: "#6366f1",
                  bg: "bg-indigo-50",
                },
                {
                  label: "Avg. Time to Hire",
                  value: `${Math.round(Number(avgTimeToHire) || 0)}d`,
                  sub: "Source to join",
                  icon: <Clock className="w-3.5 h-3.5" />,
                  accent: "#f59e0b",
                  bg: "bg-amber-50",
                },
                {
                  label: "Offer Accept",
                  value: `${Math.round(Number(offerAcceptanceRate) || 0)}%`,
                  sub: "Acceptance rate",
                  icon: <CheckCircle2 className="w-3.5 h-3.5" />,
                  accent: "#06b6d4",
                  bg: "bg-cyan-50",
                },
                {
                  label: "Credits Used",
                  value: (creditSummary?.total_consumed || 0).toLocaleString(),
                  sub: "Total consumption",
                  icon: <Coins className="w-3.5 h-3.5" />,
                  accent: "#a78bfa",
                  bg: "bg-violet-50",
                },
              ].map((kpi, i) => (
                <motion.div
                  key={kpi.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.06 }}
                  className="bg-white rounded-2xl border border-gray-100 p-3.5 flex flex-col justify-between relative overflow-hidden"
                  style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                >
                  {/* top accent line */}
                  <div
                    className="absolute top-0 left-3 right-3 h-[2px] rounded-full opacity-70"
                    style={{ backgroundColor: kpi.accent }}
                  />
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`flex items-center justify-center w-6 h-6 rounded-lg ${kpi.bg}`}
                      style={{ color: kpi.accent }}
                    >
                      {kpi.icon}
                    </div>
                    <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider leading-none">
                      {kpi.label}
                    </span>
                  </div>
                  <div>
                    <span
                      className="text-xl font-bold leading-none block"
                      style={{ color: kpi.accent }}
                    >
                      {kpi.value}
                    </span>
                    <span className="text-[9px] text-gray-400 mt-0.5 block truncate">{kpi.sub}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* RIGHT — Calendar full height */}
          <div className="lg:col-span-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden h-full"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <CalendarCard
                employeeId={employeeId}
                isHumanResourceEmployee={false}
                role={role}
                organizationId={organizationId}
              />
            </motion.div>
          </div>
        </div>

        {/* ═══ ROW 1 — FUNNEL + CREDIT GAUGE + TREND (all fixed 380px height) ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-5 items-start">
          <div className="lg:col-span-12">
            <HiringFunnel
              stages={funnelData ||[]}
              isLoading={funnelLoading}
              delay={0.15}
            />
          </div>
          {/* <div className="lg:col-span-3">
            <CreditGauge
              balance={orgData?.credit_balance || 0}
              totalConsumed={creditSummary?.total_consumed || 0}
              enrichmentUsed={creditSummary?.enrichment_used || 0}
              verificationUsed={creditSummary?.verification_used || 0}
              byEnrichmentType={creditSummary?.by_enrichment_type}
              byVerificationType={creditSummary?.by_verification_type}
              delay={0.2}
              isSalesSuiteEnabled={isSalesSuiteEnabled}
            />
          </div>
          <div className="lg:col-span-4">
            <CreditTrendChart
              data={creditTrend ||[]}
              isLoading={trendLoading}
              delay={0.25}
              isSalesSuiteEnabled={isSalesSuiteEnabled}
            />
          </div> */}
        </div>

        {/* ═══ ROW 2 — WEEKLY ACTIVITY (+ SALES ACTIVITY Conditionally) ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-5 items-stretch">
          {/* Automatically adjust column span based on Sales Suite availability */}
          <div className={isSalesSuiteEnabled ? "lg:col-span-8" : "lg:col-span-12"}>
            <WeeklyActivityChart
              data={weeklyActivity ||[]}
              isLoading={activityLoading}
              delay={0.2}
            />
          </div>
          {isSalesSuiteEnabled && (
            <div className="lg:col-span-4">
              <SalesActivityWidget delay={0.25} />
            </div>
          )}
        </div>

        {/* ═══ ROW 3 — CONTACTS PIPELINE + COMPANIES PIPELINE + STAGE CONVERSION (Only if Sales Suite Enabled) ═══ */}
        {isSalesSuiteEnabled && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-5">
            <div className="lg:col-span-4">
              <ContactsPipelineWidget delay={0.2} />
            </div>
            <div className="lg:col-span-4">
              <CompaniesPipelineWidget delay={0.25} />
            </div>
            <div className="lg:col-span-4">
              <StageConversionChart delay={0.3} />
            </div>
          </div>
        )}

        {/* ═══ ANALYTICS DIVIDER ═══ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.2em]">
              Analytics
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
          </div>

          {/* ═══ PRESERVED CHARTS — Full width stacked ═══ */}
          <div className="grid grid-cols-1 gap-4 mb-3">
            <div
              className="bg-white rounded-2xl border border-gray-100 p-4 overflow-hidden"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <ClientWorkflowChart organizationId={organizationId} />
            </div>

            <div
              className="bg-white rounded-2xl border border-gray-100 p-4 overflow-hidden"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <CombinedSubmissionOnboardingChart
                employeeId={employeeId}
                role={role}
                organizationId={organizationId}
              />
            </div>

            <div
              className="bg-white rounded-2xl border border-gray-100 p-4 overflow-hidden"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <OrgGoalDashboardChart organizationId={organizationId} />
            </div>
          </div>
        </motion.div>

        <div className="h-8" />
      </div>
    </div>
  );
};

export default HiringSuiteDashboard;