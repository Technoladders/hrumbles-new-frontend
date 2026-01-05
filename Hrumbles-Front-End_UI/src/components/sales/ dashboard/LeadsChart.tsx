import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Box, Text, Flex, Stat, StatLabel, StatNumber } from '@chakra-ui/react';
import type { LeadsMetrics } from '@/types/sales-dashboard.types';

interface LeadsChartProps {
  data: LeadsMetrics;
}

const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B'];

const LeadsChart: React.FC<LeadsChartProps> = ({ data }) => {
  const chartData = [
    { name: 'New Leads', value: data.new_leads_count },
    { name: 'Active Opportunities', value: data.active_opportunities_count },
    { name: 'Qualified Leads', value: data.qualified_leads_count },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <Box bg="white" p={3} borderRadius="md" shadow="lg" borderWidth="1px">
          <Text fontWeight="bold" mb={1} color="gray.800">
            {payload[0].name}
          </Text>
          <Text fontSize="sm" color="gray.600">
            Count: <strong>{payload[0].value}</strong>
          </Text>
        </Box>
      );
    }
    return null;
  };

  return (
    <Flex direction="column" w="full" h="300px">
      <Flex justify="space-around" mb={4}>
        <Stat textAlign="center">
          <StatLabel fontSize="xs" color="gray.600">
            New Leads
          </StatLabel>
          <StatNumber fontSize="lg" color="purple.600">
            {data.new_leads_count}
          </StatNumber>
        </Stat>
        <Stat textAlign="center">
          <StatLabel fontSize="xs" color="gray.600">
            Active Opps
          </StatLabel>
          <StatNumber fontSize="lg" color="blue.600">
            {data.active_opportunities_count}
          </StatNumber>
        </Stat>
        <Stat textAlign="center">
          <StatLabel fontSize="xs" color="gray.600">
            Conversion
          </StatLabel>
          <StatNumber fontSize="lg" color="green.600">
            {data.conversion_rate.toFixed(1)}%
          </StatNumber>
        </Stat>
      </Flex>
      <Box flex="1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </Flex>
  );
};

export default LeadsChart;