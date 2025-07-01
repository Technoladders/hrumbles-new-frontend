
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, LineChart, Line } from "recharts";

interface StatsCardProps {
  title: string;
  value: string;
  changePercent?: number;
  changeIsPositive?: boolean;
  subtitle: string;
  chartData: any[];
  isPercentage?: boolean;
  showChangePercent?: boolean;
}

export function StatsCard({ 
  title, 
  value, 
  changePercent = 0, 
  changeIsPositive = true, 
  subtitle, 
  chartData,
  isPercentage = false,
  showChangePercent = true
}: StatsCardProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-sm text-gray-500 font-medium">{title}</h3>
          {showChangePercent && (
            <div className={`flex items-center text-xs font-medium ${changeIsPositive ? 'text-emerald-500' : 'text-red-500'}`}>
              {changeIsPositive ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
              {changePercent}%
            </div>
          )}
        </div>
        
        <div className="mb-6">
          <h2 className="text-2xl font-bold">{value}</h2>
        </div>
        
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            {isPercentage ? (
              <LineChart data={chartData}>
                <Line 
                  type="monotone" 
                  dataKey="hours" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  dot={false} 
                  animationDuration={1500}
                />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <Bar 
                  dataKey="hours" 
                  fill="#6366f1" 
                  radius={[4, 4, 0, 0]}
                  animationDuration={1500}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
        
        <div className="text-xs text-gray-500 mt-2">
          {subtitle}
        </div>
      </CardContent>
    </Card>
  );
}
