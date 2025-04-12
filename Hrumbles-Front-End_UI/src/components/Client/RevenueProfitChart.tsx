import React, { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface RevenueProfitChartProps {
  revenue: number;
  profit: number;
}

const RevenueProfitChart: React.FC<RevenueProfitChartProps> = ({ revenue, profit }) => {
  const total = revenue + profit;
  const revenuePercentage = ((revenue / total) * 100).toFixed(1);
  const profitPercentage = ((profit / total) * 100).toFixed(1);

  const [hoveredSection, setHoveredSection] = useState<"revenue" | "profit" | null>(null);

  const data = [
    { name: "Revenue", value: revenue, color: "var(--theme-gray)" },
    { name: "Profit", value: profit, color: "var(--theme-green)" },
  ];

  return (
    <div className="w-full flex flex-col items-center relative">
      <h2 className="text-xl font-semibold mb-4">Total Revenue vs Profit</h2>

      <div className="relative h-[250px] lg:h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              cornerRadius={6}
              paddingAngle={5}
              dataKey="value"
              onMouseEnter={(data) => setHoveredSection(data.name === "Revenue" ? "revenue" : "profit")}
              onMouseLeave={() => setHoveredSection(null)}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>

            {/* ✅ Fix Tooltip Position - Avoid Overlay on Center */}
            <Tooltip
              position={{ y: 10, x: 230 }} // Forces tooltip outside
              offset={20} // Pushes tooltip outside the circle
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "8px",
              }}
              formatter={(value: number, name: string) => [`₹${value.toLocaleString()}`, name]}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* ✅ Display "Profit" or "Revenue" + Percentage at the Center */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center text-gray-800">
          <p className="text-sm font-medium">
            {hoveredSection === "revenue"
              ? "Revenue"
              : hoveredSection === "profit"
              ? "Profit"
              : "Profit"}
          </p>
          <p className="text-xl font-bold">
            {hoveredSection === "revenue"
              ? `${revenuePercentage}%`
              : hoveredSection === "profit"
              ? `${profitPercentage}%`
              : `${profitPercentage}%`}
          </p>
        </div>
      </div>

      {/* ✅ Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
            <span className="text-xs lg:text-sm text-muted-foreground whitespace-nowrap">
              {item.name}: ₹{item.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RevenueProfitChart;
