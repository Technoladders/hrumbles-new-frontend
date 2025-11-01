// src/components/goals/employee/GoalPerformanceChart.tsx

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { GoalInstance } from '@/types/goal';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface GoalPerformanceChartProps {
  instances: GoalInstance[];
}

const GoalPerformanceChart: React.FC<GoalPerformanceChartProps> = ({ instances }) => {
  const chartData = useMemo(() => {
    // Sort instances by date and take the last 12 for clarity
    return instances
      .sort((a, b) => new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime())
      .slice(-12) 
      .map(instance => ({
        // Format the date for the X-axis label
        name: format(new Date(instance.periodStart), 'MMM d'),
        progress: instance.progress || 0,
      }));
  }, [instances]);

  if (!instances || instances.length === 0) {
    return null; // Don't render the chart if there's no data
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Trend</CardTitle>
        <CardDescription>Your progress over the last {chartData.length} periods.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis unit="%" domain={[0, 100]} fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ fontSize: '12px', borderRadius: '0.5rem' }}
              cursor={{ fill: 'rgba(120, 120, 120, 0.1)' }}
            />
            <Legend wrapperStyle={{ fontSize: '14px' }} />
            <Bar dataKey="progress" fill="#3b82f6" name="Progress (%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default GoalPerformanceChart;