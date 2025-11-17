import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  addDays,
  differenceInDays,
  subDays,
  subMonths,
  isSameDay,
  startOfDay,
  subWeeks,
  subYears,
} from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from '@/lib/utils';
import '../../../components/ui/enhanced-date-range.css';
import { GoalType } from '@/types/goal';

interface GoalPeriodSelectorProps {
  periodType: GoalType;
  onPeriodChange: (period: { start: Date; end: Date }) => void;
}

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

// --- Sub-Component for Daily & Weekly Range (Enhanced Calendar) ---
const DailyWeeklySelector = ({ onApply, snapToWeek = false }: { onApply: (start: Date, end: Date) => void, snapToWeek?: boolean }) => {
  const [tempRange, setTempRange] = useState<DateRange | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [pickerMode, setPickerMode] = useState<'none' | 'month' | 'year'>('none');
  const [focusedDate, setFocusedDate] = useState<Date>(new Date());
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [tab, setTab] = useState<'current' | 'past'>('current');
  const yearListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pickerMode === 'year' && yearListRef.current) {
      const currentYear = new Date().getFullYear();
      const activeButton = yearListRef.current.querySelector(
        `button[data-year="${currentYear}"]`
      );
      if (activeButton) {
        activeButton.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }, [pickerMode]);

  const handleDayClick = (day: Date) => {
    if (!tempRange?.startDate || (tempRange.startDate && tempRange.endDate)) {
      setTempRange({ startDate: day, endDate: null });
    } else if (day < tempRange.startDate) {
      setTempRange({ startDate: day, endDate: tempRange.startDate });
    } else {
      setTempRange({ startDate: tempRange.startDate, endDate: day });
    }
    setTooltip(null);
  };

  const handleHover = (e: React.MouseEvent, day: Date) => {
    setHoverDate(day);
    if (tempRange?.startDate && !tempRange.endDate) {
      const start = tempRange.startDate;
      const previewStart = new Date(Math.min(start.getTime(), day.getTime()));
      const previewEnd = new Date(Math.max(start.getTime(), day.getTime()));
      const days = differenceInDays(previewEnd, previewStart) + 1;
      const startLabel = format(previewStart, 'MMM dd');
      const endLabel = format(previewEnd, 'MMM dd');
      const text = `${startLabel} → ${endLabel} (${days} days)`;
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setTooltip({ text, x: rect.left + rect.width / 2, y: rect.top - 30 });
    } else {
      setTooltip(null);
    }
  };

  const handleMonthSelect = (monthIndex: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), monthIndex, 1));
    setPickerMode('none');
  };

  const handleYearSelect = (year: number) => {
    setCurrentMonth(new Date(year, currentMonth.getMonth(), 1));
    setPickerMode('none');
  };

  const handlePickerCancel = () => {
    setPickerMode('none');
  };

  const getMonthForQuickSelect = (label: string, now: Date): Date => {
    switch (label) {
      case 'Today':
      case 'Yesterday':
        return now;
      case 'This Week':
      case 'Last Week':
        return startOfMonth(startOfWeek(now, { weekStartsOn: 1 }));
      case 'This Month':
      case 'Last Month':
        return startOfMonth(now);
      case 'This Year':
      case 'Last Year':
        return startOfYear(now);
      default:
        return now;
    }
  };

  const handleQuickSelect = (label: string) => {
    const now = startOfDay(new Date());
    let start: Date | null = null;
    let end: Date | null = null;
    switch (label) {
      case 'Today':
        start = end = now;
        break;
      case 'This Week':
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'This Month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'This Year':
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      case 'Yesterday':
        start = end = startOfDay(subDays(now, 1));
        break;
      case 'Last Week':
        const lastWeekStart = subWeeks(now, 1);
        start = startOfWeek(lastWeekStart, { weekStartsOn: 1 });
        end = endOfWeek(lastWeekStart, { weekStartsOn: 1 });
        break;
      case 'Last Month':
        const lastMonthStart = subMonths(now, 1);
        start = startOfMonth(lastMonthStart);
        end = endOfMonth(lastMonthStart);
        break;
      case 'Last Year':
        start = startOfYear(subYears(now, 1));
        end = endOfYear(subYears(now, 1));
        break;
    }
    const newRange = { startDate: start, endDate: end };
    setTempRange(newRange);
    // Move calendar to the relevant month
    setCurrentMonth(getMonthForQuickSelect(label, now));
  };

  const handleReset = () => {
    setCurrentMonth(new Date());
    setTempRange(null);
  };

  const handleApply = () => {
    if (!tempRange?.startDate) return;
    let finalStart = tempRange.startDate;
    let finalEnd = tempRange.endDate || tempRange.startDate;
    if (snapToWeek) {
      finalStart = startOfWeek(finalStart, { weekStartsOn: 1 });
      finalEnd = endOfWeek(finalEnd, { weekStartsOn: 1 });
    }
    onApply(finalStart, finalEnd);
  };

  const renderCalendar = (monthOffset = 0) => {
    const monthDate = addMonths(currentMonth, monthOffset);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const startWeek = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endWeek = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows: JSX.Element[] = [];
    let day = startWeek;
    let weekIndex = 0;

    // Compute preview range for hover styling
    let previewStart: Date | null = null;
    let previewEnd: Date | null = null;
    let isInHoverRange = false;
    let isPreviewStart = false;
    let isPreviewEnd = false;
    if (tempRange?.startDate && !tempRange?.endDate && hoverDate) {
      previewStart = new Date(Math.min(tempRange.startDate.getTime(), hoverDate.getTime()));
      previewEnd = new Date(Math.max(tempRange.startDate.getTime(), hoverDate.getTime()));
    }

    while (day <= endWeek) {
      const week: JSX.Element[] = [];
      for (let i = 0; i < 7; i++) {
        const currentDay = day;
        const isToday = isSameDay(currentDay, startOfDay(new Date()));
        const isSelected =
          tempRange?.startDate &&
          tempRange?.endDate &&
          isWithinInterval(currentDay, { start: tempRange.startDate, end: tempRange.endDate });
        const isStart = tempRange?.startDate && isSameDay(currentDay, tempRange.startDate);
        const isEnd = tempRange?.endDate && isSameDay(currentDay, tempRange.endDate);
        if (previewStart && previewEnd) {
          isInHoverRange = isWithinInterval(currentDay, { start: previewStart, end: previewEnd });
          isPreviewStart = isSameDay(currentDay, previewStart);
          isPreviewEnd = isSameDay(currentDay, previewEnd);
        }

        const isRangeDay = (isSelected && !isStart && !isEnd) || (isInHoverRange && !isPreviewStart && !isPreviewEnd);
        const isEndpoint = isStart || isEnd || isPreviewStart || isPreviewEnd;
        const gradient =
          isRangeDay && previewStart && previewEnd
            ? 'bg-gradient-to-r from-purple-100 via-purple-200 to-purple-100 text-purple-700'
            : '';

        week.push(
          <div
            key={currentDay.toISOString()}
            className={cn(
              'w-8 h-8 flex items-center justify-center rounded-md text-sm cursor-pointer relative transition-all duration-200 hover:scale-105',
              isToday && !isSelected && !isInHoverRange && 'ring-2 ring-purple-200 bg-purple-50 text-purple-600 font-medium',
              isRangeDay && 'bg-purple-100 border border-purple-200 fade-highlight',
              gradient,
              isEndpoint && 'bg-purple-500 text-white font-semibold shadow-md scale-105 ring-2 ring-purple-300',
              !isSelected && !isInHoverRange && !isToday && 'hover:bg-gray-100 text-gray-700'
            )}
            onClick={() => handleDayClick(currentDay)}
            onMouseEnter={(e) => handleHover(e, currentDay)}
            onMouseLeave={() => setTooltip(null)}
          >
            {currentDay.getDate()}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div key={`week-${weekIndex++}`} className="grid grid-cols-7 gap-1">{week}</div>);
    }

    return (
      <div className="p-2 text-center relative animate-slideUp">
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between mb-1 px-2">
          {monthOffset === 0 && (
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1 hover:bg-gray-100 rounded-md transition-all hover:scale-110"
            >
              <ChevronLeft className="h-4 w-4 text-purple-600" />
            </button>
          )}
          <div className="text-xs font-semibold text-gray-600 flex items-center gap-1">
            <span className="cursor-pointer hover:underline transition-colors text-purple-600 hover:text-purple-800" onClick={() => setPickerMode('month')}>
              {format(monthDate, 'MMMM')}
            </span>
            <span className="cursor-pointer hover:underline transition-colors text-purple-600 hover:text-purple-800" onClick={() => setPickerMode('year')}>
              {format(monthDate, 'yyyy')}
            </span>
          </div>
          {monthOffset === 1 && (
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1 hover:bg-gray-100 rounded-md transition-all hover:scale-110"
            >
              <ChevronRight className="h-4 w-4 text-purple-600" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-7 text-[10px] text-gray-400 mb-1">
          <div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div><div>Su</div>
        </div>
        <div className="space-y-1">{rows}</div>
      </div>
    );
  };

  const renderPickerModal = () => {
    if (pickerMode === 'none') return null;

    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white/95 backdrop-blur-sm z-20 p-4 animate-fadeIn">
        <div className="bg-white rounded-lg shadow-xl border border-purple-200 p-4 w-full max-w-md max-h-[80vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-purple-600">
              {pickerMode === 'month' ? 'Select Month' : 'Select Year'}
            </h3>
            <button
              onClick={handlePickerCancel}
              className="p-1 hover:bg-gray-100 rounded-md transition-all"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          {pickerMode === 'month' && (
            <div className="grid grid-cols-3 gap-2 animate-slideUp">
              {Array.from({ length: 12 }).map((_, i) => (
                <button 
                  key={i} 
                  className="px-3 py-2 text-sm rounded-md hover:bg-purple-100 transition-all duration-200 hover:scale-105 border border-transparent hover:border-purple-200" 
                  onClick={() => handleMonthSelect(i)}
                >
                  {format(new Date(2025, i, 1), 'MMM')}
                </button>
              ))}
            </div>
          )}
          {pickerMode === 'year' && (
            <div ref={yearListRef} className="grid grid-cols-4 gap-2 max-h-[220px] overflow-y-auto scroll-smooth animate-slideUp">
              {Array.from({ length: 201 }).map((_, i) => {
                const baseYear = new Date().getFullYear();
                const year = baseYear - 100 + i;
                return (
                  <button
                    key={year}
                    data-year={year}
                    className={cn(
                      'px-3 py-2 text-sm rounded-md hover:bg-purple-100 transition-all duration-200 hover:scale-105 border border-transparent hover:border-purple-200',
                      year === baseYear && 'bg-purple-500 text-white font-semibold shadow-sm'
                    )}
                    onClick={() => handleYearSelect(year)}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end mt-4 pt-2 border-t border-gray-200 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs px-3"
              onClick={handlePickerCancel}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const monthsView = 2;

  return (
    <div className="p-0 w-auto shadow-xl rounded-xl overflow-hidden animate-slideUp">
      {/* Range display */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-3 py-2 text-center text-xs font-medium text-gray-600 flex flex-col gap-1 animate-slideDown">
        {tempRange?.startDate && (
          <div className="flex justify-center gap-2">
            <span onClick={() => setFocusedDate(tempRange.startDate!)} className="cursor-pointer text-purple-600 hover:underline hover:text-purple-800 transition-colors">
              {format(tempRange.startDate, 'MMM dd, yyyy')}
            </span>
            {tempRange?.endDate && <span className="text-gray-400 self-center">→</span>}
            {tempRange?.endDate && (
              <span onClick={() => setFocusedDate(tempRange.endDate!)} className="cursor-pointer text-purple-600 hover:underline hover:text-purple-800 transition-colors">
                {format(tempRange.endDate, 'MMM dd, yyyy')}
              </span>
            )}
            {tempRange?.endDate && (
              <span className="text-gray-500 ml-2">({differenceInDays(tempRange.endDate, tempRange.startDate) + 1} days)</span>
            )}
          </div>
        )}
      </div>

      <div className="flex compact-date-range-container flex-col sm:flex-row animate-slideUp">
        {/* Quick Selections with Tabs */}
        <div className="compact-date-shortcuts border-b sm:border-b-0 sm:border-r border-gray-200 p-3 w-full sm:w-[150px] flex flex-col gap-2 text-sm">
          <div className="flex justify-center border-b border-gray-200 pb-2 mb-2 space-x-1">
            <button 
              onClick={() => setTab('current')} 
              className={cn(
                'px-2 py-1 rounded-md text-xs transition-all duration-200',
                tab === 'current' 
                  ? 'bg-purple-500 text-white shadow-sm hover:shadow-md hover:scale-105' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105'
              )}
            >
              Current
            </button>
            <button 
              onClick={() => setTab('past')} 
              className={cn(
                'px-2 py-1 rounded-md text-xs transition-all duration-200',
                tab === 'past' 
                  ? 'bg-purple-500 text-white shadow-sm hover:shadow-md hover:scale-105' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:scale-105'
              )}
            >
              Past
            </button>
          </div>
          {(tab === 'current' ? ['Today', 'This Week', 'This Month', 'This Year'] : ['Yesterday', 'Last Week', 'Last Month', 'Last Year']).map((label) => (
            <button key={label} className="compact-btn transition-all duration-200 hover:scale-105" onClick={() => handleQuickSelect(label)}>
              {label}
            </button>
          ))}
        </div>
        <div className={cn('flex flex-col sm:flex-row items-center justify-center', monthsView === 2 ? 'sm:space-x-2' : '')}>
          {renderCalendar(0)}
          {monthsView === 2 && renderCalendar(1)}
        </div>
      </div>

      {/* Picker Modal */}
      {renderPickerModal()}

      {/* Tooltip */}
      {tooltip && (
        <div 
          className="fixed z-50 px-2 py-1 text-xs rounded-md bg-gray-800 text-white shadow-lg transition-all duration-200" 
          style={{ 
            left: tooltip.x, 
            top: tooltip.y, 
            transform: 'translateX(-50%)',
            opacity: 0,
            animation: 'fadeIn 0.15s forwards ease-in'
          }}
        >
          {tooltip.text}
        </div>
      )}

      <div className="p-2 border-t border-gray-200 flex justify-end gap-2 animate-slideUp">
        <Button 
          size="sm" 
          variant="secondary" 
          className="h-7 text-xs px-2 transition-all hover:scale-105" 
          onClick={handleReset}
        >
          Reset
        </Button>
        <Button 
          size="sm" 
          className="h-7 text-xs px-2 bg-purple-500 hover:bg-purple-600 transition-all hover:scale-105" 
          onClick={handleApply}
        >
          Apply
        </Button>
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
            // toast.error("Start year must be before or same as end year.");
        }
    }

    return (
        <div className="p-4 space-y-4 w-80">
            <h4 className="font-semibold text-center text-lg">Select Year Range</h4>
            <div className="space-y-3">
                <Select onValueChange={setStartYear}>
                    <SelectTrigger className="h-11 text-base">
                        <SelectValue placeholder="Start Year..."/>
                    </SelectTrigger>
                    <SelectContent>
                        {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Select onValueChange={setEndYear}>
                    <SelectTrigger className="h-11 text-base">
                        <SelectValue placeholder="End Year..."/>
                    </SelectTrigger>
                    <SelectContent>
                        {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
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
      case 'Daily': 
        return <DailyWeeklySelector onApply={handleApply} snapToWeek={false} />;
      case 'Weekly': 
        return <DailyWeeklySelector onApply={handleApply} snapToWeek={true} />;
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