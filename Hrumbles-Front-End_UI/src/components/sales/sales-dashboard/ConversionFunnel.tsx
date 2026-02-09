// Hrumbles-Front-End_UI/src/components/sales/sales-dashboard/ConversionFunnel.tsx
import React from 'react';
import { cn } from '@/lib/utils';

interface ConversionFunnelProps {
  stageCounts: Record<string, number>;
}

const STAGES = [
  { key: 'lead', label: 'Lead', color: '#3B82F6' },
  { key: 'contacted', label: 'Contacted', color: '#8B5CF6' },
  { key: 'qualified', label: 'Qualified', color: '#F59E0B' },
  { key: 'proposal', label: 'Proposal', color: '#F97316' },
  { key: 'negotiation', label: 'Negotiation', color: '#EC4899' },
  { key: 'closed_won', label: 'Closed Won', color: '#10B981' },
  { key: 'closed_lost', label: 'Closed Lost', color: '#EF4444' },
];

export const ConversionFunnel: React.FC<ConversionFunnelProps> = ({ stageCounts }) => {
  const total = Object.values(stageCounts).reduce((sum, count) => sum + count, 0);
  const maxCount = Math.max(...Object.values(stageCounts), 1);
  const activeFunnel = STAGES.filter(s => s.key !== 'closed_lost');
  const closedLost = stageCounts.closed_lost || 0;

  const getConversionRate = (fromKey: string, toKey: string) => {
    const fromCount = stageCounts[fromKey] || 0;
    const toCount = stageCounts[toKey] || 0;
    if (fromCount === 0) return 0;
    return Math.round((toCount / fromCount) * 100);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 h-full">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">Pipeline Overview</h3>
        <p className="text-xs text-gray-500 mt-0.5">{total} total contacts</p>
      </div>

      <div className="space-y-2 mb-6">
        {activeFunnel.map((stage, index) => {
          const count = stageCounts[stage.key] || 0;
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
          const barWidth = maxCount > 0 ? Math.max((count / maxCount) * 100, 8) : 8;
          const prevStage = index > 0 ? activeFunnel[index - 1] : null;
          const conversionRate = prevStage ? getConversionRate(prevStage.key, stage.key) : null;

          return (
            <div key={stage.key} className="group relative">
              {conversionRate !== null && index > 0 && (
                <div className="absolute -top-1.5 left-1/2 transform -translate-x-1/2 -translate-y-full">
                  <span className="text-[9px] text-gray-400 bg-white px-1">{conversionRate}%</span>
                </div>
              )}
              
              <div 
                className="relative h-9 rounded-lg overflow-hidden flex items-center transition-all"
                style={{ 
                  width: `${barWidth}%`,
                  backgroundColor: `${stage.color}15`,
                  marginLeft: `${(100 - barWidth) / 2}%`
                }}
              >
                <div className="absolute inset-0 opacity-30" style={{ backgroundColor: stage.color }} />
                <div className="relative flex items-center justify-between w-full px-3">
                  <span className="text-xs font-medium" style={{ color: stage.color }}>{stage.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{count}</span>
                    <span className="text-[10px] text-gray-400">({percentage}%)</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {closedLost > 0 && (
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between p-2 rounded-lg bg-red-50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs font-medium text-red-700">Closed Lost</span>
            </div>
            <span className="text-sm font-bold text-red-700">{closedLost}</span>
          </div>
        </div>
      )}

      <div className="mt-4 p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-green-700 font-medium">Win Rate</p>
            <p className="text-xs text-green-600 mt-0.5">Won / (Won + Lost)</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-700">
              {(() => {
                const won = stageCounts.closed_won || 0;
                const lost = stageCounts.closed_lost || 0;
                const totalClosed = won + lost;
                return totalClosed > 0 ? Math.round((won / totalClosed) * 100) : 0;
              })()}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};