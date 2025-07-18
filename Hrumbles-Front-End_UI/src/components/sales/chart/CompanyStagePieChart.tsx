import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface ChartData {
  name: string;
  value: number;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', '#00c49f'];

const CompanyStagePieChart: React.FC<{ data: ChartData[] }> = ({ data }) => {
  if (!data || data.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Companies by Stage</CardTitle>
        <CardDescription>Distribution of stages for companies in the selected period.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default CompanyStagePieChart;