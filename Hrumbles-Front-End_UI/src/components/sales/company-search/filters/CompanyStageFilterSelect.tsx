// src/components/sales/company-search/filters/CompanyStageFilterSelect.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { 
  Tag, Search, X, Check, Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface Stage {
  name: string;
  count: number;
}

interface CompanyStageFilterSelectProps {
  selectedStages: string[];
  onSelectionChange: (stages: string[]) => void;
  fileId?: string | null;
}

const STAGE_COLORS: Record<string, string> = {
  'Identified': 'bg-blue-100 text-blue-700 border-blue-200',
  'Targeting': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'In Outreach': 'bg-teal-100 text-teal-700 border-teal-200',
  'Warm': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Qualified Company': 'bg-green-100 text-green-700 border-green-200',
  'Proposal Sent / In Discussion': 'bg-purple-100 text-purple-700 border-purple-200',
  'Negotiation': 'bg-orange-100 text-orange-700 border-orange-200',
  'Closed - Won': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Closed - Lost': 'bg-red-100 text-red-700 border-red-200',
  'Re-engage Later': 'bg-gray-100 text-gray-700 border-gray-200',
  'Active': 'bg-green-100 text-green-700 border-green-200',
  'Intelligence': 'bg-slate-100 text-slate-600 border-slate-200',
  'default': 'bg-slate-100 text-slate-600 border-slate-200',
};

export const CompanyStageFilterSelect: React.FC<CompanyStageFilterSelectProps> = ({
  selectedStages,
  onSelectionChange,
  fileId = null,
}) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  // Fetch stages from companies table
  const { data: stages = [], isLoading } = useQuery({
    queryKey: ['company-stage-suggestions', organization_id, fileId],
    queryFn: async () => {
      let query = supabase
        .from('companies')
        .select('stage')
        .eq('organization_id', organization_id)
        .not('stage', 'is', null);

      if (fileId) {
        query = query.eq('file_id', fileId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Count stages
      const stageMap = new Map<string, number>();

      (data || []).forEach((company: any) => {
        if (company.stage) {
          stageMap.set(company.stage, (stageMap.get(company.stage) || 0) + 1);
        }
      });

      // Convert to array and sort by count
      return Array.from(stageMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    },
    enabled: !!organization_id,
    staleTime: 30000,
  });

  const toggleStage = (stage: string) => {
    const newStages = selectedStages.includes(stage)
      ? selectedStages.filter(s => s !== stage)
      : [...selectedStages, stage];
    
    onSelectionChange(newStages);
  };

  const getStageColor = (stage: string) => {
    return STAGE_COLORS[stage] || STAGE_COLORS.default;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-3">
        <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
        <span className="ml-2 text-xs text-slate-500">Loading stages...</span>
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className="py-3 text-center">
        <Tag className="h-5 w-5 text-slate-300 mx-auto mb-1" />
        <p className="text-xs text-slate-500">No stages found</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
      {stages.map((stage) => {
        const isSelected = selectedStages.includes(stage.name);
        
        return (
          <div
            key={stage.name}
            className="flex items-center justify-between group hover:bg-slate-50 rounded px-1.5 py-1.5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Checkbox
                id={`stage-${stage.name}`}
                checked={isSelected}
                onCheckedChange={() => toggleStage(stage.name)}
                className="h-3.5 w-3.5"
              />
              <label
                htmlFor={`stage-${stage.name}`}
                className="cursor-pointer flex items-center gap-2"
              >
                <Badge 
                  variant="outline"
                  className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5",
                    getStageColor(stage.name)
                  )}
                >
                  {stage.name}
                </Badge>
              </label>
            </div>
            <span className={cn(
              "text-[10px] tabular-nums px-1.5 py-0.5 rounded-full transition-colors",
              stage.count > 0 
                ? "text-slate-600 bg-slate-100 group-hover:bg-slate-200" 
                : "text-slate-400"
            )}>
              {stage.count}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default CompanyStageFilterSelect;