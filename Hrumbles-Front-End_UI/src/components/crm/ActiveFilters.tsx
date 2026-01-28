import React from 'react';
import { X, FilterX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCRMStore } from '@/stores/crmStore';

export function ActiveFilters() {
  const { filters, toggleFilterValue, clearAllFilters, tableSearch, setTableSearch } = useCRMStore();
  
  const activeFilters: { key: string; value: string }[] = [];
  
  Object.entries(filters).forEach(([key, values]) => {
    if (Array.isArray(values)) {
      values.forEach((value) => {
        activeFilters.push({ key, value });
      });
    }
  });
  
  const hasFilters = activeFilters.length > 0 || tableSearch.trim() !== '';
  
  if (!hasFilters) return null;
  
  return (
    <div className="px-6 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 flex-wrap min-h-[44px]">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">
        Filtered By:
      </span>
      
      {tableSearch.trim() && (
        <Badge variant="secondary" className="bg-indigo-600 text-white border-none py-1 pl-3 pr-1 h-6 flex items-center gap-1">
          <span className="text-xs font-medium italic">Search: "{tableSearch}"</span>
          <button onClick={() => setTableSearch('')} className="ml-1 hover:bg-indigo-500 rounded-full p-0.5">
            <X className="w-3 h-3" />
          </button>
        </Badge>
      )}
      
      {activeFilters.map(({ key, value }) => (
        <Badge key={`${key}-${value}`} variant="outline" className="bg-white border-slate-200 text-slate-700 py-1 pl-3 pr-1 h-6 flex items-center gap-1 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">{key.replace('_', ' ')}:</span>
          <span className="text-xs font-medium">{value}</span>
          <button 
            onClick={() => toggleFilterValue(key as any, value)}
            className="ml-1 hover:bg-slate-100 rounded-full p-0.5"
          >
            <X className="w-3 h-3 text-slate-400" />
          </button>
        </Badge>
      ))}
      
      {(activeFilters.length > 1 || (activeFilters.length > 0 && tableSearch)) && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 px-2 text-[10px] font-bold text-red-500 hover:bg-red-50 uppercase tracking-tight ml-2"
          onClick={clearAllFilters}
        >
          <FilterX className="w-3 h-3 mr-1" /> Reset All
        </Button>
      )}
    </div>
  );
}