// src/components/charts/StackedBarChart.tsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface StackedBarChartProps {
  data: Array<{
    name: string;
    Processed: number;
    Interview: number;
    Offered: number;
    Joined: number;
  }>;
  colors: { [key: string]: string };
  inlineStyles?: {
    container?: React.CSSProperties;
    bar?: React.CSSProperties;
    xAxis?: React.CSSProperties;
    yAxis?: React.CSSProperties;
    tooltip?: React.CSSProperties;
    legend?: React.CSSProperties;
  };
}

const StackedBarChart: React.FC<StackedBarChartProps> = ({ data, colors, inlineStyles = {} }) => {
  const statuses = ['Processed', 'Interview', 'Offered', 'Joined'];

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: any[];
    label?: string;
  }) => {
    if (!active || !payload || !payload.length) return null;
    return (
      <div
        className="rounded-lg bg-white p-2 shadow text-xs border border-gray-100"
        style={inlineStyles?.tooltip || {}}
      >
        <div className="font-semibold mb-1 truncate">{label}</div>
        {statuses.map((status) => {
          const val = payload.find((p) => p.dataKey === status)?.value ?? 0;
          return (
            <div key={status} className="flex items-center gap-2">
              <span
                className="inline-block w-2 h-2 rounded-sm"
                style={{ background: colors[status] }}
              />
              <span>{status}:</span>
              <span className="font-medium">{val}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={inlineStyles.container || {}}>
      <div className="mb-6 flex items-center gap-2">
        <span className="font-bold text-xl tracking-tight text-gray-800">Candidate Status by Company</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={data}
          barCategoryGap={25}
          barGap={8}
        >
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            height={50}
            interval={0}
            tick={{
              fontSize: 13,
              fontWeight: 500,
              fill: "#313244",
              dy: 6,
            }}
            tickFormatter={(name) => (name.length > 12 ? name.substring(0, 12) + "…" : name)}
            style={inlineStyles.xAxis || {}}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 13, fill: "#90909e", fontWeight: 500 }}
            width={32}
            tickCount={6}
            domain={[0, 40]}
            allowDecimals={false}
            style={inlineStyles.yAxis || {}}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(44, 56, 81, 0.06)" }} />
          {statuses.map((status) => (
            <Bar
              key={status}
              dataKey={status}
              stackId="a"
              fill={colors[status]}
              barSize={40}
              isAnimationActive={false}
              style={inlineStyles.bar || {}}
              stroke="#ffffff" // White stroke to create a gap effect
              strokeWidth={2} // 2-pixel stroke width for visible separation
              radius={[8, 8, 0, 0]} // Rounded corners on the top of each bar segment
            >
              {data.map((entry) => (
                <Cell key={entry.name} />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-3 flex justify-center gap-10 text-xs text-gray-500">
        {statuses.map((status) => (
          <div key={status} className="flex items-center gap-1">
            <span
              className="block w-3 h-3 rounded-sm"
              style={{ background: colors[status] }}
            />
            {status}
          </div>
        ))}
      </div>
    </div>
  );
};

export default StackedBarChart;