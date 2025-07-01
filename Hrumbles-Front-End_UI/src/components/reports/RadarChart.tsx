
import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RadarChartDataItem {
  subject: string;
  [key: string]: string | number;
}

interface RadarChartProps {
  data: RadarChartDataItem[];
  title: string;
  recruiters: string[];
  colors: string[];
}

const RecruiterRadarChart: React.FC<RadarChartProps> = ({ data, title, recruiters, colors }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart 
            cx="50%" 
            cy="50%" 
            outerRadius="80%" 
            data={data}
          >
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <PolarRadiusAxis angle={30} domain={[0, 100]} />
            <Tooltip />
            {recruiters.map((recruiter, index) => (
              <Radar
                key={recruiter}
                name={recruiter}
                dataKey={recruiter}
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
                fillOpacity={0.2}
              />
            ))}
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default RecruiterRadarChart;
