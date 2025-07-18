import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface ChartData {
  name: string;
  companies_created: number;
}

interface CreatorPerformanceChartProps {
  data: ChartData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-background/80 backdrop-blur-sm border rounded-md shadow-lg">
        <p className="font-bold">{label}</p>
        <p className="text-primary">{`Companies Created: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

const CreatorPerformanceChart: React.FC<CreatorPerformanceChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Creator Performance</CardTitle>
          <CardDescription>No data available for the selected date range.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          <p>Select a date range to see performance.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Creator Performance</CardTitle>
        <CardDescription>Number of companies added by each user in the selected period.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))' }} />
            <Legend wrapperStyle={{ paddingTop: '20px' }}/>
            <Bar dataKey="companies_created" name="Companies Created" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default CreatorPerformanceChart;