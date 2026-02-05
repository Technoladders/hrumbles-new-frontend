// src/components/sales/contacts-table/filters/DepartmentsFilter.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DepartmentsFilterProps {
  selectedDepartments: string[];
  selectedFunctions: string[];
  onDepartmentsChange: (departments: string[]) => void;
  onFunctionsChange: (functions: string[]) => void;
  fileId?: string | null;
}

// Department categories with their functions
const DEPARTMENT_STRUCTURE = {
  'C-Suite': ['ceo', 'cfo', 'coo', 'cto', 'cmo'],
  'Executive': ['president', 'vp', 'director', 'head'],
  'Finance Executive': ['finance', 'accounting', 'treasury'],
  'Human Resources': ['hr', 'recruiting', 'talent', 'people_operations'],
  'Information Technology': ['it', 'engineering', 'software', 'infrastructure', 'security'],
  'Founder': ['founder', 'co_founder', 'entrepreneurship'],
  // Add more as needed
};

export const DepartmentsFilter: React.FC<DepartmentsFilterProps> = ({
  selectedDepartments,
  selectedFunctions,
  onDepartmentsChange,
  onFunctionsChange,
  fileId = null,
}) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  // Fetch departments and functions from enrichment data
  const { data, isLoading } = useQuery({
    queryKey: ['departments-functions-tree', organization_id, fileId],
    queryFn: async () => {
      let query;
      
      if (fileId) {
        query = supabase
          .from('contact_workspace_files')
          .select(`
            contacts!inner (
              intel_person:enrichment_people!contact_id (
                enrichment_person_metadata!apollo_person_id (
                  departments,
                  functions
                )
              )
            )
          `)
          .eq('file_id', fileId);
      } else {
        query = supabase
          .from('contacts')
          .select(`
            intel_person:enrichment_people!contact_id (
              enrichment_person_metadata!apollo_person_id (
                departments,
                functions
              )
            )
          `)
          .eq('organization_id', organization_id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const contacts = fileId 
        ? (data || []).map((item: any) => item.contacts).filter(Boolean)
        : (data || []);

      // Count departments and functions
      const departmentCounts: Record<string, number> = {};
      const functionCounts: Record<string, number> = {};

      contacts.forEach((contact: any) => {
        const intel = contact.intel_person?.[0];
        const metadata = intel?.enrichment_person_metadata?.[0];
        
        if (metadata?.departments && Array.isArray(metadata.departments)) {
          metadata.departments.forEach((dept: string) => {
            departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
          });
        }

        if (metadata?.functions && Array.isArray(metadata.functions)) {
          metadata.functions.forEach((func: string) => {
            functionCounts[func] = (functionCounts[func] || 0) + 1;
          });
        }
      });

      return { departmentCounts, functionCounts };
    },
    enabled: !!organization_id,
    staleTime: 30000,
  });

  const toggleDepartment = (dept: string) => {
    if (selectedDepartments.includes(dept)) {
      onDepartmentsChange(selectedDepartments.filter(d => d !== dept));
    } else {
      onDepartmentsChange([...selectedDepartments, dept]);
    }
  };

  const toggleFunction = (func: string) => {
    if (selectedFunctions.includes(func)) {
      onFunctionsChange(selectedFunctions.filter(f => f !== func));
    } else {
      onFunctionsChange([...selectedFunctions, func]);
    }
  };

  const toggleDeptExpansion = (dept: string) => {
    const newExpanded = new Set(expandedDepts);
    if (newExpanded.has(dept)) {
      newExpanded.delete(dept);
    } else {
      newExpanded.add(dept);
    }
    setExpandedDepts(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
        <span className="ml-2 text-xs text-slate-500">Loading...</span>
      </div>
    );
  }

  const departmentCounts = data?.departmentCounts || {};
  const functionCounts = data?.functionCounts || {};

  // Get all unique departments and functions from data
  const allDepartments = Object.keys(departmentCounts);
  const allFunctions = Object.keys(functionCounts);

  // Build tree structure based on actual data
  const treeStructure: Record<string, string[]> = {};
  
  allDepartments.forEach(dept => {
    // Check if this department matches any category
    let matched = false;
    for (const [category, funcs] of Object.entries(DEPARTMENT_STRUCTURE)) {
      if (funcs.includes(dept.toLowerCase().replace(/\s+/g, '_'))) {
        if (!treeStructure[category]) {
          treeStructure[category] = [];
        }
        treeStructure[category].push(dept);
        matched = true;
        break;
      }
    }
    // If no match, create a category for it
    if (!matched) {
      if (!treeStructure['Other Departments']) {
        treeStructure['Other Departments'] = [];
      }
      treeStructure['Other Departments'].push(dept);
    }
  });

  // Add functions to appropriate categories or standalone
  allFunctions.forEach(func => {
    let matched = false;
    for (const [category, funcs] of Object.entries(DEPARTMENT_STRUCTURE)) {
      if (funcs.includes(func.toLowerCase().replace(/\s+/g, '_'))) {
        if (!treeStructure[category]) {
          treeStructure[category] = [];
        }
        if (!treeStructure[category].includes(func)) {
          treeStructure[category].push(func);
        }
        matched = true;
        break;
      }
    }
    if (!matched) {
      if (!treeStructure['Other Functions']) {
        treeStructure['Other Functions'] = [];
      }
      treeStructure['Other Functions'].push(func);
    }
  });

  const totalSelected = selectedDepartments.length + selectedFunctions.length;

  return (
    <div className="space-y-2">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <span className="flex items-center gap-2">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          Departments & Job Function
        </span>
        {totalSelected > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
            {totalSelected}
          </span>
        )}
      </button>

      {/* Tree Structure Content */}
      {isExpanded && (
        <div className="pl-3 pr-1 space-y-1">
          {Object.entries(treeStructure).map(([category, items]) => {
            const isExpanded = expandedDepts.has(category);
            const categoryCount = items.reduce((sum, item) => {
              return sum + (departmentCounts[item] || functionCounts[item] || 0);
            }, 0);

            return (
              <div key={category} className="space-y-1">
                {/* Category Header */}
                <button
                  onClick={() => toggleDeptExpansion(category)}
                  className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    {isExpanded ? (
                      <ChevronDown size={12} className="text-slate-400" />
                    ) : (
                      <ChevronRight size={12} className="text-slate-400" />
                    )}
                    <span className="text-xs font-medium text-slate-700">
                      {category}
                    </span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-slate-200">
                    {categoryCount > 0 ? categoryCount.toLocaleString() : '—'}
                  </span>
                </button>

                {/* Category Items */}
                {isExpanded && (
                  <div className="pl-4 space-y-1">
                    {items.map((item) => {
                      const count = departmentCounts[item] || functionCounts[item] || 0;
                      const isDept = departmentCounts[item] !== undefined;
                      const isSelected = isDept 
                        ? selectedDepartments.includes(item)
                        : selectedFunctions.includes(item);

                      return (
                        <div
                          key={item}
                          className="flex items-center justify-between group hover:bg-slate-50 rounded px-2 py-1.5 transition-colors"
                        >
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`item-${item}`}
                              checked={isSelected}
                              onCheckedChange={() => {
                                if (isDept) {
                                  toggleDepartment(item);
                                } else {
                                  toggleFunction(item);
                                }
                              }}
                              className="h-3.5 w-3.5"
                            />
                            <label
                              htmlFor={`item-${item}`}
                              className={cn(
                                "text-xs cursor-pointer transition-colors capitalize",
                                isSelected ? "text-slate-900 font-medium" : "text-slate-600"
                              )}
                            >
                              {item.replace(/_/g, ' ')}
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
          })}
        </div>
      )}
    </div>
  );
};