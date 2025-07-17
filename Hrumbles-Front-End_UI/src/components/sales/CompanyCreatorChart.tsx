import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CreatorStat {
  name: string;
  count: number;
}

interface CompanyCreatorChartProps {
  data: CreatorStat[];
}

const CompanyCreatorChart: React.FC<CompanyCreatorChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return null; // Don't render the chart if there's no data
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Companies Added By User</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={100} 
              tick={{ fontSize: 12 }} 
              interval={0} 
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
            />
            <Bar dataKey="count" fill="#8884d8" barSize={30}>
              <LabelList dataKey="count" position="right" style={{ fill: 'hsl(var(--foreground))' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default CompanyCreatorChart;