import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface ChartData {
  name: string;
  value: number;
  color: string;
}

interface MiniChartCardProps {
  title: string;
  data: ChartData[];
  chartType: 'pie' | 'bar';
  onLegendClick?: (name: string) => void;
  activeItems?: Set<string>;
}

const MiniChartCard: React.FC<MiniChartCardProps> = ({ 
  title, 
  data, 
  chartType,
  onLegendClick,
  activeItems 
}) => {
  const handleLegendClick = (name: string) => {
    if (onLegendClick) {
      onLegendClick(name);
    }
  };

  const renderCustomLegend = () => (
    <div className="space-y-2 mt-4">
      {data.map((entry, index) => {
        const isActive = !activeItems || activeItems.has(entry.name);
        return (
          <button
            key={`legend-${index}`}
            onClick={() => handleLegendClick(entry.name)}
            className={`flex items-center justify-between w-full px-2 py-1.5 rounded-md transition-all ${
              isActive 
                ? 'bg-slate-50 border border-slate-300 font-semibold' 
                : 'bg-white border border-slate-100 opacity-50 hover:opacity-75'
            } ${onLegendClick ? 'cursor-pointer' : ''}`}
          >
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-gray-700">{entry.name}</span>
            </div>
            <span className="text-xs font-semibold text-gray-600">
              {chartType === 'bar' 
                ? entry.value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
                : entry.value.toLocaleString()
              }
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <Card className="shadow-lg border-none overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-gray-700">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {data.length > 0 ? (
          <>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => value.toLocaleString()} />
                  </PieChart>
                ) : (
                  <BarChart data={data} layout="horizontal">
                    <XAxis type="category" dataKey="name" hide />
                    <YAxis type="number" hide />
                    <Tooltip 
                      formatter={(value: number) => value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                      cursor={{ fill: 'rgba(123, 67, 241, 0.1)' }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
            {renderCustomLegend()}
          </>
        ) : (
          <div className="h-[180px] flex items-center justify-center text-gray-400 text-sm">
            No data available
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MiniChartCard;