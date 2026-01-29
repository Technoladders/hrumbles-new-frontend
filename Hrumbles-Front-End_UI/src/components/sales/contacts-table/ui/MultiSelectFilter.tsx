// src/components/sales/contacts-table/MultiSelectFilter.tsx
// Professional multi-select filter with search and counts

import React, { useState, useMemo } from 'react';
import { Check, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Table } from '@tanstack/react-table';
import { cn } from '@/lib/utils';

interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

interface MultiSelectFilterProps {
  label: string;
  columnId: string;
  options: FilterOption[];
  table: Table<any>;
  placeholder?: string;
  maxHeight?: number;
}

export function MultiSelectFilter({ 
  label, 
  columnId, 
  options, 
  table,
  placeholder = "Search...",
  maxHeight = 240
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const column = table.getAllColumns().find(c => c.id === columnId);
  const selectedValues = (column?.getFilterValue() as string[]) || [];

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(option => 
      option.label.toLowerCase().includes(term) ||
      option.value.toLowerCase().includes(term)
    );
  }, [options, searchTerm]);

  const handleToggle = (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    
    column?.setFilterValue(newValues.length > 0 ? newValues : undefined);
  };

  const handleSelectAll = () => {
    const allValues = filteredOptions.map(opt => opt.value);
    column?.setFilterValue(allValues);
  };

  const handleClearAll = () => {
    column?.setFilterValue(undefined);
  };

  const selectedCount = selectedValues.length;
  const isActive = selectedCount > 0;

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-semibold text-slate-500 uppercase block">
        {label}
      </label>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={isActive ? "default" : "outline"}
            size="sm"
            className={cn(
              "w-full justify-between h-8 text-xs",
              isActive 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            )}
          >
            <span className="truncate">
              {selectedCount > 0 
                ? `${selectedCount} selected` 
                : `Select ${label.toLowerCase()}...`
              }
            </span>
            {selectedCount > 0 && (
              <Badge className="ml-2 bg-white/20 text-white border-0 h-4 min-w-[16px] px-1 text-[9px]">
                {selectedCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-[280px] p-0" align="start">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50">
            <span className="text-xs font-semibold text-slate-700">
              {label}
            </span>
            <div className="flex gap-1">
              {selectedCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-2 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearAll();
                  }}
                >
                  Clear
                </Button>
              )}
              {filteredOptions.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-2 text-[10px] text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectAll();
                  }}
                >
                  Select All
                </Button>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-7 pl-7 pr-7 text-xs border-slate-300"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <ScrollArea className="px-2 py-2" style={{ maxHeight }}>
            {filteredOptions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No options found
              </div>
            ) : (
              <div className="space-y-0.5">
                {filteredOptions.map((option) => {
                  const isChecked = selectedValues.includes(option.value);
                  
                  return (
                    <div
                      key={option.value}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors hover:bg-slate-50",
                        isChecked && "bg-blue-50"
                      )}
                      onClick={() => handleToggle(option.value)}
                    >
                      <Checkbox
                        checked={isChecked}
                        className="h-3.5 w-3.5"
                        onCheckedChange={() => handleToggle(option.value)}
                      />
                      <div className="flex-1 min-w-0">
                        <span className={cn(
                          "text-xs truncate block",
                          isChecked ? "font-medium text-blue-700" : "text-slate-700"
                        )}>
                          {option.label}
                        </span>
                      </div>
                      {option.count !== undefined && option.count > 0 && (
                        <Badge 
                          variant="secondary" 
                          className="h-4 min-w-[20px] px-1 text-[9px] bg-slate-100 text-slate-600 border-0"
                        >
                          {option.count}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Footer Stats */}
          {selectedCount > 0 && (
            <div className="px-3 py-2 border-t border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between text-[10px] text-slate-600">
                <span>{selectedCount} of {options.length} selected</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-2 text-[10px] text-blue-600 hover:bg-blue-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Active indicator */}
      {isActive && (
        <Badge className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0 h-4 border-blue-200">
          {selectedCount} active
        </Badge>
      )}
    </div>
  );
}