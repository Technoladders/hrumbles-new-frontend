// src/components/sales/company-search/filters/CompanyIndustryFilterSelect.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSelector } from 'react-redux';
import { Factory, Search, X, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Dark theme shared styles ─────────────────────────────────────────────────

const DARK_INPUT = [
  'w-full h-8 text-xs rounded-lg',
  'border border-white/12',
  'placeholder:text-white/35 placeholder:italic placeholder:text-[10px]',
  'focus:outline-none focus:ring-1 focus:ring-indigo-400/50 focus:border-indigo-400/50',
  'transition-all',
].join(' ');

const DARK_INPUT_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.75)',
  WebkitTextFillColor: 'rgba(255,255,255,0.75)',
  caretColor: 'rgba(255,255,255,0.75)',
};

interface Industry { name: string; count: number; }

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        inputRef.current && !inputRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        containerRef.current && !containerRef.current.contains(target)
      ) setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const { data: industries = [], isLoading } = useQuery({
    queryKey: ['company-industry-suggestions', organization_id, searchTerm, fileId],
    queryFn: async () => {
      let query = supabase.from('companies').select('industry')
        .eq('organization_id', organization_id).not('industry', 'is', null);
      if (fileId) query = query.eq('file_id', fileId);
      const { data, error } = await query;
      if (error) throw error;
      const industryMap = new Map<string, number>();
      (data || []).forEach((company: any) => {
        if (company.industry) {
          const industry = company.industry.trim();
          industryMap.set(industry, (industryMap.get(industry) || 0) + 1);
        }
      });
      let arr = Array.from(industryMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
      if (searchTerm.trim()) arr = arr.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
      return arr.slice(0, 50);
    },
    enabled: !!organization_id,
    staleTime: 30000,
  });

  const toggleIndustry = (industry: string) => {
    onSelectionChange(selectedIndustries.includes(industry)
      ? selectedIndustries.filter(i => i !== industry)
      : [...selectedIndustries, industry]);
  };

  const removeIndustry = (industry: string) => onSelectionChange(selectedIndustries.filter(i => i !== industry));
  const clearAll = () => { onSelectionChange([]); setSearchTerm(''); };

  return (
    <div className="space-y-2" ref={containerRef}>
      {/* Selected chips */}
      {selectedIndustries.length > 0 && (
        <div className="flex flex-wrap gap-1 max-h-14 overflow-y-auto">
          {selectedIndustries.map(industry => (
            <span key={industry}
              className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
              <span className="truncate max-w-[90px] capitalize">{industry}</span>
              <button onClick={() => removeIndustry(industry)} className="ml-0.5 hover:opacity-60"><X size={9} /></button>
            </span>
          ))}
          {selectedIndustries.length > 1 && (
            <button onClick={clearAll} className="text-[10px] text-red-400 hover:text-red-300 font-medium self-center ml-1">Clear</button>
          )}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2 text-white/40 pointer-events-none" size={11} />
        <input ref={inputRef} placeholder="Search industries…" className={cn(DARK_INPUT, 'pl-7 pr-7')} style={DARK_INPUT_STYLE}
          value={searchTerm}
          onChange={e => { setSearchTerm(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)} />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2 text-white/40 hover:text-white/70"><X size={11} /></button>
        )}
        {selectedIndustries.length > 0 && !searchTerm && (
          <span className="absolute right-2 top-1.5 bg-emerald-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center pointer-events-none">{selectedIndustries.length}</span>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && dropdownPosition && (
        <div ref={dropdownRef}
          className="fixed z-[9999] border border-white/15 rounded-lg shadow-2xl overflow-hidden"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            background: 'rgba(15,12,40,0.97)',
            backdropFilter: 'blur(16px)',
          }}>
          <div className="max-h-[220px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-4 gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                <span className="text-xs text-white/50">Loading…</span>
              </div>
            ) : industries.length === 0 ? (
              <div className="py-4 text-center">
                <Factory className="h-6 w-6 text-white/20 mx-auto mb-1" />
                <p className="text-xs text-white/40">{searchTerm ? 'No industries found' : 'No industries available'}</p>
              </div>
            ) : (
              <div className="py-1">
                {industries.map(industry => {
                  const isSelected = selectedIndustries.includes(industry.name);
                  return (
                    <div key={industry.name}
                      className={cn('flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors', isSelected ? 'bg-emerald-500/15' : 'hover:bg-white/5')}
                      onClick={() => toggleIndustry(industry.name)}>
                      <div className={cn('w-5 h-5 rounded flex items-center justify-center flex-shrink-0', isSelected ? 'bg-emerald-500/30' : 'bg-white/10')}>
                        <Factory size={11} className={isSelected ? 'text-emerald-400' : 'text-white/40'} />
                      </div>
                      <span className="flex-1 text-xs font-medium text-white/70 truncate capitalize">{industry.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/40 tabular-nums">{industry.count}</span>
                      <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                        isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-white/20')}>
                        {isSelected && <Check size={9} className="text-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyIndustryFilterSelect;