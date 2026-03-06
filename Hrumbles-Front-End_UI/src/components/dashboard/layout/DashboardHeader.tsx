import React, { useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  organizationName: string;
  onDateRangeChange?: (range: { from: string; to: string } | undefined) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const presets = [
  { label: "7D", days: 7 },
  { label: "14D", days: 14 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
];

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  organizationName,
  onDateRangeChange,
  onRefresh,
  isRefreshing,
}) => {
  const [active, setActive] = useState(0);

  const handlePreset = (idx: number, days: number) => {
    setActive(idx);
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    onDateRangeChange?.({
      from: from.toISOString().split("T")[0],
      to: to.toISOString().split("T")[0],
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5"
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-200">
          <LayoutDashboard className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">
            {organizationName || "Dashboard"}
          </h1>
          <p className="text-[11px] text-gray-400">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* <div className="flex items-center gap-2">
        <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50/80 p-0.5">
          {presets.map((p, idx) => (
            <button
              key={p.label}
              onClick={() => handlePreset(idx, p.days)}
              className={`px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all duration-200 ${
                active === idx
                  ? "bg-white text-indigo-600 shadow-sm border border-gray-200"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="w-8 h-8 p-0 rounded-xl border border-gray-200 bg-gray-50/80 hover:bg-gray-100 text-gray-500 hover:text-gray-700"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
        </Button>
      </div> */}
    </motion.div>
  );
};

export default DashboardHeader;