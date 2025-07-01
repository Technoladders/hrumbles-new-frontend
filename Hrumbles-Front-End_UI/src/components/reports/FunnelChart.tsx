import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
  Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { motion } from 'framer-motion';

interface FunnelChartProps {
  data: {
    name: string;
    value: number;
    fill: string;
  }[];
  title: string;
}

const FunnelChart: React.FC<FunnelChartProps> = ({ data, title }) => {
  // Sort data from highest to lowest value for the funnel effect
  const sortedData = [...data].sort((a, b) => b.value - a.value);

  // Define a solid purple color palette (dark to light)
  const purplePalette = [
    '#9333ea', // ProfilesSubmitted - Darkest purple
    '#a855f7', // Sent to Client
    '#b583fc', // Slightly lighter purple
    '#c6a1fd', // Softer purple
    '#d4bffe', // Lighter purple
    '#e2ddff', // Very light purple
    '#f0eaff', // Lightest purple
  ];

  // Assign colors based on the number of data points
  const getPurpleShade = (index: number) => {
    const colorIndex = Math.min(index, purplePalette.length - 1);
    return purplePalette[colorIndex];
  };

  // Calculate total count for the footer
  const totalCount = sortedData.reduce((sum, entry) => sum + entry.value, 0);

  // Calculate the maximum value for the XAxis domain
  const maxValue = Math.max(...sortedData.map(entry => entry.value), 1); // Ensure at least 1 to avoid zero domain
  const xAxisDomainMax = maxValue > 0 ? maxValue + Math.ceil(maxValue * 0.1) : 10; // Add 10% padding, or default to 10 if all values are 0

  // Check if all values are 0
  const allValuesZero = sortedData.every(entry => entry.value === 0);

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-sm font-semibold text-gray-800">{`Stage: ${label}`}</p>
          <p className="text-sm text-purple-600">{`Count: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };

  // Transform data to ensure a minimal bar for zero values
  const displayData = sortedData.map(entry => ({
    ...entry,
    displayValue: entry.value === 0 ? 0.1 : entry.value, // Use a small value for rendering zero
  }));

  if (allValuesZero) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <Card className="shadow-lg border-none bg-gradient-to-br from-purple-50 to-white">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-gray-800">{title}</CardTitle>
            <p className="text-sm text-gray-500">Funnel chart showing the stages of the process</p>
          </CardHeader>
          <CardContent className="pt-6 pb-8 flex items-center justify-center h-[400px]">
            <p className="text-gray-500 text-center">No data to display (all values are 0)</p>
          </CardContent>
          <CardFooter className="border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-600">
              Total Count: <span className="font-semibold text-purple-600">{totalCount}</span>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <Card className="shadow-lg border-none bg-gradient-to-br from-purple-50 to-white">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold text-gray-800">{title}</CardTitle>
          <p className="text-sm text-gray-500">Funnel chart showing the stages of the process</p>
        </CardHeader>
        <CardContent className="pt-6 pb-8">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              layout="vertical"
              data={displayData}
              margin={{ top: 0, right: 20, left: 40, bottom: 0 }}
            >
              <XAxis
                type="number"
                stroke="#d1d5db"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                domain={[0, xAxisDomainMax]} // Ensure the domain starts at 0 and extends to max + padding
                allowDecimals={false} // Ensure whole numbers on the axis
              />
              <YAxis
                dataKey="name"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#4b5563', fontSize: 14, fontWeight: 500 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="displayValue" // Use displayValue for rendering bars
                barSize={30}
                radius={[0, 6, 6, 0]}
                style={{ transition: 'all 0.3s ease' }}
              >
                {displayData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getPurpleShade(index)}
                    style={{
                      filter: 'brightness(100%)',
                      transition: 'filter 0.3s ease',
                    }}
                    onMouseEnter={(e: any) => {
                      e.target.style.filter = 'brightness(110%)';
                    }}
                    onMouseLeave={(e: any) => {
                      e.target.style.filter = 'brightness(100%)';
                    }}
                  />
                ))}
                <LabelList
                  dataKey="value" // Use the actual value for labels, not displayValue
                  position="insideRight"
                  fill="#ffffff"
                  fontSize={14}
                  fontWeight={600}
                  offset={10}
                  formatter={(value: number) => (value === 0 ? '0' : value)}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
        <CardFooter className="border-t border-gray-200 pt-4">
          <p className="text-sm text-gray-600">
            Total Count: <span className="font-semibold text-purple-600">{totalCount}</span>
          </p>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default FunnelChart;