import React from "react";
import { motion } from "framer-motion";
import { Briefcase, Users, ChevronRight } from "lucide-react";
import { TopJob } from "../hooks/useDashboardStats";

interface TopJobsPanelProps {
  jobs: TopJob[];
  isLoading?: boolean;
  delay?: number;
}

const statusDot: Record<string, string> = {
  active: "#10b981",
  open: "#10b981",
  closed: "#ef4444",
  paused: "#f59e0b",
  draft: "#9ca3af",
};

const TopJobsPanel: React.FC<TopJobsPanelProps> = ({ jobs, isLoading, delay = 0 }) => {
  const top = (jobs || []).slice(0, 8);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white rounded-2xl border border-gray-100 p-5 h-full"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 text-emerald-500">
          <Briefcase className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="text-xs font-semibold text-gray-700 block">Top Jobs</span>
          <span className="text-[9px] text-gray-400">By pipeline volume</span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse h-10 rounded-lg bg-gray-50" />
          ))}
        </div>
      ) : top.length === 0 ? (
        <div className="text-center py-8 text-xs text-gray-400">No active jobs found</div>
      ) : (
        <div className="space-y-1">
          {top.map((job, idx) => (
            <motion.div
              key={job.job_id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: delay + 0.15 + idx * 0.05 }}
              className="group flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-center w-6 h-6 rounded bg-gray-50 text-gray-400 font-bold text-[10px] flex-shrink-0">
                {idx + 1}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-gray-700 truncate group-hover:text-gray-900 transition-colors">
                  {job.title}
                </p>
                <p className="text-[9px] text-gray-400 truncate">{job.client_name}</p>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-50">
                  <Users className="w-2.5 h-2.5 text-gray-400" />
                  <span className="text-[10px] font-semibold text-gray-600">
                    {job.candidate_count}
                  </span>
                </div>
                {job.status && (
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: statusDot[job.status.toLowerCase()] || "#9ca3af" }}
                  />
                )}
                <ChevronRight className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default TopJobsPanel;