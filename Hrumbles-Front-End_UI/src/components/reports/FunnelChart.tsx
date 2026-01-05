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

  // Define color mapping that matches RecruiterPerformanceTable
  const getStageColor = (stageName: string): string => {
    const colorMap: { [key: string]: string } = {
      'Profiles Submitted': '#7e22ce',     // Purple
      'Sent to Client': '#10b981',         // Green
      'Technical Interview': '#3b82f6',    // Blue
      'Technical Selected': '#10b981',     // Green
      'L1 Interview': '#8b5cf6',           // Purple
      'L1 Selected': '#059669',            // Dark Green
      'L2 Interview': '#f59e0b',           // Orange
      'End Client Interview': '#06b6d4',   // Cyan
      'Offers Made': '#10b981',            // Green
      'Offers Accepted': '#059669',        // Dark Green
      'Joined': '#7e22ce',                 // Purple
    };
    
    return colorMap[stageName] || '#a855f7'; // Default purple if not found
  };

  // Apply colors to data
  const coloredData = sortedData.map(entry => ({
    ...entry,
    fill: getStageColor(entry.name)
  }));

  // Calculate total count for the footer
  const totalCount = coloredData.reduce((sum, entry) => sum + entry.value, 0);

  // Calculate the maximum value for the XAxis domain
  const maxValue = Math.max(...coloredData.map(entry => entry.value), 1);
  const xAxisDomainMax = maxValue > 0 ? maxValue + Math.ceil(maxValue * 0.1) : 10;

  // Check if all values are 0
  const allValuesZero = coloredData.every(entry => entry.value === 0);

  // Custom Tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-sm font-semibold text-gray-800">{`${label}`}</p>
          <p className="text-sm font-bold" style={{ color: payload[0].payload.fill }}>
            {`Count: ${payload[0].value}`}
          </p>
        </div>
      );
    }
    return null;
  };

  // Transform data to ensure a minimal bar for zero values
  const displayData = coloredData.map(entry => ({
    ...entry,
    displayValue: entry.value === 0 ? 0.1 : entry.value,
  }));

  // Shorten label names for better readability
  const shortenLabel = (name: string): string => {
    const labelMap: { [key: string]: string } = {
      'Profiles Submitted': 'Submitted',
      'Sent to Client': 'To Client',
      'Technical Interview': 'Technical',
      'Technical Selected': 'Tech Selected',
      'L1 Interview': 'L1 Interview',
      'L1 Selected': 'L1 Selected',
      'L2 Interview': 'L2 Interview',
      'End Client Interview': 'End Client',
      'Offers Made': 'Offers Made',
      'Offers Accepted': 'Accepted',
      'Joined': 'Joined',
    };
    
    return labelMap[name] || name;
  };

  if (allValuesZero) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <Card className="shadow-2xl bg-white/70 backdrop-blur-xl border border-white/20 hover:shadow-3xl transition-all duration-300">
          <CardHeader className="pb-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-xl">
            <CardTitle className="text-xl font-bold">{title}</CardTitle>
            <p className="text-sm text-purple-100 mt-1">Stage-by-stage recruitment progress</p>
          </CardHeader>
          <CardContent className="pt-6 pb-8 flex items-center justify-center h-[400px]">
            <p className="text-gray-500 text-center">No data to display</p>
          </CardContent>
          <CardFooter className="border-t border-gray-200 pt-3 bg-gray-50/50">
            <p className="text-sm text-gray-600">
              Total: <span className="font-semibold text-purple-600">{totalCount}</span>
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
      <Card className="shadow-2xl bg-white/70 backdrop-blur-xl border border-white/20 hover:shadow-3xl transition-all duration-300">
        <CardHeader className="pb-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-xl">
          <CardTitle className="text-xl font-bold">{title}</CardTitle>
          <p className="text-sm text-purple-100 mt-1">Stage-by-stage recruitment progress</p>
        </CardHeader>
        <CardContent className="pt-4 pb-4">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              layout="vertical"
              data={displayData}
              margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
            >
              <defs>
                {/* Gradient definitions matching RecruiterPerformanceTable */}
                <linearGradient id="submittedGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7e22ce" stopOpacity={0.2} />
                  <stop offset="50%" stopColor="#7e22ce" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#7e22ce" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="toClientGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="50%" stopColor="#10b981" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="technicalGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="techSelectedGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="50%" stopColor="#10b981" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="l1Gradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.2} />
                  <stop offset="50%" stopColor="#8b5cf6" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="l1SelectedGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#059669" stopOpacity={0.2} />
                  <stop offset="50%" stopColor="#059669" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="l2Gradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="endClientGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.2} />
                  <stop offset="50%" stopColor="#06b6d4" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="offersMadeGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="50%" stopColor="#10b981" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="acceptedGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#059669" stopOpacity={0.2} />
                  <stop offset="50%" stopColor="#059669" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="joinedGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7e22ce" stopOpacity={0.2} />
                  <stop offset="50%" stopColor="#7e22ce" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#7e22ce" stopOpacity={0.9} />
                </linearGradient>
              </defs>
              <XAxis
                type="number"
                stroke="#d1d5db"
                tick={{ fill: '#6b7280', fontSize: 10 }}
                domain={[0, xAxisDomainMax]}
                allowDecimals={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#4b5563', fontSize: 11, fontWeight: 500 }}
                width={100}
                tickFormatter={shortenLabel}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="displayValue"
                barSize={24}
                radius={[0, 6, 6, 0]}
                style={{ transition: 'all 0.3s ease' }}
              >
                {displayData.map((entry, index) => {
                  // Map stage name to gradient ID
                  const getGradientId = (name: string): string => {
                    const gradientMap: { [key: string]: string } = {
                      'Profiles Submitted': 'submittedGradient',
                      'Sent to Client': 'toClientGradient',
                      'Technical Interview': 'technicalGradient',
                      'Technical Selected': 'techSelectedGradient',
                      'L1 Interview': 'l1Gradient',
                      'L1 Selected': 'l1SelectedGradient',
                      'L2 Interview': 'l2Gradient',
                      'End Client Interview': 'endClientGradient',
                      'Offers Made': 'offersMadeGradient',
                      'Offers Accepted': 'acceptedGradient',
                      'Joined': 'joinedGradient',
                    };
                    return gradientMap[name] || 'submittedGradient';
                  };

                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={`url(#${getGradientId(entry.name)})`}
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
                  );
                })}
                <LabelList
                  dataKey="value"
                  position="insideRight"
                  fill="#ffffff"
                  fontSize={11}
                  fontWeight={600}
                  offset={8}
                  formatter={(value: number) => (value === 0 ? '0' : value)}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
        <CardFooter className="border-t border-gray-200 pt-3 bg-gray-50/50">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-gray-600">
              Total: <span className="font-semibold text-purple-600">{totalCount}</span>
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                Matches chart colors
              </span>
            </div>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

export default FunnelChart;