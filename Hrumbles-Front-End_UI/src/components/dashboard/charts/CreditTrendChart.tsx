import React from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, Sparkles } from "lucide-react";
import { DailyTrend } from "../hooks/useCreditUsage";

interface CreditTrendChartProps {
  data: DailyTrend[];
  isLoading?: boolean;
  delay?: number;
  isSalesSuiteEnabled?: boolean; // ── NEW PROP ──
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl border bg-white p-3 shadow-lg text-xs"
      style={{ borderColor: "rgba(124,58,237,0.15)", boxShadow: "0 4px 20px rgba(124,58,237,0.1)" }}
    >
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((e: any) => (
        <div key={e.dataKey} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
          <span className="text-gray-500">{e.name}:</span>
          <span className="font-bold ml-auto pl-3" style={{ color: e.color }}>
            {e.value?.toLocaleString()}
          </span>
        </div>
      ))}
      {payload.length > 1 && (
        <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex items-center justify-between">
          <span className="text-gray-400">Total</span>
          <span className="font-bold text-purple-700">
            {payload.reduce((s: number, e: any) => s + (e.value || 0), 0).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
};

// Custom bar shape with rounded top only on the top-most stacked bar
const RoundedBar = (props: any) => {
  const { x, y, width, height, fill, isTop } = props;
  if (!height || height <= 0) return null;
  const r = isTop ? 4 : 0;
  return (
    <path
      d={`M${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} L${x},${y + height} Z`}
      fill={fill}
    />
  );
};

const CreditTrendChart: React.FC<CreditTrendChartProps> = ({ 
  data, 
  isLoading, 
  delay = 0,
  isSalesSuiteEnabled = true, // default to true
}) => {
  
  // Recalculate display totals based on active modules
  const chartData = (data ||[]).map((d) => {
    const displayTotal = isSalesSuiteEnabled 
      ? (d.total_credits || 0) 
      : (d.verification_credits || 0);

    return {
      ...d,
      date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      displayTotal,
    };
  });

  const totalCredits = chartData.reduce((s, d) => s + (d.displayTotal || 0), 0);
  const avgDaily = chartData.length > 0 ? Math.round(totalCredits / chartData.length) : 0;
  
  const maxDay = chartData.reduce(
    (max, d) => ((d.displayTotal || 0) > (max.displayTotal || 0) ? d : max),
    chartData[0] || { displayTotal: 0 }
  );

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
      {/* Subtle mesh background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 95% 5%, rgba(129,140,248,0.08) 0%, transparent 55%), radial-gradient(ellipse at 5% 95%, rgba(34,211,238,0.05) 0%, transparent 55%)",
        }}
      />

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4 relative z-10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-xl"
            style={{ background: "linear-gradient(135deg, #6366f1, #22d3ee)" }}
          >
            <TrendingUp className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <span className="text-xs font-semibold text-gray-800 block">Credit Usage Trend</span>
            <span className="text-[9px] text-indigo-400 font-medium">Last 7 days</span>
          </div>
        </div>

        {/* Avg/day chip */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 border border-indigo-100">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span className="text-[10px] font-bold text-indigo-600">{avgDaily.toLocaleString()}</span>
          </div>
          <span className="text-[9px] text-gray-400">avg/day</span>
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="flex-1 min-h-0 relative z-10">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-lg bg-purple-50/80"
                style={{ width: `${60 + i * 10}%`, height: 12 }}
              />
            ))}
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <span className="text-xs text-gray-300">No credit data for this period</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={3} barCategoryGap="30%">
              <defs>
                {/* Enrichment gradient — indigo/violet */}
                <linearGradient id="enrichGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity={1} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.85} />
                </linearGradient>
                {/* Verification gradient — cyan/teal */}
                <linearGradient id="verifyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#67e8f9" stopOpacity={1} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.85} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(124,58,237,0.06)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 500 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                width={35}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(124,58,237,0.04)", radius: 8 } as any}
              />
              <Legend
                iconType="circle"
                iconSize={7}
                wrapperStyle={{
                  fontSize: "10px",
                  color: "#64748b",
                  paddingTop: "8px",
                }}
                formatter={(value) => (
                  <span style={{ color: "#64748b", fontWeight: 600 }}>{value}</span>
                )}
              />
              {/* Only render enrichment bar if Sales Suite is enabled */}
              {isSalesSuiteEnabled && (
                <Bar
                  dataKey="enrichment_credits"
                  name="Enrichment"
                  stackId="a"
                  fill="url(#enrichGrad)"
                  radius={[0, 0, 0, 0]}
                />
              )}
              {/* Verification is always rendered, radius on top corners */}
              <Bar
                dataKey="verification_credits"
                name="Verification"
                stackId="a"
                fill="url(#verifyGrad)"
                radius={[4, 4, 0, 0]} 
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Footer: peak day callout ── */}
      {!isLoading && maxDay?.date && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.8 }}
          className="mt-2 pt-2.5 border-t border-purple-100/60 flex items-center justify-between relative z-10 flex-shrink-0"
        >
          <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">
            Peak day
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-gray-500 font-medium">{maxDay.date}</span>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
              style={{
                background: "rgba(99,102,241,0.08)",
                color: "#6366f1",
              }}
            >
              {(maxDay.displayTotal || 0).toLocaleString()}
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default CreditTrendChart;