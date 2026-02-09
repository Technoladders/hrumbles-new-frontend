// Hrumbles-Front-End_UI/src/components/sales/sales-dashboard/MetricCard.tsx
import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MiniSparkline } from './MiniSparkline';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  subtitle?: string;
  color: 'blue' | 'amber' | 'indigo' | 'green' | 'emerald' | 'violet' | 'rose' | 'cyan';
  sparklineData?: number[];
  onClick?: () => void;
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    iconBg: 'bg-blue-100',
    text: 'text-blue-600',
    sparkline: '#3B82F6'
  },
  amber: {
    bg: 'bg-amber-50',
    iconBg: 'bg-amber-100',
    text: 'text-amber-600',
    sparkline: '#F59E0B'
  },
  indigo: {
    bg: 'bg-indigo-50',
    iconBg: 'bg-indigo-100',
    text: 'text-indigo-600',
    sparkline: '#6366F1'
  },
  green: {
    bg: 'bg-green-50',
    iconBg: 'bg-green-100',
    text: 'text-green-600',
    sparkline: '#10B981'
  },
  emerald: {
    bg: 'bg-emerald-50',
    iconBg: 'bg-emerald-100',
    text: 'text-emerald-600',
    sparkline: '#059669'
  },
  violet: {
    bg: 'bg-violet-50',
    iconBg: 'bg-violet-100',
    text: 'text-violet-600',
    sparkline: '#8B5CF6'
  },
  rose: {
    bg: 'bg-rose-50',
    iconBg: 'bg-rose-100',
    text: 'text-rose-600',
    sparkline: '#F43F5E'
  },
  cyan: {
    bg: 'bg-cyan-50',
    iconBg: 'bg-cyan-100',
    text: 'text-cyan-600',
    sparkline: '#06B6D4'
  }
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  trend,
  trendLabel,
  subtitle,
  color,
  sparklineData,
  onClick
}) => {
  const colors = colorClasses[color];
  const isPositive = trend && trend > 0;
  const isNegative = trend && trend < 0;

  return (
    <div 
      className={cn(
        "bg-white rounded-xl border border-gray-100 p-4 transition-all duration-200",
        "hover:shadow-md hover:border-gray-200",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2 rounded-lg", colors.iconBg)}>
          {icon}
        </div>
        {sparklineData && sparklineData.length > 0 && (
          <MiniSparkline data={sparklineData} color={colors.sparkline} />
        )}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {title}
        </p>
        <p className="text-2xl font-bold text-gray-900">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        
        {(trend !== undefined || subtitle) && (
          <div className="flex items-center gap-2">
            {trend !== undefined && (
              <span className={cn(
                "inline-flex items-center text-xs font-medium",
                isPositive && "text-green-600",
                isNegative && "text-red-600",
                !isPositive && !isNegative && "text-gray-500"
              )}>
                {isPositive ? (
                  <TrendingUp size={12} className="mr-0.5" />
                ) : isNegative ? (
                  <TrendingDown size={12} className="mr-0.5" />
                ) : null}
                {isPositive && '+'}
                {trend}%
              </span>
            )}
            {subtitle && (
              <span className="text-xs text-gray-500">{subtitle}</span>
            )}
            {trendLabel && (
              <span className="text-xs text-gray-400">{trendLabel}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};