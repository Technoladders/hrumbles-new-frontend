// src/components/sales/contacts-table/filters/PipelineStagesFilter.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PipelineStagesFilterProps {
  selectedStages: string[];
  onSelectionChange: (stages: string[]) => void;
  fileId?: string | null;
}

export const PipelineStagesFilter: React.FC<PipelineStagesFilterProps> = ({
  selectedStages,
  onSelectionChange,
  fileId = null,
}) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);

  // Fetch unique pipeline stages with counts from database
  const { data: stages = [], isLoading } = useQuery({
    queryKey: ['pipeline-stages', organization_id, fileId],
    queryFn: async () => {
      let query;
      
      if (fileId) {
        // For file-specific view
        query = supabase
          .from('contact_workspace_files')
          .select(`
            contacts!inner (
              contact_stage
            )
          `)
          .eq('file_id', fileId)
          .not('contacts.contact_stage', 'is', null);
      } else {
        // For all contacts view
        query = supabase
          .from('contacts')
          .select('contact_stage')
          .eq('organization_id', organization_id)
          .not('contact_stage', 'is', null);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Process data
      const contacts = fileId 
        ? (data || []).map((item: any) => item.contacts).filter(Boolean)
        : (data || []);

      // Count stages
      const stageMap = new Map<string, number>();

      contacts.forEach((contact: any) => {
        const stage = contact.contact_stage;
        if (stage) {
          stageMap.set(stage, (stageMap.get(stage) || 0) + 1);
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
    if (selectedStages.includes(stage)) {
      onSelectionChange(selectedStages.filter(s => s !== stage));
    } else {
      onSelectionChange([...selectedStages, stage]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
        <span className="ml-2 text-xs text-slate-500">Loading stages...</span>
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-xs text-slate-500">No pipeline stages found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {stages.map((stage) => {
        const isSelected = selectedStages.includes(stage.name);

        return (
          <div 
            key={stage.name}
            className="flex items-center justify-between group hover:bg-slate-50 rounded px-2 py-1.5 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`stage-${stage.name}`}
                checked={isSelected}
                onCheckedChange={() => toggleStage(stage.name)}
                className="h-3.5 w-3.5"
              />
              <label
                htmlFor={`stage-${stage.name}`}
                className={cn(
                  "text-xs cursor-pointer transition-colors",
                  isSelected ? "text-slate-900 font-medium" : "text-slate-600"
                )}
              >
                {stage.name}
              </label>
            </div>
            <span className={cn(
              "text-[10px] tabular-nums px-1.5 py-0.5 rounded-full transition-colors",
              stage.count > 0 
                ? "text-slate-600 bg-slate-100 group-hover:bg-slate-200" 
                : "text-slate-400"
            )}>
              {stage.count.toLocaleString()}
            </span>
          </div>
        );
      })}
    </div>
  );
};