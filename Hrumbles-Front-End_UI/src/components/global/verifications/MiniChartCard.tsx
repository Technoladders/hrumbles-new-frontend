import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';


interface MiniChartCardProps {
  title: string;
  data: { name: string; value: number; color: string }[];
  chartType: 'pie' | 'bar';
}

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 text-sm bg-white/80 backdrop-blur-sm border border-gray-200 rounded-md shadow-lg">
          <p className="font-bold">{`${payload[0].name}: ${payload[0].value.toLocaleString()}`}</p>
        </div>
      );
    }
    return null;
};

const MiniChartCard: React.FC<MiniChartCardProps> = ({ title, data, chartType }) => {
  return (
    <Card className="shadow-lg border-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-gray-700">{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'pie' ? (
            <PieChart>
              <Tooltip content={<CustomTooltip />} />
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={40} outerRadius={60} paddingAngle={5}>
                {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
              </Pie>
            </PieChart>
          ) : (
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                 <XAxis type="number" hide />
                 <YAxis dataKey="name" type="category" hide />
                 <Tooltip cursor={{ fill: '#f3e8ff' }} content={<CustomTooltip />} />
                 <Bar dataKey="value" barSize={20} radius={[4, 4, 4, 4]}>
                    {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                 </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default MiniChartCard;