import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Box, Text } from '@chakra-ui/react';
import type { PipelineOverview } from '@/types/sales-dashboard.types';

interface PipelineChartProps {
  data: PipelineOverview[];
}

const STAGE_COLORS: Record<string, string> = {
  'Prospecting': '#8B5CF6',
  'Qualification': '#3B82F6',
  'Proposal': '#10B981',
  'Negotiation': '#F59E0B',
  'Closed Won': '#059669',
  'Closed Lost': '#EF4444',
};

const PipelineChart: React.FC<PipelineChartProps> = ({ data }) => {
  const chartData = data.map(item => ({
    stage: item.stage,
    count: item.count,
    value: item.total_value,
    avgSize: item.average_deal_size,
  }));

  
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box bg="white" p={3} borderRadius="md" shadow="lg" borderWidth="1px">
          <Text fontWeight="bold" mb={2} color="gray.800">
            {payload[0].payload.stage}
          </Text>
          <Text fontSize="sm" color="gray.600">
            Deals: <strong>{payload[0].payload.count}</strong>
          </Text>
          <Text fontSize="sm" color="gray.600">
            Total Value: <strong>${payload[0].value.toLocaleString()}</strong>
          </Text>
          <Text fontSize="sm" color="gray.600">
            Avg Deal Size: <strong>${payload[0].payload.avgSize.toLocaleString()}</strong>
          </Text>
        </Box>
      );
    }
    return null;
  };

  return (
    <Box w="full" h="300px">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="stage"
            tick={{ fill: '#6B7280', fontSize: 12 }}
            axisLine={{ stroke: '#E5E7EB' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={{ stroke: '#E5E7EB' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '12px', color: '#6B7280' }} />
          <Bar dataKey="value" name="Total Value ($)" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={STAGE_COLORS[entry.stage] || '#8B5CF6'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default PipelineChart;