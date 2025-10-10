import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  Tooltip,
  Cell,
  LabelList,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { motion } from 'framer-motion';

// Define the shape of the data items
interface FunnelDataPoint {
  name: string;
  value: number;
  color: string;
}

interface AdvancedFunnelChartProps {
  data: FunnelDataPoint[];
  title: string;
  description: string;
}

// Custom Tooltip for better styling
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="text-sm font-semibold text-gray-800">{data.name}</p>
        <p className="text-sm" style={{ color: data.color }}>
          Count: <span className="font-bold">{data.value}</span>
        </p>
      </div>
    );
  }
  return null;
};

export const AdvancedFunnelChart: React.FC<AdvancedFunnelChartProps> = ({ data, title, description }) => {
  // Calculate the total for percentage calculations
  const totalValue = useMemo(() => data.reduce((sum, entry) => sum + entry.value, 0), [data]);

  if (!data || data.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-gray-500">No data available for the funnel.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-full"
    >
      <Card className="h-full shadow-md border-none bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-gray-800">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-2" style={{ height: '400px' }}>
            {/* Custom Legend (Left Side) */}
            <div className="col-span-3 flex flex-col justify-center space-y-3 text-sm">
              {data.map((entry) => (
                <div key={entry.name} className="flex items-center space-x-2">
                  <div
                    className="w-4 h-4 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="font-bold text-gray-600">{entry.name.charAt(0)}.</span>
                  <span className="text-gray-800">{entry.value}</span>
                </div>
              ))}
            </div>

            {/* Funnel Chart (Right Side) */}
            <div className="col-span-9 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                  <Tooltip content={<CustomTooltip />} />
                  <Funnel dataKey="value" data={data} isAnimationActive={true}>
                    {/* Assign colors to each segment */}
                    {data.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                    {/* Custom Labels (Right Side) */}
                    <LabelList
                      position="right"
                      dataKey="name"
                      formatter={(label: string) => {
                        const entry = data.find(d => d.name === label);
                        if (!entry || totalValue === 0) return label;
                        const percentage = ((entry.value / totalValue) * 100).toFixed(1);
                        return `${label}: ${percentage}%`;
                      }}
                      stroke="#4b5563"
                      fontSize={12}
                    />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};