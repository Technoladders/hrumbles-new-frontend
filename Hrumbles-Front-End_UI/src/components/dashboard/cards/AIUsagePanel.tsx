import React from "react";
import { motion } from "framer-motion";
import { Brain, Zap } from "lucide-react";

interface AIUsagePanelProps {
  totalInput: number;
  totalOutput: number;
  totalCalls: number;
  byType: Record<string, number>;
  isLoading?: boolean;
  delay?: number;
}

const fmt = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
};

const typeColors = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#06b6d4", "#a78bfa", "#f97316"];

const AIUsagePanel: React.FC<AIUsagePanelProps> = ({
  totalInput,
  totalOutput,
  totalCalls,
  byType,
  isLoading,
  delay = 0,
}) => {
  const entries = Object.entries(byType || {}).sort((a, b) => b[1] - a[1]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white rounded-2xl border border-gray-100 p-5 h-full"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-pink-50 text-pink-500">
          <Brain className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="text-xs font-semibold text-gray-700 block">AI Usage</span>
          <span className="text-[9px] text-gray-400">Gemini token consumption</span>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-8 rounded bg-gray-50" />
          <div className="h-8 rounded bg-gray-50" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: "Input", value: totalInput, color: "indigo" },
              { label: "Output", value: totalOutput, color: "emerald" },
              { label: "Calls", value: totalCalls, color: "amber" },
            ].map((item) => (
              <div
                key={item.label}
                className="text-center p-2.5 rounded-xl bg-gray-50/80 border border-gray-100"
              >
                <Zap className={`w-3 h-3 text-${item.color}-500 mx-auto mb-0.5`} />
                <span className="block text-base font-bold text-gray-900">
                  {item.label === "Calls" ? item.value.toLocaleString() : fmt(item.value)}
                </span>
                <span className="text-[8px] text-gray-400 uppercase">{item.label}</span>
              </div>
            ))}
          </div>

          {entries.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[9px] text-gray-400 uppercase tracking-wider font-medium">
                By Type
              </span>
              {entries.slice(0, 5).map(([type, count], idx) => (
                <div key={type} className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: typeColors[idx % typeColors.length] }}
                  />
                  <span className="text-[10px] text-gray-500 flex-1 truncate capitalize">
                    {type.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] font-semibold text-gray-700">{count}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default AIUsagePanel;