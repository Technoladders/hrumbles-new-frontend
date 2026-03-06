import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { supabase } from "@/integrations/supabase/client";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { GitBranch, Users, Building2, TrendingUp, Clock } from "lucide-react";

interface StageConversionChartProps {
  delay?: number;
}

type TabType = "contacts" | "companies";
type ViewType = "velocity" | "funnel";

// Contact stages in order
const CONTACT_STAGE_ORDER = [
  "Identified",
  "Contacted",
  "In Progress (Outreach Ongoing)",
  "Engaged",
  "Qualified",
  "In Discussion",
  "Proposal Sent",
  "Referred to Company",
  "Follow-up Scheduled",
  "Converted",
  "Dropped / Not a Fit",
];

// Company stages in order
const COMPANY_STAGE_ORDER = [
  "Identified",
  "Targeting",
  "In Outreach",
  "Warm",
  "Qualified Company",
  "Proposal Sent / In Discussion",
  "Negotiation",
  "Closed - Won",
  "Closed - Lost",
  "Re-engage Later",
];

const CONTACT_COLORS = [
  "#7c3aed", "#6d28d9", "#5b21b6", "#4f46e5",
  "#7e22ce", "#9333ea", "#a21caf", "#0891b2",
  "#0e7490", "#059669", "#dc2626",
];

const COMPANY_COLORS = [
  "#4f46e5", "#6d28d9", "#7c3aed", "#0891b2",
  "#0e7490", "#7e22ce", "#f59e0b", "#059669",
  "#dc2626", "#9333ea",
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-purple-100 bg-white p-2.5 shadow-lg text-xs z-50">
      <p className="font-semibold text-gray-700 mb-1.5 truncate max-w-[160px]">{label}</p>
      {payload.map((e: any) => (
        <div key={e.dataKey} className="flex items-center gap-1.5 mb-0.5">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
          <span className="text-gray-500 capitalize truncate max-w-[100px]">{e.name}:</span>
          <span className="font-bold text-gray-800 ml-auto">{e.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

const StageConversionChart: React.FC<StageConversionChartProps> = ({ delay = 0 }) => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const [activeTab, setActiveTab] = useState<TabType>("contacts");
  const [view, setView] = useState<ViewType>("funnel");

  // ── Contact stage history ──
  const { data: contactHistory, isLoading: contactLoading } = useQuery({
    queryKey: ["contact-stage-history", organizationId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data, error } = await supabase
        .from("contact_stage_history")
        .select("stage_name, changed_at")
        .eq("organization_id", organizationId)
        .gte("changed_at", thirtyDaysAgo)
        .order("changed_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
    staleTime: 60_000,
  });

  // ── Company status history ──
  const { data: companyHistory, isLoading: companyLoading } = useQuery({
    queryKey: ["company-status-history", organizationId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data, error } = await supabase
        .from("company_status_history")
        .select("status_name, changed_at")
        .eq("organization_id", organizationId)
        .gte("changed_at", thirtyDaysAgo)
        .order("changed_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!organizationId,
    staleTime: 60_000,
  });

  // ── Build funnel data (stage counts from history) ──
  const buildFunnelData = (
    history: { stage_name?: string; status_name?: string; changed_at: string }[],
    stageOrder: string[],
    colors: string[]
  ) => {
    const counts: Record<string, number> = {};
    for (const row of history) {
      const stage = (row.stage_name || row.status_name || "").trim();
      if (stage) counts[stage] = (counts[stage] || 0) + 1;
    }
    return stageOrder
      .map((stage, idx) => ({
        stage: stage.length > 18 ? stage.slice(0, 17) + "…" : stage,
        fullName: stage,
        count: counts[stage] || 0,
        color: colors[idx % colors.length],
      }))
      .filter((s) => s.count > 0);
  };

  // ── Build velocity data (changes per day) ──
  const buildVelocityData = (
    history: { stage_name?: string; status_name?: string; changed_at: string }[]
  ) => {
    const byDay: Record<string, number> = {};
    for (const row of history) {
      const day = new Date(row.changed_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      byDay[day] = (byDay[day] || 0) + 1;
    }
    return Object.entries(byDay)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([day, changes]) => ({ day, changes }));
  };

  const contactFunnelData = buildFunnelData(
    (contactHistory || []) as any,
    CONTACT_STAGE_ORDER,
    CONTACT_COLORS
  );
  const companyFunnelData = buildFunnelData(
    (companyHistory || []) as any,
    COMPANY_STAGE_ORDER,
    COMPANY_COLORS
  );

  const contactVelocityData = buildVelocityData((contactHistory || []) as any);
  const companyVelocityData = buildVelocityData((companyHistory || []) as any);

  const isContacts = activeTab === "contacts";
  const funnelData = isContacts ? contactFunnelData : companyFunnelData;
  const velocityData = isContacts ? contactVelocityData : companyVelocityData;
  const isLoading = isContacts ? contactLoading : companyLoading;
  const totalChanges = (isContacts ? contactHistory : companyHistory)?.length || 0;
  const colors = isContacts ? CONTACT_COLORS : COMPANY_COLORS;

  // Conversion rate: last stage vs first stage
  const firstCount = funnelData[0]?.count || 0;
  const lastPositiveCount =
    funnelData.filter((d) => !d.fullName.includes("Lost") && !d.fullName.includes("Dropped")).at(-1)?.count || 0;
  const conversionRate = firstCount > 0 ? Math.round((lastPositiveCount / firstCount) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white rounded-2xl border border-purple-100/60 p-5 relative overflow-hidden h-[400px]"
      style={{ boxShadow: "0 1px 3px rgba(109,40,217,0.06), 0 4px 24px rgba(109,40,217,0.04)" }}
    >
      {/* Background mesh */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 95% 5%, rgba(167,139,250,0.07) 0%, transparent 50%), radial-gradient(ellipse at 5% 95%, rgba(79,70,229,0.05) 0%, transparent 50%)",
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-xl"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
          >
            <GitBranch className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-800 block">Stage Conversion</span>
            <span className="text-[9px] text-purple-400 font-medium">Last 30 days · history log</span>
          </div>
        </div>

        {/* Summary chips */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 border border-purple-100">
            <Clock className="w-3 h-3 text-purple-400" />
            <span className="text-[10px] font-bold text-purple-600">{totalChanges} moves</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-100">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span className="text-[10px] font-bold text-emerald-600">{conversionRate}%</span>
          </div>
        </div>
      </div>

      {/* Tab + View switcher */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        {/* Entity tabs */}
        <div className="flex bg-gray-50 rounded-xl p-0.5 border border-gray-100 gap-0.5">
          {(["contacts", "companies"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
                activeTab === tab
                  ? "text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
              style={
                activeTab === tab
                  ? { background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }
                  : {}
              }
            >
              {tab === "contacts" ? (
                <Users className="w-3 h-3" />
              ) : (
                <Building2 className="w-3 h-3" />
              )}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* View switcher */}
        <div className="flex bg-gray-50 rounded-xl p-0.5 border border-gray-100 gap-0.5">
          {(["funnel", "velocity"] as ViewType[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
                view === v
                  ? "bg-white text-purple-700 shadow-sm border border-purple-100"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-72 flex items-center justify-center"
          >
            <div className="animate-pulse text-xs text-purple-300 font-medium">Loading stage data…</div>
          </motion.div>
        ) : view === "funnel" ? (
          <motion.div
            key={`funnel-${activeTab}`}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25 }}
          >
            {funnelData.length === 0 ? (
              <div className="h-72 flex items-center justify-center">
                <span className="text-xs text-gray-300">No stage changes in the last 30 days</span>
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} layout="vertical" barSize={12} margin={{ left: 0, right: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fill: "#94a3b8" }}
                    />
                    <YAxis
                      type="category"
                      dataKey="stage"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fill: "#64748b" }}
                      width={110}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(124,58,237,0.03)" }} />
                    <Bar
                      dataKey="count"
                      name="Stage moves"
                      radius={[0, 6, 6, 0]}
                      label={(props: any) => {
  const { x, y, width, height, value, index } = props;
  if (!value) return null;
  const color = funnelData[index]?.color || "#7c3aed";
  return (
    <text
      x={x + width + 6}
      y={y + height / 2 + 1}
      fill={color}
      fontSize={9}
      fontWeight={700}
      dominantBaseline="middle"
    >
      {value}
    </text>
  );
}}
                    >
                     {funnelData.map((entry, idx) => (
  <Cell key={`cell-${idx}`} fill={entry.color} />
))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key={`velocity-${activeTab}`}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25 }}
          >
            {velocityData.length === 0 ? (
              <div className="h-72 flex items-center justify-center">
                <span className="text-xs text-gray-300">No activity in the last 30 days</span>
              </div>
            ) : (
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={velocityData}>
                    <defs>
                      <linearGradient id="velGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.18} />
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fill: "#94a3b8" }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 9, fill: "#94a3b8" }}
                      width={28}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="changes"
                      name="Stage moves"
                      stroke="#7c3aed"
                      fill="url(#velGrad)"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#7c3aed", strokeWidth: 0 }}
                      activeDot={{ r: 5, fill: "#7c3aed" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer stage legend (funnel view only) */}
      {view === "funnel" && funnelData.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.8 }}
          className="mt-3 pt-3 border-t border-purple-100/60 relative z-10"
        >
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {funnelData.slice(0, 6).map((stage) => (
              <div key={stage.fullName} className="flex items-center gap-1">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="text-[9px] text-gray-400 truncate" style={{ maxWidth: 100 }}>
                  {stage.stage}
                </span>
                <span className="text-[9px] font-bold" style={{ color: stage.color }}>
                  {stage.count}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default StageConversionChart;
// final