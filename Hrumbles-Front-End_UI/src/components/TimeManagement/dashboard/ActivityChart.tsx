
import { useState } from "react";
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

// Sample activity data
const activityData = [
  { day: '10', value: 20, label: 'may' },
  { day: '11', value: 45, label: 'may' },
  { day: '12', value: 15, label: 'may' },
  { day: '13', value: 35, label: 'may', active: true },
  { day: '14', value: 25, label: 'may' },
  { day: '15', value: 10, label: 'may' },
  { day: '16', value: 30, label: 'may' }
];

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white text-xs p-2 rounded shadow-lg">
        <p className="label">Time worked: 07:20:00</p>
        <p className="intro">Activity: {payload[0].value}%</p>
      </div>
    );
  }

  return null;
};

export function ActivityChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={activityData} margin={{ top: 20, right: 30, left: 0, bottom: 30 }}>
        <XAxis 
          dataKey="day" 
          axisLine={false}
          tickLine={false}
          tick={(props) => {
            const { x, y, payload } = props;
            const isActive = activityData[payload.index]?.active;
            return (
              <g transform={`translate(${x},${y + 20})`}>
                <text
                  className={`${isActive ? 'font-semibold text-white' : 'text-gray-500'}`}
                  x={0}
                  y={0}
                  dy={0}
                  textAnchor="middle"
                  fontSize={12}
                >
                  {payload.value}
                </text>
                <text
                  x={0}
                  y={16}
                  className="text-gray-400"
                  textAnchor="middle"
                  fontSize={10}
                >
                  {activityData[payload.index]?.label}
                </text>
                {isActive && (
                  <rect
                    x={-18}
                    y={-45}
                    rx={8}
                    width={36}
                    height={60}
                    className="fill-emerald-500"
                    fillOpacity={0.1}
                  />
                )}
              </g>
            );
          }}
        />
        <Tooltip content={<CustomTooltip />} cursor={false} />
        <Bar 
          dataKey="value" 
          minPointSize={5}
          barSize={24}
          radius={[4, 4, 0, 0]}
          fill="#e5e7eb"
        >
          {activityData.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.active ? "#10b981" : "#e5e7eb"} 
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
