import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ComparisonSelector } from './ComparisonSelector';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Define color palettes to match IndividualReport
const COMPARISON_COLORS = {
  first: '#2563EB',  // Deep Blue from OFFERED_COLORS[0]
  second: '#0D9488', // Teal from PROCESSED_COLORS[0]
};

interface ComparisonChartProps {
  data: any[];
  type: 'status' | 'employee';
  items: Array<{ id: string; name: string }>;
  selectedFirst: string;
  selectedSecond: string;
  onFirstChange: (value: string) => void;
  onSecondChange: (value: string) => void;
}

export const ComparisonChart: React.FC<ComparisonChartProps> = ({
  data,
  type,
  items,
  selectedFirst,
  selectedSecond,
  onFirstChange,
  onSecondChange,
}) => {
  if (!selectedFirst || !selectedSecond) {
    return (
      <Alert>
        <AlertDescription>Please select both {type}s to compare.</AlertDescription>
      </Alert>
    );
  }

  if (!data.some(d => d[selectedFirst] !== undefined || d[selectedSecond] !== undefined)) {
    return (
      <Alert>
        <AlertDescription>No data available for the selected {type}s.</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-2xl font-bold">
          <span>Comparison View</span>
          <div className="flex gap-4">
            <ComparisonSelector
              type={type}
              items={items}
              value={selectedFirst}
              onChange={onFirstChange}
              label={`First ${type}`}
            />
            <ComparisonSelector
              type={type}
              items={items}
              value={selectedSecond}
              onChange={onSecondChange}
              label={`Second ${type}`}
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400} minWidth={300}>
          <AreaChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              style={{ fontSize: '12px', fill: '#666' }}
            />
            <YAxis style={{ fontSize: '12px', fill: '#666' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #ccc',
                borderRadius: '4px',
                padding: '10px',
                fontSize: '12px',
              }}
              itemStyle={{ color: '#333' }}
              cursor={{ fill: 'rgba(0, 0, 0, 0.1)' }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              layout="vertical"
              wrapperStyle={{ fontSize: '12px', color: '#333' }}
            />
            <Area
              type="monotone"
              dataKey={selectedFirst}
              stackId="1"
              stroke={COMPARISON_COLORS.first}
              fill={COMPARISON_COLORS.first}
              fillOpacity={0.7}
              name={items.find(item => item.id === selectedFirst)?.name}
              style={{ transition: 'all 0.3s ease-in-out' }}
            />
            <Area
              type="monotone"
              dataKey={selectedSecond}
              stackId="1"
              stroke={COMPARISON_COLORS.second}
              fill={COMPARISON_COLORS.second}
              fillOpacity={0.7}
              name={items.find(item => item.id === selectedSecond)?.name}
              style={{ transition: 'all 0.3s ease-in-out' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};