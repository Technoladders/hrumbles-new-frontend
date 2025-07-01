
import React from "react";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent } from "@/components/ui/card";

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
}

interface GoalPieChartProps {
  data: ChartDataItem[];
  title?: string;
  height?: string | number;
  showLegend?: boolean;
  showLabels?: boolean;
  innerRadius?: number;
  outerRadius?: number;
}

const GoalPieChart: React.FC<GoalPieChartProps> = ({ 
  data,
  title,
  height = "100%",
  showLegend = true,
  showLabels = true,
  innerRadius = 60,
  outerRadius = 80
}) => {
  // Filter out items with zero value to avoid empty slices
  const filteredData = data.filter(item => item.value > 0);
  
  // If no data with values, show empty state
  if (filteredData.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-gray-500">
            <p>No data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format label for the Pie chart
  const renderCustomizedLabel = ({ name, percent }: { name: string; percent: number }) => {
    return showLabels ? `${name}: ${(percent * 100).toFixed(0)}%` : '';
  };

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          {title && <text x="50%" y="20" textAnchor="middle" dominantBaseline="middle" className="text-sm font-medium">{title}</text>}
          
          <Pie
            data={filteredData}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={5}
            dataKey="value"
            label={renderCustomizedLabel}
            labelLine={showLabels}
          >
            {filteredData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          
          <Tooltip 
            formatter={(value, name) => [`${value}`, name]}
            contentStyle={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}
          />
          
          {showLegend && (
            <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="circle"
            />
          )}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GoalPieChart;
export { GoalPieChart };
