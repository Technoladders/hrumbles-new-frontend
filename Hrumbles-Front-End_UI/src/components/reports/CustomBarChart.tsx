import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface StatusBreakdown {
  statusName: string;
  count: number;
}

interface EmployeeData {
  name: string;
  totalCandidates: number;
  statusBreakdown: StatusBreakdown[];
}

interface CustomBarChartProps {
  data: EmployeeData[];
  statuses: string[];
  layout?: 'horizontal' | 'vertical';
  colors?: string[];
}

const CustomBarChart: React.FC<CustomBarChartProps> = ({
  data,
  statuses,
  layout = 'horizontal',
  colors = []
}) => {
  // Create dataset where each status is a group and each employee contributes a value to that group
  const transformedData = statuses.map((statusName) => {
    const statusGroup: any = { statusName };
    data.forEach((employee) => {
      const match = employee.statusBreakdown.find(sb => sb.statusName === statusName);
      statusGroup[employee.name] = match?.count ?? 0;
    });
    return statusGroup;
  });

  return (
    <ResponsiveContainer width="100%" height={500}>
      <BarChart
        layout={layout}
        data={transformedData}
        margin={{ top: 20, right: 30, left: 100, bottom: 50 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        {layout === 'horizontal' ? (
          <>
            <XAxis type="number" />
            <YAxis dataKey="statusName" type="category" />
          </>
        ) : (
          <>
            <XAxis dataKey="statusName" type="category" />
            <YAxis type="number" />
          </>
        )}
        <Tooltip />
        <Legend />
        {data.map((employee, index) => (
          <Bar
            key={employee.name}
            dataKey={employee.name}
            fill={colors[index % colors.length] || '#8884d8'}
            stackId={layout === 'vertical' ? 'stack' : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default CustomBarChart;
