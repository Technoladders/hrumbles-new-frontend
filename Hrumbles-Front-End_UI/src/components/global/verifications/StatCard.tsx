import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils'; // Assuming you have a utility for merging class names

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  description?: string;
  trend?: {
    value: string;
    direction: 'up' | 'down';
  };
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, description, trend, className }) => {
  const trendColor = trend?.direction === 'up' ? 'text-emerald-500' : 'text-red-500';
  
  return (
    <Card className={cn("shadow-lg border-none bg-white", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-gray-800">{value}</div>
        {trend && (
          <p className={cn("text-xs mt-1", trendColor)}>
            {trend.value}
          </p>
        )}
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;