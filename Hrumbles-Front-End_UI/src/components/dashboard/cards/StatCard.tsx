import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; label: string };
  icon: React.ReactNode;
  accentColor?: string;
  delay?: number;
  sparklineData?: number[];
}

const MiniSparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 72;
  const h = 24;
  const p = 2;
  const pts = data.map((v, i) => {
    const x = p + (i / (data.length - 1)) * (w - p * 2);
    const y = h - p - ((v - min) / range) * (h - p * 2);
    return `${x},${y}`;
  });
  const area = [`${p},${h}`, ...pts, `${w - p},${h}`].join(" ");
  const gid = `sg-${color.replace("#", "")}`;

  return (
    <svg width={w} height={h} className="overflow-visible">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  accentColor = "#6366f1",
  delay = 0,
  sparklineData,
}) => {
  const dir = trend ? (trend.value > 0 ? "up" : trend.value < 0 ? "down" : "flat") : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="group relative bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-lg hover:border-gray-200 transition-all duration-300"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)" }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-4 right-4 h-[2px] rounded-full opacity-60"
        style={{ backgroundColor: accentColor }}
      />

      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2.5">
            <div
              className="flex items-center justify-center w-7 h-7 rounded-lg"
              style={{ backgroundColor: `${accentColor}12`, color: accentColor }}
            >
              {icon}
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {title}
            </span>
          </div>

          <div className="flex items-end gap-2">
            <motion.span
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: delay + 0.15 }}
              className="text-2xl font-bold text-gray-900 tracking-tight leading-none"
            >
              {typeof value === "number" ? value.toLocaleString() : value}
            </motion.span>

            {trend && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: delay + 0.3 }}
                className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                  dir === "up"
                    ? "text-emerald-600 bg-emerald-50"
                    : dir === "down"
                    ? "text-rose-600 bg-rose-50"
                    : "text-gray-500 bg-gray-50"
                }`}
              >
                {dir === "up" && <TrendingUp className="w-3 h-3" />}
                {dir === "down" && <TrendingDown className="w-3 h-3" />}
                {dir === "flat" && <Minus className="w-3 h-3" />}
                {Math.abs(trend.value)}%
              </motion.span>
            )}
          </div>

          {subtitle && <p className="text-[10px] text-gray-400 mt-1 truncate">{subtitle}</p>}
        </div>

        {sparklineData && sparklineData.length > 1 && (
          <div className="flex-shrink-0 mt-5 opacity-50 group-hover:opacity-100 transition-opacity">
            <MiniSparkline data={sparklineData} color={accentColor} />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default StatCard;