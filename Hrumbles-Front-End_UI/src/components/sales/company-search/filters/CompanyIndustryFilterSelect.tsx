// src/components/sales/company-search/filters/CompanyIndustryFilterSelect.tsx
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

interface CompanyIndustryFilterSelectProps {
  selectedIndustries: string[];
  onSelectionChange: (industries: string[]) => void;
  fileId?: string | null;
}

export const CompanyIndustryFilterSelect: React.FC<CompanyIndustryFilterSelectProps> = ({
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

  // Fetch industries from companies table
  const { data: industries = [], isLoading } = useQuery({
    queryKey: ['company-industry-suggestions', organization_id, searchTerm, fileId],
    queryFn: async () => {
      let query = supabase
        .from('companies')
        .select('industry')
        .eq('organization_id', organization_id)
        .not('industry', 'is', null);

      if (fileId) {
        query = query.eq('file_id', fileId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Count industries
      const industryMap = new Map<string, number>();

      (data || []).forEach((company: any) => {
        if (company.industry) {
          const industry = company.industry.trim();
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
    <div className="space-y-2" ref={containerRef}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2 text-slate-400" size={14} />
        <Input
          ref={inputRef}
          placeholder="Search industries..."
          className="pl-8 pr-8 h-8 text-xs border-slate-200"
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
            className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
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
          <ScrollArea className="max-h-[220px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                <span className="ml-2 text-xs text-slate-500">Loading...</span>
              </div>
            ) : industries.length === 0 ? (
              <div className="py-4 text-center">
                <Factory className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                <p className="text-xs text-slate-500">
                  {searchTerm ? 'No industries found' : 'No industries available'}
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
                        "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors",
                        isSelected 
                          ? "bg-emerald-50 hover:bg-emerald-100" 
                          : "hover:bg-slate-50"
                      )}
                      onClick={() => toggleIndustry(industry.name)}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded flex items-center justify-center flex-shrink-0",
                        isSelected ? "bg-emerald-100" : "bg-slate-100"
                      )}>
                        <Factory size={12} className={isSelected ? "text-emerald-600" : "text-slate-500"} />
                      </div>

                      <span className="flex-1 text-xs font-medium text-slate-700 truncate capitalize">
                        {industry.name}
                      </span>

                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 tabular-nums">
                        {industry.count}
                      </span>

                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                        isSelected 
                          ? "bg-emerald-600 border-emerald-600" 
                          : "border-slate-300"
                      )}>
                        {isSelected && <Check size={10} className="text-white" />}
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
        <div className="flex flex-wrap gap-1">
          {selectedIndustries.slice(0, 3).map((industry) => (
            <Badge
              key={industry}
              variant="secondary"
              className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-medium flex items-center gap-1"
            >
              <span className="truncate max-w-[80px] capitalize">{industry}</span>
              <button
                onClick={() => removeIndustry(industry)}
                className="hover:bg-emerald-200 rounded-full p-0.5"
              >
                <X size={10} />
              </button>
            </Badge>
          ))}
          {selectedIndustries.length > 3 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
              +{selectedIndustries.length - 3}
            </Badge>
          )}
          {selectedIndustries.length > 1 && (
            <button
              onClick={clearAll}
              className="text-[10px] text-red-600 hover:text-red-700 font-medium"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CompanyIndustryFilterSelect;