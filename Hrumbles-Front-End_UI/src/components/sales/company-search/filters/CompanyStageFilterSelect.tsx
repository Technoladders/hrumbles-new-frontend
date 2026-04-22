// src/components/sales/company-search/filters/CompanyStageFilterSelect.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { Tag, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Stage { name: string; count: number; }

interface CompanyStageFilterSelectProps {
  selectedStages: string[];
  onSelectionChange: (stages: string[]) => void;
  fileId?: string | null;
}

// Stage colour dots for dark theme
const STAGE_DOT: Record<string, string> = {
  'Identified':                      'bg-blue-400',
  'Targeting':                       'bg-indigo-400',
  'In Outreach':                     'bg-teal-400',
  'Warm':                            'bg-yellow-400',
  'Qualified Company':               'bg-green-400',
  'Proposal Sent / In Discussion':   'bg-purple-400',
  'Negotiation':                     'bg-orange-400',
  'Closed - Won':                    'bg-emerald-400',
  'Closed - Lost':                   'bg-red-400',
  'Re-engage Later':                 'bg-slate-400',
  'Active':                          'bg-green-400',
  'Intelligence':                    'bg-slate-300',
};

const getStageColor = (stage: string) => STAGE_DOT[stage] || 'bg-white/30';

export const CompanyStageFilterSelect: React.FC<CompanyStageFilterSelectProps> = ({
  selectedStages,
  onSelectionChange,
  fileId = null,
}) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  const { data: stages = [], isLoading } = useQuery({
    queryKey: ['company-stage-suggestions', organization_id, fileId],
    queryFn: async () => {
      let query = supabase.from('companies').select('stage')
        .eq('organization_id', organization_id).not('stage', 'is', null);
      if (fileId) query = query.eq('file_id', fileId);
      const { data, error } = await query;
      if (error) throw error;
      const stageMap = new Map<string, number>();
      (data || []).forEach((company: any) => {
        if (company.stage) stageMap.set(company.stage, (stageMap.get(company.stage) || 0) + 1);
      });
      return Array.from(stageMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
    },
    enabled: !!organization_id,
    staleTime: 30000,
  });

  const toggleStage = (stage: string) => {
    onSelectionChange(selectedStages.includes(stage)
      ? selectedStages.filter(s => s !== stage)
      : [...selectedStages, stage]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-3 gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
        <span className="text-xs text-white/40">Loading stages…</span>
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className="py-3 text-center">
        <Tag className="h-5 w-5 text-white/20 mx-auto mb-1" />
        <p className="text-xs text-white/40">No stages found</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
      {stages.map(stage => {
        const isSelected = selectedStages.includes(stage.name);
        return (
          <label key={stage.name} htmlFor={`stage-${stage.name}`}
            className={cn(
              'flex items-center justify-between group rounded-md px-2 py-1.5 cursor-pointer transition-colors select-none border',
              isSelected ? 'bg-indigo-500/20 border-indigo-400/35' : 'border-transparent hover:bg-white/5',
            )}>
            <div className="flex items-center gap-2">
              <input type="checkbox" id={`stage-${stage.name}`} checked={isSelected}
                onChange={() => toggleStage(stage.name)}
                className="h-3.5 w-3.5 rounded flex-shrink-0" style={{ accentColor: '#818cf8' }} />
              <span className={cn('w-2 h-2 rounded-full flex-shrink-0', getStageColor(stage.name))} />
              <span className={cn('text-xs transition-colors truncate', isSelected ? 'text-indigo-200 font-medium' : 'text-white/55')}>
                {stage.name}
              </span>
            </div>
            <span className={cn(
              'text-[10px] tabular-nums px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1 transition-colors',
              stage.count > 0 ? 'text-white/50 bg-white/10 group-hover:bg-white/15' : 'text-white/25',
            )}>
              {stage.count}
            </span>
          </label>
        );
      })}
    </div>
  );
};

export default CompanyStageFilterSelect;