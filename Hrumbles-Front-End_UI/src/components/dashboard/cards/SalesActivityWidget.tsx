import React from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Mail, Calendar, Linkedin, Zap, ArrowUpRight } from "lucide-react";

interface SalesActivityWidgetProps {
  delay?: number;
}

const activityConfig = [
  { key: "call", label: "Calls", icon: Phone, color: "#f59e0b", bg: "bg-amber-50" },
  { key: "email", label: "Emails", icon: Mail, color: "#6366f1", bg: "bg-indigo-50" },
  { key: "meeting", label: "Meetings", icon: Calendar, color: "#10b981", bg: "bg-emerald-50" },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin, color: "#0a66c2", bg: "bg-blue-50" },
];

const SalesActivityWidget: React.FC<SalesActivityWidgetProps> = ({ delay = 0 }) => {
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-sales-summary", organizationId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

      const { data: rows, error } = await supabase
        .from("contact_activities")
        .select("type, is_completed")
        .eq("organization_id", organizationId)
        .neq("type", "stage_change")
        .gte("activity_date", thirtyDaysAgo);

      if (error) {
        console.error("[SalesActivityWidget] error:", error);
        throw error;
      }

      const counts: Record<string, number> = {};
      let total = 0;
      let completedTasks = 0;
      let totalTasks = 0;

      for (const row of rows || []) {
        counts[row.type] = (counts[row.type] || 0) + 1;
        total++;
        if (row.type === "task") {
          totalTasks++;
          if (row.is_completed) completedTasks++;
        }
      }

      return { counts, total, completedTasks, totalTasks };
    },
    enabled: !!organizationId,
    staleTime: 60_000,
  });

  const counts = data?.counts || {};
  const total = data?.total || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white rounded-2xl border border-gray-100 p-5 h-full flex flex-col"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 text-blue-500">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-700 block">Sales Activity</span>
            <span className="text-[9px] text-gray-400">Last 30 days</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xl font-bold text-gray-900">{total.toLocaleString()}</span>
          <span className="text-[9px] text-gray-400 block">total</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-xs text-gray-400">Loading...</div>
        </div>
      ) : (
        <div className="flex-1 space-y-2">
          {activityConfig.map((cfg, idx) => {
            const count = counts[cfg.key] || 0;
            const pct = total > 0 ? (count / total) * 100 : 0;
            const Icon = cfg.icon;

            return (
              <motion.div
                key={cfg.key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: delay + 0.15 + idx * 0.06 }}
                className="flex items-center gap-2.5"
              >
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-lg ${cfg.bg} flex-shrink-0`}
                  style={{ color: cfg.color }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] font-medium text-gray-600">{cfg.label}</span>
                    <span className="text-[11px] font-bold text-gray-800">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(pct, 2)}%` }}
                      transition={{ duration: 0.7, delay: delay + 0.3 + idx * 0.06 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: cfg.color }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Tasks completion mini row */}
          {(data?.totalTasks || 0) > 0 && (
            <div className="pt-2 mt-1 border-t border-gray-50 flex items-center justify-between">
              <span className="text-[10px] text-gray-400">Tasks completed</span>
              <span className="text-xs font-semibold text-emerald-600">
                {data?.completedTasks || 0}/{data?.totalTasks || 0}
              </span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default SalesActivityWidget;