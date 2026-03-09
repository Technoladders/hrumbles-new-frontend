import React from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { supabase } from "@/integrations/supabase/client";
import { Building2, TrendingUp, Sparkles } from "lucide-react";

interface CompaniesPipelineWidgetProps {
  delay?: number;
}

const COMPANY_STAGES = [
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

// Purple-to-teal gradient spectrum per stage
const stageGradients: Record<string, [string, string]> = {
  "Identified":                      ["#7c3aed", "#a855f7"],
  "Targeting":                       ["#6d28d9", "#8b5cf6"],
  "In Outreach":                     ["#4f46e5", "#818cf8"],
  "Warm":                            ["#7e22ce", "#c084fc"],
  "Qualified Company":               ["#0891b2", "#22d3ee"],
  "Proposal Sent / In Discussion":   ["#0e7490", "#67e8f9"],
  "Negotiation":                     ["#f59e0b", "#fcd34d"],
  "Closed - Won":                    ["#059669", "#34d399"],
  "Closed - Lost":                   ["#dc2626", "#f87171"],
  "Re-engage Later":                 ["#9333ea", "#e879f9"],
};

const CompaniesPipelineWidget: React.FC<CompaniesPipelineWidgetProps> = ({ delay = 0 }) => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-companies-pipeline", organizationId],
    queryFn: async () => {
      // Total companies
      const { count: totalCompanies } = await supabase
        .from("companies")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId);

      // New companies (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { count: newCompanies } = await supabase
        .from("companies")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .gte("created_at", thirtyDaysAgo);

      // Stage breakdown
      const { data: stageData } = await supabase
        .from("companies")
        .select("stage")
        .eq("organization_id", organizationId);

      const stageCounts: Record<string, number> = {};
      for (const row of stageData || []) {
        const stage = (row.stage || "Identified").trim();
        stageCounts[stage] = (stageCounts[stage] || 0) + 1;
      }

      // Won count for conversion metric
      const wonCount = stageCounts["Closed - Won"] || 0;
      const lostCount = stageCounts["Closed - Lost"] || 0;

      return {
        total: totalCompanies || 0,
        new: newCompanies || 0,
        stageCounts,
        wonCount,
        lostCount,
      };
    },
    enabled: !!organizationId,
    staleTime: 60_000,
  });

  const total = data?.total || 0;
  const stageCounts = data?.stageCounts || {};
  const maxCount = Math.max(...COMPANY_STAGES.map((s) => stageCounts[s] || 0), 1);
  const winRate =
    (data?.wonCount || 0) + (data?.lostCount || 0) > 0
      ? Math.round(((data?.wonCount || 0) / ((data?.wonCount || 0) + (data?.lostCount || 0))) * 100)
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white rounded-2xl border border-indigo-100/60 p-5 h-full flex flex-col relative overflow-hidden"
      style={{ boxShadow: "0 1px 3px rgba(79,70,229,0.06), 0 4px 20px rgba(79,70,229,0.04)" }}
    >
      {/* Mesh background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 85% 15%, rgba(129,140,248,0.08) 0%, transparent 55%), radial-gradient(ellipse at 15% 85%, rgba(79,70,229,0.05) 0%, transparent 55%)",
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-xl"
            style={{ background: "linear-gradient(135deg, #4f46e5, #818cf8)" }}
          >
            <Building2 className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-800 block">Companies Pipeline</span>
            <span className="text-[9px] text-indigo-400 font-medium">Stage breakdown</span>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 border border-indigo-100">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span className="text-[10px] font-bold text-indigo-600">{total.toLocaleString()}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-2 mb-4 relative z-10">
        <div
          className="flex-1 p-2.5 rounded-xl text-center border border-indigo-100/80"
          style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.06), rgba(129,140,248,0.04))" }}
        >
          <Building2 className="w-3.5 h-3.5 text-indigo-500 mx-auto mb-0.5" />
          <span className="block text-lg font-bold text-gray-900 leading-none">
            {total.toLocaleString()}
          </span>
          <span className="text-[8px] text-indigo-400 uppercase font-semibold tracking-wide">Total</span>
        </div>
        <div
          className="flex-1 p-2.5 rounded-xl text-center border border-emerald-100/80"
          style={{ background: "linear-gradient(135deg, rgba(5,150,105,0.06), rgba(52,211,153,0.04))" }}
        >
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500 mx-auto mb-0.5" />
          <span className="block text-lg font-bold text-gray-900 leading-none">
            +{(data?.new || 0).toLocaleString()}
          </span>
          <span className="text-[8px] text-emerald-400 uppercase font-semibold tracking-wide">30d New</span>
        </div>
        <div
          className="flex-1 p-2.5 rounded-xl text-center border border-violet-100/80"
          style={{ background: "linear-gradient(135deg, rgba(5,150,105,0.06), rgba(52,211,153,0.04))" }}
        >
          <span className="block text-lg font-bold text-emerald-600 leading-none mt-1">
            {winRate}%
          </span>
          <span className="text-[8px] text-violet-400 uppercase font-semibold tracking-wide">Win Rate</span>
        </div>
      </div>

      {/* Stage bars */}
      {isLoading ? (
        <div className="flex-1 space-y-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex items-center gap-2 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-indigo-100 flex-shrink-0" />
              <div className="w-24 h-2.5 rounded bg-indigo-50 flex-shrink-0" />
              <div className="flex-1 h-2 rounded-full bg-indigo-50" />
              <div className="w-5 h-2.5 rounded bg-indigo-50" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 space-y-1.5 overflow-y-auto relative z-10" style={{ maxHeight: 280 }}>
          {COMPANY_STAGES.map((stageName, idx) => {
            const count = stageCounts[stageName] || 0;
            const pct = (count / maxCount) * 100;
            const [gradFrom, gradTo] = stageGradients[stageName] || ["#7c3aed", "#a855f7"];

            return (
              <motion.div
                key={stageName}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: delay + 0.15 + idx * 0.04 }}
                className="group flex items-center gap-2"
              >
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: gradFrom }}
                />
                <span
                  className="text-[10px] text-gray-500 flex-shrink-0 truncate group-hover:text-gray-700 transition-colors"
                  style={{ width: 130 }}
                  title={stageName}
                >
                  {stageName}
                </span>
                <div className="flex-1 h-2 rounded-full bg-indigo-50/80 overflow-hidden border border-indigo-100/40">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(pct, count > 0 ? 3 : 0)}%` }}
                    transition={{ duration: 0.7, delay: delay + 0.25 + idx * 0.04, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${gradFrom}, ${gradTo})`,
                      boxShadow: count > 0 ? `0 0 6px ${gradFrom}40` : "none",
                    }}
                  />
                </div>
                <span
                  className="text-[10px] font-bold flex-shrink-0 w-7 text-right"
                  style={{ color: count > 0 ? gradFrom : "#d1d5db" }}
                >
                  {count}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {!isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 1.0 }}
          className="mt-3 pt-3 border-t border-indigo-100/60 flex items-center justify-between relative z-10"
        >
          <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">
            {COMPANY_STAGES.length} Stages
          </span>
          {/* Mini segmented bar */}
          <div className="flex gap-0.5 h-2 rounded-full overflow-hidden" style={{ width: 80 }}>
            {COMPANY_STAGES.map((s, i) => {
              const count = stageCounts[s] || 0;
              const pct = total > 0 ? (count / total) * 100 : 0;
              const [gf] = stageGradients[s] || ["#7c3aed"];
              return (
                <div
                  key={s}
                  style={{ width: `${Math.max(pct, 0.5)}%`, backgroundColor: gf }}
                  className="h-full"
                />
              );
            })}
          </div>
          <span className="text-[9px] font-bold text-indigo-600">{total.toLocaleString()} total</span>
        </motion.div>
      )}
    </motion.div>
  );
};

export default CompaniesPipelineWidget;