import React from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Activity } from "lucide-react";
import { WeeklyActivity } from "../hooks/useDashboardStats";

interface WeeklyActivityChartProps {
  data: WeeklyActivity[];
  isLoading?: boolean;
  delay?: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-2.5 shadow-lg text-xs">
      <p className="font-medium text-gray-600 mb-1.5">{label}</p>
      {payload.map((e: any) => (
        <div key={e.dataKey} className="flex items-center gap-1.5 mb-0.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
          <span className="text-gray-500 capitalize">{e.dataKey}:</span>
          <span className="font-semibold text-gray-800">{e.value}</span>
        </div>
      ))}
    </div>
  );
};

const WeeklyActivityChart: React.FC<WeeklyActivityChartProps> = ({ data, isLoading, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white rounded-2xl border border-gray-100 p-5 h-full"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-violet-50 text-violet-500">
          <Activity className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="text-xs font-semibold text-gray-700 block">Weekly Activity</span>
          <span className="text-[9px] text-gray-400">Submissions, interviews, offers &amp; joins</span>
        </div>
      </div>

      <div className="h-52">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-pulse text-xs text-gray-400">Loading...</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data || []}>
              <defs>
                <linearGradient id="gSub" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gInt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gOff" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gJoin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} width={30} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: "10px", color: "#64748b" }} />
              <Area type="monotone" dataKey="submissions" stroke="#818cf8" fill="url(#gSub)" strokeWidth={2} />
              <Area type="monotone" dataKey="interviews" stroke="#fbbf24" fill="url(#gInt)" strokeWidth={2} />
              <Area type="monotone" dataKey="offers" stroke="#34d399" fill="url(#gOff)" strokeWidth={2} />
              <Area type="monotone" dataKey="joins" stroke="#22d3ee" fill="url(#gJoin)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
};

export default WeeklyActivityChart;