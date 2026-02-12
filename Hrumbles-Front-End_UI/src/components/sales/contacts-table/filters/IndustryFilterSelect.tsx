// src/components/sales/contacts-table/filters/IndustryFilterSelect.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { 
  Factory, Search, X, Check, Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Industry {
  name: string;
  count: number;
}

interface IndustryFilterSelectProps {
  selectedIndustries: string[];
  onSelectionChange: (industries: string[]) => void;
  fileId?: string | null;
}

export const IndustryFilterSelect: React.FC<IndustryFilterSelectProps> = ({
  selectedIndustries,
  onSelectionChange,
  fileId = null,
}) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    } else {
      setDropdownPosition(null);
    }
  }, [isOpen]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        inputRef.current && !inputRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        containerRef.current && !containerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Fetch industries from enrichment data
  const { data: industries = [], isLoading } = useQuery({
    queryKey: ['industry-suggestions', organization_id, searchTerm, fileId],
    queryFn: async () => {
      let query;
      
      if (fileId) {
        // For file-specific view
        query = supabase
          .from('contact_workspace_files')
          .select(`
            contacts!inner (
              intel_person:enrichment_people!contact_id (
                enrichment_organizations (
                  industry
                )
              )
            )
          `)
          .eq('file_id', fileId)
          .not('contacts.intel_person.enrichment_organizations.industry', 'is', null);
      } else {
        // For all contacts view
        query = supabase
          .from('contacts')
          .select(`
            intel_person:enrichment_people!contact_id (
              enrichment_organizations (
                industry
              )
            )
          `)
          .eq('organization_id', organization_id)
          .not('intel_person.enrichment_organizations.industry', 'is', null);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Process data
      const contacts = fileId 
        ? (data || []).map((item: any) => item.contacts).filter(Boolean)
        : (data || []);

      // Count industries
      const industryMap = new Map<string, number>();

      contacts.forEach((contact: any) => {
        const intel = contact.intel_person?.[0];
        const industry = intel?.enrichment_organizations?.industry;
        
        if (industry) {
          industryMap.set(industry, (industryMap.get(industry) || 0) + 1);
        }
      });

      // Convert to array and sort by count
      let industryArray = Array.from(industryMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

      // Filter by search term
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        industryArray = industryArray.filter(item => 
          item.name.toLowerCase().includes(searchLower)
        );
      }

      return industryArray.slice(0, 50);
    },
    enabled: !!organization_id,
    staleTime: 30000,
  });

  const toggleIndustry = (industry: string) => {
    const newIndustries = selectedIndustries.includes(industry)
      ? selectedIndustries.filter(i => i !== industry)
      : [...selectedIndustries, industry];
    
    onSelectionChange(newIndustries);
  };

  const removeIndustry = (industry: string) => {
    onSelectionChange(selectedIndustries.filter(i => i !== industry));
  };

  const clearAll = () => {
    onSelectionChange([]);
    setSearchTerm('');
  };

  return (
    <div className="space-y-3" ref={containerRef}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
        <Input
          ref={inputRef}
          placeholder="Search industries..."
          className="pl-8 pr-8 h-9 text-xs border-slate-200"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && dropdownPosition && (
        <div 
          ref={dropdownRef}
          className="fixed z-[9999] bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
        >
          <ScrollArea className="max-h-[240px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                <span className="ml-2 text-xs text-slate-500">Searching...</span>
              </div>
            ) : industries.length === 0 ? (
              <div className="py-6 text-center">
                <Factory className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">
                  {searchTerm ? 'No industries found' : 'Type to search industries'}
                </p>
              </div>
            ) : (
              <div className="py-1">
                {industries.map((industry) => {
                  const isSelected = selectedIndustries.includes(industry.name);
                  
                  return (
                    <div
                      key={industry.name}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                        isSelected 
                          ? "bg-emerald-50 hover:bg-emerald-100" 
                          : "hover:bg-slate-50"
                      )}
                      onClick={() => toggleIndustry(industry.name)}
                    >
                      {/* Industry Icon */}
                      <div className="flex-shrink-0">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          isSelected 
                            ? "bg-emerald-100" 
                            : "bg-gradient-to-br from-slate-100 to-slate-200"
                        )}>
                          <Factory size={14} className={isSelected ? "text-emerald-600" : "text-slate-500"} />
                        </div>
                      </div>

                      {/* Industry Name */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">
                          {industry.name}
                        </p>
                      </div>

                      {/* Count Badge */}
                      <Badge 
                        variant="secondary" 
                        className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5"
                      >
                        {industry.count}
                      </Badge>

                      {/* Selection Indicator */}
                      <div className={cn(
                        "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                        isSelected 
                          ? "bg-emerald-600 border-emerald-600" 
                          : "border-slate-300"
                      )}>
                        {isSelected && <Check size={12} className="text-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* Selected Industries Tags */}
      {selectedIndustries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedIndustries.map((industry) => (
            <Badge
              key={industry}
              variant="secondary"
              className="pl-1.5 pr-1 py-1 bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-medium flex items-center gap-1.5"
            >
              <div className="w-4 h-4 rounded bg-emerald-200 flex items-center justify-center">
                <Factory size={8} className="text-emerald-600" />
              </div>
              <span className="truncate max-w-[150px]">{industry}</span>
              <button
                onClick={() => removeIndustry(industry)}
                className="ml-0.5 hover:bg-emerald-200 rounded-full p-0.5 transition-colors"
              >
                <X size={10} />
              </button>
            </Badge>
          ))}
          {selectedIndustries.length > 1 && (
            <button
              onClick={clearAll}
              className="text-[10px] text-red-600 hover:text-red-700 font-medium px-1.5"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
};