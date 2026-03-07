// src/components/sales/contacts-table/filters/PipelineStagesFilter.tsx
// Uses pre-fetched stats from useFilterStatistics instead of a separate query.
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const STAGE_COLORS: Record<string, string> = {
  'Prospect':    'bg-slate-100 text-slate-600',
  'Identified':  'bg-blue-100 text-blue-700',
  'Contacted':   'bg-indigo-100 text-indigo-700',
  'Qualified':   'bg-violet-100 text-violet-700',
  'Proposal':    'bg-amber-100 text-amber-700',
  'Negotiation': 'bg-orange-100 text-orange-700',
  'Won':         'bg-emerald-100 text-emerald-700',
  'Lost':        'bg-red-100 text-red-700',
  'Discovery':   'bg-purple-100 text-purple-700',
};

interface PipelineStagesFilterProps {
  selectedStages:    string[];
  onSelectionChange: (stages: string[]) => void;
  fileId?:           string | null;
  // Accept pre-fetched stage counts to avoid a duplicate query
  stageCounts?:      Record<string, number>;
}

export const PipelineStagesFilter: React.FC<PipelineStagesFilterProps> = ({
  selectedStages, onSelectionChange, fileId = null, stageCounts,
}) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  const { data: stages = [], isLoading } = useQuery({
    queryKey: ['pipeline-stages', organization_id, fileId],
    queryFn: async () => {
      // If stage counts are passed in from the parent stats, use them directly
      if (stageCounts && Object.keys(stageCounts).length > 0) {
        return Object.entries(stageCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
      }

      // Otherwise fetch from DB
      let q;
      if (fileId) {
        q = supabase
          .from('contact_workspace_files')
          .select('contacts!inner(contact_stage)')
          .eq('file_id', fileId)
          .not('contacts.contact_stage', 'is', null);
      } else {
        q = supabase
          .from('contacts')
          .select('contact_stage')
          .eq('organization_id', organization_id)
          .not('contact_stage', 'is', null);
      }
      const { data, error } = await q;
      if (error) throw error;
      const rows = fileId
        ? (data || []).map((r: any) => r.contacts).filter(Boolean)
        : (data || []);
      const map = new Map<string, number>();
      rows.forEach((c: any) => {
        const s = c.contact_stage;
        if (s) map.set(s, (map.get(s) || 0) + 1);
      });
      return Array.from(map.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    },
    enabled: !!organization_id && !stageCounts,
    staleTime: 30_000,
  });

  // When stageCounts are provided from parent, build the list directly
  const displayStages = stageCounts && Object.keys(stageCounts).length > 0
    ? Object.entries(stageCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
    : stages;

  if (isLoading && !stageCounts) {
    return (
      <div className="flex items-center justify-center py-4 gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
        <span className="text-xs text-slate-500">Loading…</span>
      </div>
    );
  }

  if (displayStages.length === 0) {
    return <p className="text-xs text-slate-400 py-2 text-center">No pipeline stages found</p>;
  }

  return (
    <div className="space-y-0.5 pt-1">
      {displayStages.map(stage => {
        const isSelected = selectedStages.includes(stage.name);
        const colorClass = STAGE_COLORS[stage.name] || 'bg-slate-100 text-slate-600';
        return (
          <label
            key={stage.name}
            className={cn(
              'flex items-center justify-between rounded-lg px-2 py-1.5 cursor-pointer transition-colors',
              isSelected ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50',
            )}
          >
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => {
                  const next = isSelected
                    ? selectedStages.filter(s => s !== stage.name)
                    : [...selectedStages, stage.name];
                  onSelectionChange(next);
                }}
                className="h-3.5 w-3.5 rounded accent-indigo-600"
              />
              <span className={cn(
                'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                colorClass,
              )}>
                {stage.name}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 tabular-nums">
              {stage.count.toLocaleString()}
            </span>
          </label>
        );
      })}
    </div>
  );
};