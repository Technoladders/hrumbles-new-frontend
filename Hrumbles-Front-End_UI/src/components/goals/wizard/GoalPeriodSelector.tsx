import React, { useState, useEffect, useMemo } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  addMonths,
  addYears,
  getYear,
  getMonth,
  isWithinInterval,
} from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRangePicker, Range } from 'react-date-range';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { GoalType } from '@/types/goal';

interface GoalPeriodSelectorProps {
  periodType: GoalType;
  onPeriodChange: (period: { start: Date; end: Date }) => void;
}

// --- Sub-Component for Daily & Weekly Range (Unified) ---
const RangeSelector = ({ onApply, snapToWeek = false }: { onApply: (start: Date, end: Date) => void, snapToWeek?: boolean }) => {
  const [range, setRange] = useState<Range[]>([{ startDate: new Date(), endDate: new Date(), key: 'selection' }]);
  
  const handleSelect = (item: { selection: Range }) => {
    let { startDate, endDate } = item.selection;
    if (snapToWeek) {
      startDate = startDate ? startOfWeek(startDate, { weekStartsOn: 1 }) : undefined;
      endDate = endDate ? endOfWeek(endDate, { weekStartsOn: 1 }) : undefined;
    }
    setRange([{ ...item.selection, startDate, endDate }]);
  };

  return (
    <div>
        
      <DateRangePicker
        ranges={range}
        onChange={handleSelect}
        moveRangeOnFirstSelection={false}
        months={2} // Show two months for easier range selection
        direction="horizontal"
        className="goal-date-range-picker"
      />
      <div className="p-2 border-t flex justify-end">
        <Button onClick={() => range[0].startDate && range[0].endDate && onApply(range[0].startDate, range[0].endDate)}>Apply</Button>
      </div>
    </div>
  );
};

// --- Sub-Component for Monthly Range ---
const MonthlySelector = ({ onApply }: { onApply: (start: Date, end: Date) => void }) => {
    const [viewYear, setViewYear] = useState(getYear(new Date()));
    const [selection, setSelection] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null });

    const handleMonthClick = (monthIndex: number) => {
        const clickedDate = new Date(viewYear, monthIndex);
        if (!selection.start || (selection.start && selection.end)) {
            setSelection({ start: clickedDate, end: null });
        } else {
            if (clickedDate < selection.start) {
                setSelection({ start: clickedDate, end: selection.start });
            } else {
                setSelection({ ...selection, end: clickedDate });
            }
        }
    };
    
    const handleApply = () => {
        if (selection.start && selection.end) {
            onApply(startOfMonth(selection.start), endOfMonth(selection.end));
        } else if (selection.start) {
            onApply(startOfMonth(selection.start), endOfMonth(selection.start));
        }
    }
    
    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between px-2">
                <Button variant="outline" size="icon" onClick={() => setViewYear(y => y-1)}><ChevronLeft className="h-4 w-4" /></Button>
                <div className="font-semibold text-lg">{viewYear}</div>
                <Button variant="outline" size="icon" onClick={() => setViewYear(y => y+1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-4 gap-2">
                {Array.from({length: 12}, (_, i) => {
                    const monthDate = new Date(viewYear, i);
                    const isInRange = selection.start && selection.end && isWithinInterval(monthDate, { start: startOfMonth(selection.start), end: endOfMonth(selection.end) });
                    const isStart = selection.start && getYear(selection.start) === viewYear && getMonth(selection.start) === i;
                    const isEnd = selection.end && getYear(selection.end) === viewYear && getMonth(selection.end) === i;
                    
                    return (
                        <Button key={i} variant={isStart || isEnd ? "default" : isInRange ? "secondary" : "ghost"} onClick={() => handleMonthClick(i)}>{format(monthDate, 'MMM')}</Button>
                    );
                })}
            </div>
            <Button onClick={handleApply} className="w-full" disabled={!selection.start}>Apply</Button>
        </div>
    );
};

// --- Sub-Component for Yearly Range ---
const YearlySelector = ({ onApply }: { onApply: (start: Date, end: Date) => void }) => {
    const currentYear = new Date().getFullYear();
    const years = Array.from({length: 11}, (_, i) => currentYear - 5 + i);
    const [startYear, setStartYear] = useState<string | null>(null);
    const [endYear, setEndYear] = useState<string | null>(null);
    
    const handleApply = () => {
        if(startYear && endYear && parseInt(startYear) <= parseInt(endYear)) {
            const startDate = startOfYear(new Date(parseInt(startYear), 0, 1));
            const endDate = endOfYear(new Date(parseInt(endYear), 11, 31));
            onApply(startDate, endDate);
        } else {
            toast.error("Start year must be before or same as end year.");
        }
    }

    return (
        <div className="p-4 space-y-4 w-80">
            <h4 className="font-semibold text-center text-lg">Select Year Range</h4>
            <div className="space-y-3">
                <Select onValueChange={setStartYear}><SelectTrigger className="h-11 text-base"><SelectValue placeholder="Start Year..."/></SelectTrigger><SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent></Select>
                <Select onValueChange={setEndYear}><SelectTrigger className="h-11 text-base"><SelectValue placeholder="End Year..."/></SelectTrigger><SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent></Select>
            </div>
            <Button onClick={handleApply} className="w-full h-11">Apply</Button>
        </div>
    );
};

// --- The Main Component ---
const GoalPeriodSelector: React.FC<GoalPeriodSelectorProps> = ({ periodType, onPeriodChange }) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState('Select a period...');
  
  const handleApply = (start: Date, end: Date) => {
    onPeriodChange({ start, end });
    setDisplayValue(`${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`);
    setPopoverOpen(false);
  };
  
  // Reset display when periodType changes
  useEffect(() => {
    setDisplayValue('Select a period...');
  }, [periodType]);
  
  const renderSelector = () => {
    switch(periodType) {
      case 'Daily': return <RangeSelector onApply={handleApply} />;
      case 'Weekly': return <RangeSelector onApply={handleApply} snapToWeek={true} />;
      case 'Monthly': return <MonthlySelector onApply={handleApply} />;
      case 'Yearly': return <YearlySelector onApply={handleApply} />;
      default: return null;
    }
  }

  return (
    <div className="w-full">
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn('w-full justify-start text-left font-normal h-12 pl-4 pr-3 text-base', displayValue === 'Select a period...' && 'text-muted-foreground')}>
            <CalendarIcon className="mr-3 h-5 w-5 text-gray-500" />
            <span className="flex-grow">{displayValue}</span>
          </Button>
        </PopoverTrigger>
        
        <PopoverContent side="bottom" className="w-auto max-h-[80vh] p-0" sideOffset={-180} align="start">
          {renderSelector()}
        </PopoverContent>
       
      </Popover>
    </div>
  );
};

export default GoalPeriodSelector;