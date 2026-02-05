// src/components/sales/contacts-table/filters/CompanyFilterSelect.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import {
  Building2,
  Search,
  X,
  Check,
  Loader2,
  Plus,
  Globe,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface Company {
  id: number;
  name: string;
  logo_url?: string | null;
  domain?: string | null;
  industry?: string | null;
  employee_count?: number | null;
}

interface CompanyFilterSelectProps {
  selectedCompanyIds: number[];
  onSelectionChange: (ids: number[]) => void;
  includeSubsidiaries?: boolean;
  onIncludeSubsidiariesChange?: (value: boolean) => void;
  excludePastCompany?: boolean;
  onExcludePastCompanyChange?: (value: boolean) => void;
}

export const CompanyFilterSelect: React.FC<CompanyFilterSelectProps> = ({
  selectedCompanyIds,
  onSelectionChange,
  includeSubsidiaries = false,
  onIncludeSubsidiariesChange,
  excludePastCompany = false,
  onExcludePastCompanyChange,
}) => {
  const organization_id = useSelector((state: any) => state.auth.organization_id);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<'any' | 'not_any' | 'known' | 'unknown'>('any');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  // Position dropdown below input (like LocationFilterSelect)
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    } else {
      setDropdownPosition(null);
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch companies with search
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['companies-filter', organization_id, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('companies')
        .select('id, name, logo_url, domain, industry, employee_count')
        .eq('organization_id', organization_id)
        .order('name', { ascending: true })
        .limit(50);

      if (searchTerm.trim()) {
        query = query.or(`name.ilike.%${searchTerm}%,domain.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Company[];
    },
    enabled: !!organization_id,
    staleTime: 10000,
  });

  // Fetch selected companies details
  const { data: selectedCompanies = [] } = useQuery({
    queryKey: ['selected-companies', selectedCompanyIds],
    queryFn: async () => {
      if (selectedCompanyIds.length === 0) return [];

      const { data, error } = await supabase
        .from('companies')
        .select('id, name, logo_url, domain')
        .in('id', selectedCompanyIds);

      if (error) throw error;
      return data as Company[];
    },
    enabled: selectedCompanyIds.length > 0,
  });

  const toggleCompany = (companyId: number) => {
    if (selectedCompanyIds.includes(companyId)) {
      onSelectionChange(selectedCompanyIds.filter((id) => id !== companyId));
    } else {
      onSelectionChange([...selectedCompanyIds, companyId]);
    }
  };

  const removeCompany = (companyId: number) => {
    onSelectionChange(selectedCompanyIds.filter((id) => id !== companyId));
  };

  const clearAll = () => {
    onSelectionChange([]);
    setSearchTerm('');
  };

  return (
    <div className="space-y-3" ref={containerRef}>
      {/* Filter Mode Selection */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all text-xs',
              filterMode === 'any'
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
            onClick={() => setFilterMode('any')}
          >
            <div
              className={cn(
                'w-3 h-3 rounded-full border-2 flex items-center justify-center',
                filterMode === 'any' ? 'border-indigo-600' : 'border-slate-300'
              )}
            >
              {filterMode === 'any' && (
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              )}
            </div>
            <span className="font-medium">Is any of</span>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search
            className="absolute left-2.5 top-2.5 text-slate-400"
            size={14}
          />
          <Input
            ref={inputRef}
            placeholder="Enter companies..."
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

        {/* Dropdown – now fixed + positioned like Location */}
        {isOpen && dropdownPosition && (
          <div
            ref={dropdownRef}
            className="fixed z-[9999] bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
            }}
          >
            <ScrollArea className="max-h-[240px] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                  <span className="ml-2 text-xs text-slate-500">Searching...</span>
                </div>
              ) : companies.length === 0 ? (
                <div className="py-6 text-center">
                  <Building2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">
                    {searchTerm ? 'No companies found' : 'Type to search companies'}
                  </p>
                </div>
              ) : (
                <div className="py-1">
                  {companies.map((company) => {
                    const isSelected = selectedCompanyIds.includes(company.id);
                    return (
                      <div
                        key={company.id}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors',
                          isSelected
                            ? 'bg-indigo-50 hover:bg-indigo-100'
                            : 'hover:bg-slate-50'
                        )}
                        onClick={() => toggleCompany(company.id)}
                      >
                        {/* Company Logo */}
                        <div className="flex-shrink-0">
                          {company.logo_url ? (
                            <img
                              src={company.logo_url}
                              alt={company.name}
                              className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (
                                  e.target as HTMLImageElement
                                ).nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div
                            className={cn(
                              'w-8 h-8 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center',
                              company.logo_url && 'hidden'
                            )}
                          >
                            <Building2 size={14} className="text-slate-500" />
                          </div>
                        </div>

                        {/* Company Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">
                            {company.name}
                          </p>
                          {company.domain && (
                            <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                              <Globe size={9} />
                              {company.domain}
                            </p>
                          )}
                        </div>

                        {/* Selection Indicator */}
                        <div
                          className={cn(
                            'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                            isSelected
                              ? 'bg-indigo-600 border-indigo-600'
                              : 'border-slate-300'
                          )}
                        >
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
      </div>

      {/* Selected Companies Tags */}
      {selectedCompanies.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedCompanies.map((company) => (
            <Badge
              key={company.id}
              variant="secondary"
              className="pl-1.5 pr-1 py-1 bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-medium flex items-center gap-1.5"
            >
              {company.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className="w-4 h-4 rounded object-cover"
                />
              ) : (
                <div className="w-4 h-4 rounded bg-indigo-200 flex items-center justify-center">
                  <Building2 size={8} className="text-indigo-600" />
                </div>
              )}
              <span className="truncate max-w-[100px]">{company.name}</span>
              <button
                onClick={() => removeCompany(company.id)}
                className="ml-0.5 hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
              >
                <X size={10} />
              </button>
            </Badge>
          ))}

          {selectedCompanies.length > 1 && (
            <button
              onClick={clearAll}
              className="text-[10px] text-red-600 hover:text-red-700 font-medium px-1.5"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Additional Options – kept as-is */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <Checkbox
            id="filter-not-any"
            checked={filterMode === 'not_any'}
            onCheckedChange={(checked) =>
              setFilterMode(checked ? 'not_any' : 'any')
            }
            className="h-3.5 w-3.5"
          />
          <Label
            htmlFor="filter-not-any"
            className="text-[10px] text-slate-600 cursor-pointer"
          >
            Is not any of
          </Label>
        </div>

        {onIncludeSubsidiariesChange && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="include-past"
              checked={includeSubsidiaries}
              onCheckedChange={(checked) => onIncludeSubsidiariesChange(!!checked)}
              className="h-3.5 w-3.5"
            />
            <Label
              htmlFor="include-past"
              className="text-[10px] text-slate-600 cursor-pointer"
            >
              Include past company
            </Label>
          </div>
        )}

        {onExcludePastCompanyChange && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="exclude-past"
              checked={excludePastCompany}
              onCheckedChange={(checked) => onExcludePastCompanyChange(!!checked)}
              className="h-3.5 w-3.5"
            />
            <Label
              htmlFor="exclude-past"
              className="text-[10px] text-slate-600 cursor-pointer"
            >
              Exclude past company
            </Label>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Checkbox id="domain-exists" className="h-3.5 w-3.5" />
          <Label
            htmlFor="domain-exists"
            className="text-[10px] text-slate-600 cursor-pointer"
          >
            Domain exists
          </Label>
        </div>
      </div>

      {/* Is Known / Is Unknown */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex items-center gap-1.5 cursor-pointer'
            )}
            onClick={() => setFilterMode('known')}
          >
            <div
              className={cn(
                'w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center',
                filterMode === 'known' ? 'border-indigo-600' : 'border-slate-300'
              )}
            >
              {filterMode === 'known' && (
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              )}
            </div>
            <span className="text-[10px] text-slate-600">Is known</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={cn('flex items-center gap-1.5 cursor-pointer')}
            onClick={() => setFilterMode('unknown')}
          >
            <div
              className={cn(
                'w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center',
                filterMode === 'unknown' ? 'border-indigo-600' : 'border-slate-300'
              )}
            >
              {filterMode === 'unknown' && (
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
              )}
            </div>
            <span className="text-[10px] text-slate-600">Is unknown</span>
          </div>
        </div>
      </div>

      {/* Include/Exclude List Link */}
      <div className="pt-2 border-t border-slate-100">
        <button className="text-[10px] text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
          <Plus size={10} />
          Include / exclude list of companies
        </button>
      </div>
    </div>
  );
};