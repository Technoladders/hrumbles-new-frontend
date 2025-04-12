import React, { useState } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

interface CircularProgressBarProps {
  revenue: number;
  profit: number;
}

const CircularProgressBar: React.FC<CircularProgressBarProps> = ({ revenue, profit }) => {
  const totalValue = revenue + profit;

  // Calculate percentages
  const revenuePercentage = (revenue / totalValue) * 100;
  const profitPercentage = (profit / totalValue) * 100;

  // State to track hover
  const [hoveredSection, setHoveredSection] = useState<"revenue" | "profit" | null>(null);

  return (
    <div className="flex items-center gap-6">
      {/* Circular Progress Bar with Hover Effects */}
      <div
        className="relative w-44 h-44 cursor-pointer transition-all duration-300 hover:scale-105"
        onMouseEnter={() => setHoveredSection(null)} // Reset on general hover
      >
        <CircularProgressbar
          value={profitPercentage} // Always show profit percentage
          strokeWidth={16} // ✅ Increased thickness
          styles={buildStyles({
            pathColor: "var(--theme-green)", // Profit color
            trailColor: "var(--theme-gray)", // Revenue as gray
            textColor: "var(--theme-text-primary)",
            textSize: "18px",
            strokeLinecap: "round",
            pathTransitionDuration: 0.5,
          })}
        />
        {/* Show Percentage on Hover */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-lg font-semibold text-gray-800">
          {hoveredSection === "revenue"
            ? `${revenuePercentage.toFixed(1)}%`
            : `${profitPercentage.toFixed(1)}%`} {/* ✅ Default: Profit, Hover: Dynamic */}
        </div>
      </div>

      {/* Legend (Total Revenue & Profit with Colors) */}
      <div className="flex flex-col gap-3">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onMouseEnter={() => setHoveredSection("revenue")}
          onMouseLeave={() => setHoveredSection(null)}
        >
          <div className="w-4 h-4 rounded-full bg-gray-400"></div> {/* Revenue Color */}
          <p className="text-sm font-semibold text-gray-700">Total Revenue: ₹{revenue.toLocaleString()}</p>
        </div>

        <div
          className="flex items-center gap-3 cursor-pointer"
          onMouseEnter={() => setHoveredSection("profit")}
          onMouseLeave={() => setHoveredSection(null)}
        >
          <div className="w-4 h-4 rounded-full bg-green-500"></div> {/* Profit Color */}
          <p className="text-sm font-semibold text-gray-700">Total Profit: ₹{profit.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

export default CircularProgressBar;
