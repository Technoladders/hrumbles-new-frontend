// src/components/sales/contacts-table/filters/ManagementLevelFilter.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ManagementLevelFilterProps {
  selectedLevels: string[];
  onSelectionChange: (levels: string[]) => void;
  fileId?: string | null;
}

// Management levels mapping (from seniority field)
const MANAGEMENT_LEVELS = [
  { id: 'owner', label: 'Owner', count: 0 },
  { id: 'founder', label: 'Founder', count: 0 },
  { id: 'c_suite', label: 'C-Suite', count: 0 },
  { id: 'partner', label: 'Partner', count: 0 },
  { id: 'vp', label: 'VP', count: 0 },
  { id: 'head', label: 'Head', count: 0 },
  { id: 'director', label: 'Director', count: 0 },
  { id: 'manager', label: 'Manager', count: 0 },
  { id: 'senior', label: 'Senior', count: 0 },
  { id: 'entry', label: 'Entry', count: 0 },
  { id: 'intern', label: 'Intern', count: 0 },
];

export const ManagementLevelFilter: React.FC<ManagementLevelFilterProps> = ({
  selectedLevels,
  onSelectionChange,
  fileId = null,
}) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch management level counts from enrichment data
  const { data: levelCounts = {}, isLoading } = useQuery({
    queryKey: ['management-levels', organization_id, fileId],
    queryFn: async () => {
      let query;
      
      if (fileId) {
        // For file-specific view
        query = supabase
          .from('contact_workspace_files')
          .select(`
            contacts!inner (
              intel_person:enrichment_people!contact_id (
                enrichment_person_metadata!apollo_person_id (
                  seniority
                )
              )
            )
          `)
          .eq('file_id', fileId);
      } else {
        // For all contacts view
        query = supabase
          .from('contacts')
          .select(`
            intel_person:enrichment_people!contact_id (
              enrichment_person_metadata!apollo_person_id (
                seniority
              )
            )
          `)
          .eq('organization_id', organization_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Process data based on file query structure
      const contacts = fileId 
        ? (data || []).map((item: any) => item.contacts).filter(Boolean)
        : (data || []);

      // Count seniority levels
      const counts: Record<string, number> = {};

      contacts.forEach((contact: any) => {
        const intel = contact.intel_person?.[0];
        const metadata = intel?.enrichment_person_metadata?.[0];
        const seniority = metadata?.seniority;
        
        if (seniority) {
          const seniorityKey = seniority.toLowerCase().replace(/\s+/g, '_');
          counts[seniorityKey] = (counts[seniorityKey] || 0) + 1;
        }
      });

      return counts;
    },
    enabled: !!organization_id,
    staleTime: 30000,
  });

  const toggleLevel = (levelId: string) => {
    if (selectedLevels.includes(levelId)) {
      onSelectionChange(selectedLevels.filter(l => l !== levelId));
    } else {
      onSelectionChange([...selectedLevels, levelId]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
        <span className="ml-2 text-xs text-slate-500">Loading levels...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <span className="flex items-center gap-2">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          Management Level
        </span>
        {selectedLevels.length > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
            {selectedLevels.length}
          </span>
        )}
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="space-y-1.5 pl-3 pr-1">
          {MANAGEMENT_LEVELS.map((level) => {
            const count = levelCounts[level.id] || 0;
            const isSelected = selectedLevels.includes(level.id);

            return (
              <div 
                key={level.id}
                className="flex items-center justify-between group hover:bg-slate-50 rounded px-2 py-1.5 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`mgmt-${level.id}`}
                    checked={isSelected}
                    onCheckedChange={() => toggleLevel(level.id)}
                    className="h-3.5 w-3.5"
                  />
                  <label
                    htmlFor={`mgmt-${level.id}`}
                    className={cn(
                      "text-xs cursor-pointer transition-colors",
                      isSelected ? "text-slate-900 font-medium" : "text-slate-600"
                    )}
                  >
                    {level.label}
                  </label>
                </div>
                <span className={cn(
                  "text-[10px] tabular-nums px-1.5 py-0.5 rounded-full transition-colors",
                  count > 0 
                    ? "text-slate-600 bg-slate-100 group-hover:bg-slate-200" 
                    : "text-slate-400"
                )}>
                  {count > 0 ? count.toLocaleString() : '—'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};