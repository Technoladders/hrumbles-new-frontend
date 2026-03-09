import React from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserPlus, Sparkles } from "lucide-react";

interface ContactsPipelineWidgetProps {
  delay?: number;
}

// Purple-spectrum gradient mapping for stage bars
const purpleGradients = [
  ["#7c3aed", "#a855f7"],
  ["#6d28d9", "#8b5cf6"],
  ["#5b21b6", "#7c3aed"],
  ["#4c1d95", "#6d28d9"],
  ["#7e22ce", "#c084fc"],
  ["#9333ea", "#d946ef"],
  ["#a21caf", "#e879f9"],
  ["#86198f", "#c026d3"],
  ["#701a75", "#a855f7"],
  ["#6b21a8", "#e879f9"],
  ["#4a044e", "#a855f7"],
];

const ContactsPipelineWidget: React.FC<ContactsPipelineWidgetProps> = ({ delay = 0 }) => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  // Fetch dynamic stages from contact_statuses table
  // Fetch dynamic stages from actual contact_stage values (no contact_statuses table needed)
  const { data: stagesConfig = [] } = useQuery({
    queryKey: ["contact-stages-config", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("contact_stage")
        .eq("organization_id", organizationId)
        .not("contact_stage", "is", null);   // exclude null/empty

      if (error) throw error;

      const stageMap = new Map<string, number>();

      (data || []).forEach((row) => {
        const stage = (row.contact_stage || "").trim();
        if (stage) {
          stageMap.set(stage, (stageMap.get(stage) || 0) + 1);
        }
      });

      // Sort by most contacts first → best UX
      return Array.from(stageMap.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([name], index) => ({
          id: index,
          name,
          color: purpleGradients[index % purpleGradients.length][0], // use your existing palette
          display_order: index,
        }));
    },
    enabled: !!organizationId,
    staleTime: 180_000, // 3 minutes
  });

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-contacts-pipeline", organizationId],
    queryFn: async () => {
      // Total contacts
      const { count: totalContacts } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId);

      // New contacts (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { count: newContacts } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .gte("created_at", thirtyDaysAgo);

      // Stage breakdown — using contact_status_id joined to name
      const { data: stageData } = await supabase
        .from("contacts")
        .select("contact_stage")
        .eq("organization_id", organizationId);

      const stageCounts: Record<string, number> = {};
      for (const row of stageData || []) {
        const stage = (row.contact_stage || "").trim();
        if (stage) stageCounts[stage] = (stageCounts[stage] || 0) + 1;
      }

      return {
        total: totalContacts || 0,
        new: newContacts || 0,
        stageCounts,
      };
    },
    enabled: !!organizationId,
    staleTime: 60_000,
  });

  const stages = stagesConfig;
  const total = data?.total || 0;
  const stageCounts = data?.stageCounts || {};
  const maxCount = Math.max(...stages.map((s) => stageCounts[s.name] || 0), 1);

  // Top 3 stages for the summary chips
  const topStages = [...stages]
    .map((s) => ({ ...s, count: stageCounts[s.name] || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white rounded-2xl border border-purple-100/60 p-5 h-full flex flex-col relative overflow-hidden"
      style={{ boxShadow: "0 1px 3px rgba(109,40,217,0.06), 0 4px 20px rgba(109,40,217,0.04)" }}
    >
      {/* Subtle purple mesh background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 90% 10%, rgba(167,139,250,0.07) 0%, transparent 60%), radial-gradient(ellipse at 10% 90%, rgba(109,40,217,0.05) 0%, transparent 55%)",
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-xl"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
          >
            <Users className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-800 block">Contacts Pipeline</span>
            <span className="text-[9px] text-purple-400 font-medium">Live stage breakdown</span>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 border border-purple-100">
          <Sparkles className="w-3 h-3 text-purple-400" />
          <span className="text-[10px] font-bold text-purple-600">{total.toLocaleString()}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-2 mb-4 relative z-10">
        <div
          className="flex-1 p-2.5 rounded-xl text-center border border-purple-100/80"
          style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.06), rgba(168,85,247,0.04))" }}
        >
          <Users className="w-3.5 h-3.5 text-purple-500 mx-auto mb-0.5" />
          <span className="block text-lg font-bold text-gray-900 leading-none">
            {total.toLocaleString()}
          </span>
          <span className="text-[8px] text-purple-400 uppercase font-semibold tracking-wide">Total</span>
        </div>
        <div
          className="flex-1 p-2.5 rounded-xl text-center border border-emerald-100/80"
          style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.06), rgba(52,211,153,0.04))" }}
        >
          <UserPlus className="w-3.5 h-3.5 text-emerald-500 mx-auto mb-0.5" />
          <span className="block text-lg font-bold text-gray-900 leading-none">
            +{(data?.new || 0).toLocaleString()}
          </span>
          <span className="text-[8px] text-emerald-400 uppercase font-semibold tracking-wide">30d New</span>
        </div>
        {topStages[0] && (
          <div
            className="flex-1 p-2.5 rounded-xl text-center border border-violet-100/80 hidden sm:flex flex-col items-center"
            style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.06), rgba(196,181,253,0.04))" }}
          >
            <div className="w-3.5 h-3.5 rounded-full mx-auto mb-0.5 mt-0.5" style={{ backgroundColor: topStages[0].color }} />
            <span className="block text-lg font-bold text-gray-900 leading-none">
              {topStages[0].count.toLocaleString()}
            </span>
            <span className="text-[8px] text-violet-400 uppercase font-semibold tracking-wide truncate w-full text-center">
              {topStages[0].name.split(" ")[0]}
            </span>
          </div>
        )}
      </div>

      {/* Stage bars */}
      {isLoading || !stagesConfig ? (
        <div className="flex-1 space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-2 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-purple-100 flex-shrink-0" />
              <div className="w-20 h-2.5 rounded bg-purple-50 flex-shrink-0" />
              <div className="flex-1 h-2 rounded-full bg-purple-50" />
              <div className="w-5 h-2.5 rounded bg-purple-50" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 space-y-1.5 overflow-y-auto relative z-10" style={{ maxHeight: 280 }}>
          {stages.map((stage, idx) => {
            const count = stageCounts[stage.name] || 0;
            const pct = (count / maxCount) * 100;
            const [gradFrom, gradTo] = purpleGradients[idx % purpleGradients.length];

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: delay + 0.15 + idx * 0.04 }}
                className="group flex items-center gap-2"
              >
                {/* Color dot */}
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: gradFrom }}
                />

                {/* Stage label */}
                <span
                  className="text-[10px] text-gray-500 flex-shrink-0 truncate group-hover:text-gray-700 transition-colors"
                  style={{ width: 120 }}
                  title={stage.name}
                >
                  {stage.name}
                </span>

                {/* Progress bar */}
                <div className="flex-1 h-2 rounded-full bg-purple-50/80 overflow-hidden border border-purple-100/40">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(pct, count > 0 ? 3 : 0)}%` }}
                    transition={{ duration: 0.7, delay: delay + 0.25 + idx * 0.04, ease: "easeOut" }}
                    className="h-full rounded-full relative"
                    style={{
                      background: `linear-gradient(90deg, ${gradFrom}, ${gradTo})`,
                      boxShadow: count > 0 ? `0 0 6px ${gradFrom}40` : "none",
                    }}
                  />
                </div>

                {/* Count badge */}
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

      {/* Footer total bar */}
      {!isLoading && stages.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.9 }}
          className="mt-3 pt-3 border-t border-purple-100/60 flex items-center justify-between relative z-10"
        >
          <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">
            {stages.length} Active Stages
          </span>
          <div className="flex gap-0.5 h-2 rounded-full overflow-hidden" style={{ width: 80 }}>
            {stages.slice(0, 8).map((s, i) => {
              const count = stageCounts[s.name] || 0;
              const pct = total > 0 ? (count / total) * 100 : 0;
              const [gf] = purpleGradients[i % purpleGradients.length];
              return (
                <div
                  key={s.id}
                  style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: gf }}
                  className="h-full"
                />
              );
            })}
          </div>
          <span className="text-[9px] font-bold text-purple-600">{total.toLocaleString()} total</span>
        </motion.div>
      )}
    </motion.div>
  );
};

export default ContactsPipelineWidget;