import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';
import { Box, Text } from '@chakra-ui/react';
import type { SalesPerformanceMetrics } from '@/types/sales-dashboard.types';

interface PerformanceChartProps {
  data: SalesPerformanceMetrics;
  historicalData?: Array<{ period: string; revenue: number; target: number }>;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ data, historicalData }) => {
  // If no historical data, create a simple comparison chart
  const chartData = historicalData || [
    {
      period: 'Current',
      revenue: data.total_revenue,
      target: data.target_revenue,
    },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box bg="white" p={3} borderRadius="md" shadow="lg" borderWidth="1px">
          <Text fontWeight="bold" mb={2} color="gray.800">
            {payload[0].payload.period}
          </Text>
          {payload.map((entry: any, index: number) => (
            <Text key={index} fontSize="sm" color={entry.color}>
              {entry.name}: <strong>${entry.value.toLocaleString()}</strong>
            </Text>
          ))}
        </Box>
      );
    }
    return null;
  };

  return (
    <Box w="full" h="300px">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="period"
            tick={{ fill: '#6B7280', fontSize: 12 }}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={{ stroke: '#E5E7EB' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '12px', color: '#6B7280' }} />
          <Area
            type="monotone"
            dataKey="target"
            fill="#E0E7FF"
            stroke="#818CF8"
            name="Target Revenue"
            fillOpacity={0.3}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#8B5CF6"
            strokeWidth={3}
            dot={{ fill: '#8B5CF6', r: 5 }}
            name="Actual Revenue"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default PerformanceChart;

