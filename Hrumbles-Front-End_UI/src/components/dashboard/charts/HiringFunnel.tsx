import React from "react";
import { motion } from "framer-motion";
import { FunnelStage } from "../hooks/useDashboardStats";
import { GitMerge, TrendingUp } from "lucide-react";

interface HiringFunnelProps {
  stages: FunnelStage[];
  isLoading?: boolean;
  delay?: number;
}

// Purple-spectrum gradients per stage — matches dashboard theme
const stageGradients: Record<string, { from: string; to: string }> = {
  "New Applicants": { from: "#7c3aed", to: "#a855f7" },
  "Processed":      { from: "#6d28d9", to: "#8b5cf6" },
  "Interview":      { from: "#4f46e5", to: "#818cf8" },
  "Offered":        { from: "#0891b2", to: "#22d3ee" },
  "Joined":         { from: "#059669", to: "#34d399" },
  // fallback
  default:          { from: "#94a3b8", to: "#cbd5e1" },
};

// Assign gradients by index when stage name not in map
const indexGradients = [
  { from: "#7c3aed", to: "#a855f7" },
  { from: "#6d28d9", to: "#8b5cf6" },
  { from: "#4f46e5", to: "#818cf8" },
  { from: "#7e22ce", to: "#c084fc" },
  { from: "#0891b2", to: "#22d3ee" },
  { from: "#059669", to: "#34d399" },
  { from: "#0e7490", to: "#67e8f9" },
];

const HiringFunnel: React.FC<HiringFunnelProps> = ({ stages, isLoading, delay = 0 }) => {
  const maxCount = Math.max(...(stages || []).map((s) => s.count), 1);
  const totalCount = (stages || []).reduce((s, f) => s + f.count, 0);

  if (isLoading) {
    return (
      <div
        className="bg-white rounded-2xl border border-purple-100/60 p-5 relative overflow-hidden"
        style={{
          boxShadow: "0 1px 3px rgba(109,40,217,0.06), 0 4px 20px rgba(109,40,217,0.04)",
          height: 380,
        }}
      >
        {/* Mesh bg */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 90% 10%, rgba(167,139,250,0.07) 0%, transparent 60%)",
          }}
        />
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-32 rounded-lg bg-purple-50" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-purple-50/60" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white rounded-2xl border border-purple-100/60 p-5 relative overflow-hidden"
      style={{
        boxShadow: "0 1px 3px rgba(109,40,217,0.06), 0 4px 20px rgba(109,40,217,0.04)",
        height: 380,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Subtle purple mesh background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 92% 8%, rgba(167,139,250,0.08) 0%, transparent 55%), radial-gradient(ellipse at 8% 92%, rgba(109,40,217,0.04) 0%, transparent 55%)",
        }}
      />

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4 relative z-10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-xl"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
          >
            <GitMerge className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-800 block">Hiring Funnel</span>
            <span className="text-[9px] text-purple-400 font-medium">Stage progression</span>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 border border-purple-100">
          <TrendingUp className="w-3 h-3 text-purple-400" />
          <span className="text-[10px] font-bold text-purple-600">{totalCount.toLocaleString()}</span>
        </div>
      </div>

      {/* ── Stage bars ── */}
      <div
        className="flex-1 space-y-8 overflow-y-auto min-h-0 relative z-10"
        style={{ scrollbarWidth: "none" }}
      >
        {(stages || []).map((stage, idx) => {
          const widthPct = (stage.count / maxCount) * 100;
          const prevCount = idx > 0 ? stages[idx - 1].count : stage.count;
          const rate = prevCount > 0 ? Math.round((stage.count / prevCount) * 100) : 100;
          const isIncrease = idx === 0 || stage.count >= prevCount;
          const grad =
            stageGradients[stage.stage] ||
            indexGradients[idx % indexGradients.length];

          return (
            <motion.div
              key={stage.stage}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: delay + 0.1 + idx * 0.07 }}
              className="group flex items-center gap-2.5"
            >
              {/* Stage label */}
              <div className="w-[72px] flex-shrink-0 text-right">
                <span className="text-[10px] font-medium text-gray-500 group-hover:text-gray-700 transition-colors leading-tight">
                  {stage.stage}
                </span>
              </div>

              {/* Bar track */}
              <div
                className="flex-1 h-8 rounded-xl overflow-hidden relative"
                style={{
                  background: `linear-gradient(90deg, ${grad.from}0d, ${grad.to}0a)`,
                  border: `1px solid ${grad.from}20`,
                }}
              >
                {/* Animated fill */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(widthPct, 4)}%` }}
                  transition={{
                    duration: 0.9,
                    delay: delay + 0.2 + idx * 0.08,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                  className="h-full rounded-xl relative"
                  style={{
                    background: `linear-gradient(135deg, ${grad.from}, ${grad.to})`,
                    boxShadow: `0 2px 8px ${grad.from}40`,
                  }}
                />
                {/* Count label always visible */}
                <div className="absolute inset-0 flex items-center px-3">
                  <span
                    className="text-[11px] font-bold drop-shadow-sm"
                    style={{
                      color: widthPct > 25 ? "white" : grad.from,
                    }}
                  >
                    {stage.count.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Conversion rate badge */}
              <div className="w-12 flex-shrink-0 text-right">
                {idx > 0 && (
                  <span
                    className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded-md"
                    style={{
                      background: isIncrease ? "rgba(5,150,105,0.08)" : "rgba(234,88,12,0.08)",
                      color: isIncrease ? "#059669" : "#ea580c",
                    }}
                  >
                    {rate}%{isIncrease ? "↑" : "↓"}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Overall conversion footer ── */}
      {stages.length >= 2 && stages[0].count > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 1.0 }}
          className="mt-3 pt-3 border-t border-purple-100/60 flex items-center justify-between relative z-10 flex-shrink-0"
        >
          <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">
            Overall Conversion
          </span>
          {/* Mini progress bar */}
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 rounded-full bg-purple-50 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${((stages[stages.length - 1].count / stages[0].count) * 100).toFixed(1)}%`,
                }}
                transition={{ duration: 1, delay: delay + 1.2 }}
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #7c3aed, #34d399)" }}
              />
            </div>
            <span className="text-sm font-bold text-emerald-600">
              {((stages[stages.length - 1].count / stages[0].count) * 100).toFixed(1)}%
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default HiringFunnel;