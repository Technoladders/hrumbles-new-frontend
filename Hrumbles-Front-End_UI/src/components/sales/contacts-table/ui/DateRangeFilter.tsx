// src/components/sales/contacts-table/DateRangeFilter.tsx
// Professional date range filter with presets

import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Table } from '@tanstack/react-table';
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear } from 'date-fns';

interface DateRangeFilterProps {
  label: string;
  columnId: string;
  table: Table<any>;
}

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

const PRESETS = [
  { label: 'Today', getValue: () => ({ from: new Date(), to: new Date() }) },
  { label: 'Yesterday', getValue: () => ({ from: subDays(new Date(), 1), to: subDays(new Date(), 1) }) },
  { label: 'Last 7 days', getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: 'Last 30 days', getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: 'Last 90 days', getValue: () => ({ from: subDays(new Date(), 90), to: new Date() }) },
  { label: 'This month', getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'Last month', getValue: () => ({ 
    from: startOfMonth(subMonths(new Date(), 1)), 
    to: endOfMonth(subMonths(new Date(), 1)) 
  })},
  { label: 'This year', getValue: () => ({ from: startOfYear(new Date()), to: new Date() }) },
];

export function DateRangeFilter({ label, columnId, table }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });

  const column = table.getAllColumns().find(c => c.id === columnId);
  const currentValue = column?.getFilterValue() as DateRange | undefined;

  const handlePresetClick = (preset: typeof PRESETS[0]) => {
    const range = preset.getValue();
    setDateRange(range);
    column?.setFilterValue(range);
    setIsOpen(false);
  };

  const handleClear = () => {
    setDateRange({ from: undefined, to: undefined });
    column?.setFilterValue(undefined);
  };

  const handleApplyCustom = () => {
    if (dateRange.from || dateRange.to) {
      column?.setFilterValue(dateRange);
    }
    setIsOpen(false);
  };

  const isActive = currentValue?.from || currentValue?.to;

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
            className={`w-full justify-start h-8 text-xs ${
              isActive 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Calendar className="h-3.5 w-3.5 mr-2" />
            {currentValue?.from ? (
              <>
                {format(currentValue.from, 'MMM dd, yy')}
                {currentValue.to && ` - ${format(currentValue.to, 'MMM dd, yy')}`}
              </>
            ) : (
              'Select range...'
            )}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            {/* Presets Sidebar */}
            <div className="border-r border-slate-200 p-2 space-y-1 bg-slate-50">
              <div className="text-[10px] font-bold text-slate-600 uppercase px-2 py-1">
                Quick Select
              </div>
              {PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-7 text-xs font-normal hover:bg-blue-50 hover:text-blue-700"
                  onClick={() => handlePresetClick(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            {/* Calendar */}
            <div className="p-3">
              <div className="text-[10px] font-bold text-slate-600 uppercase mb-2">
                Custom Range
              </div>
              <CalendarComponent
                mode="range"
                selected={dateRange}
                onSelect={(range) => setDateRange(range || { from: undefined, to: undefined })}
                numberOfMonths={2}
                className="rounded-md border-0"
              />
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={handleClear}
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  className="flex-1 h-7 text-xs bg-blue-600 hover:bg-blue-700"
                  onClick={handleApplyCustom}
                  disabled={!dateRange.from && !dateRange.to}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active badge */}
      {isActive && (
        <div className="flex items-center justify-between">
          <Badge className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0 h-4 border-blue-200">
            Active
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="h-4 px-1 text-[9px] text-slate-500 hover:text-red-600"
            onClick={handleClear}
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}