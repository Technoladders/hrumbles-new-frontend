import React, { useEffect, useRef, useState } from 'react';
import {
  addDays,
  addMonths,
  addYears,
  differenceInDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isSameDay,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
// import '../enhanced-date-range.css'; // Ensure this exists or styles are handled

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

type PickerMode = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all';

interface PeriodwiseDatePickerProps {
  value: DateRange | null;
  onChange: (range: DateRange | null) => void;
  onApply?: () => void;
  monthsView?: 1 | 2;
  mode?: PickerMode;
}

export const PeriodwiseDatePicker: React.FC<PeriodwiseDatePickerProps> = ({
  value,
  onChange,
  onApply,
  monthsView = 2,
  mode = 'daily',
}) => {
  const [open, setOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | null>(value);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // 'none' means inline view handles it. 'month'/'year' are for the popup overlays (clicked from header)
  const [pickerMode, setPickerMode] = useState<'none' | 'month' | 'year'>('none');
  const [focusedDate, setFocusedDate] = useState<Date>(new Date());
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [tab, setTab] = useState<'current' | 'past'>('current');
  const [decadeOffset, setDecadeOffset] = useState(0);
  const yearListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) setTempRange(value);
  }, [value]);

  // FIX: Removed the useEffect that auto-opened overlays for monthly/yearly modes.
  // Now the main view adapts based on the 'mode' prop.

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
    if (mode === 'weekly') {
      const clickedWeekStart = startOfWeek(day, { weekStartsOn: 1 });
      const clickedWeekEnd = endOfWeek(clickedWeekStart, { weekStartsOn: 1 });
      
      // FIX: Range Selection Logic for Weeks
      if (!tempRange?.startDate || (tempRange.startDate && tempRange.endDate)) {
        // First click: Set Start Week, End is Null (waiting for second click)
        setTempRange({ startDate: clickedWeekStart, endDate: null });
      } else {
        // Second click: determine range
        if (clickedWeekStart < tempRange.startDate) {
          // If clicked before current start, reset start
          setTempRange({ startDate: clickedWeekStart, endDate: endOfWeek(tempRange.startDate, { weekStartsOn: 1 }) });
        } else {
          // Standard range
          setTempRange({ startDate: tempRange.startDate, endDate: clickedWeekEnd });
        }
      }
    } else {
      // Default daily logic
      if (!tempRange?.startDate || (tempRange.startDate && tempRange.endDate)) {
        setTempRange({ startDate: day, endDate: null });
      } else if (day < tempRange.startDate) {
        setTempRange({ startDate: day, endDate: tempRange.startDate });
      } else {
        setTempRange({ startDate: tempRange.startDate, endDate: day });
      }
    }
    setTooltip(null);
  };

  const handleMonthSelect = (monthIndex: number) => {
    const year = currentMonth.getFullYear();
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = endOfMonth(monthStart);

    // FIX: Range Selection Logic for Monthly Mode
    if (mode === 'monthly') {
      if (!tempRange?.startDate || (tempRange.startDate && tempRange.endDate)) {
        setTempRange({ startDate: monthStart, endDate: null });
      } else {
        // Determine range
        if (monthStart < tempRange.startDate) {
           setTempRange({ startDate: monthStart, endDate: endOfMonth(tempRange.startDate) });
        } else {
           setTempRange({ startDate: tempRange.startDate, endDate: monthEnd });
        }
      }
    } else {
      // Used inside the overlay for Daily mode shortcut
      if (!tempRange?.startDate) {
        setTempRange({ startDate: monthStart, endDate: monthEnd });
      } else if (!tempRange.endDate) {
        if (monthStart < tempRange.startDate) {
          setTempRange({ startDate: monthStart, endDate: endOfMonth(tempRange.startDate) });
        } else {
          setTempRange({ startDate: tempRange.startDate, endDate: monthEnd });
        }
      } else {
        setTempRange({ startDate: monthStart, endDate: monthEnd });
      }
      setPickerMode('none');
    }
  };

  const handleYearSelect = (year: number) => {
    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(yearStart);

    // FIX: Range Selection Logic for Yearly Mode
    if (mode === 'yearly') {
       if (!tempRange?.startDate || (tempRange.startDate && tempRange.endDate)) {
          setTempRange({ startDate: yearStart, endDate: null });
       } else {
          if (yearStart < tempRange.startDate) {
             setTempRange({ startDate: yearStart, endDate: endOfYear(tempRange.startDate) });
          } else {
             setTempRange({ startDate: tempRange.startDate, endDate: yearEnd });
          }
       }
    } else {
      // Used inside overlay
      if (!tempRange?.startDate) {
        setTempRange({ startDate: yearStart, endDate: yearEnd });
      } else if (!tempRange.endDate) {
        if (yearStart < tempRange.startDate) {
          setTempRange({ startDate: yearStart, endDate: endOfYear(tempRange.startDate) });
        } else {
          setTempRange({ startDate: tempRange.startDate, endDate: yearEnd });
        }
      } else {
        setTempRange({ startDate: yearStart, endDate: yearEnd });
      }
      setPickerMode('none');
    }
  };

  const handlePickerCancel = () => {
    setPickerMode('none');
  };

  const getQuickSelectLabels = () => {
    const current = {
      daily: ['Today', 'This Week', 'This Month', 'This Year'],
      weekly: ['This Week', 'This Month', 'This Year'],
      monthly: ['This Month', 'This Year'],
      yearly: ['This Year'],
      all: ['Today', 'This Week', 'This Month', 'This Year']
    };
    const past = {
      daily: ['Yesterday', 'Last Week', 'Last Month', 'Last Year'],
      weekly: ['Last Week', 'Last Month', 'Last Year'],
      monthly: ['Last Month', 'Last Year'],
      yearly: ['Last Year'],
      all: ['Yesterday', 'Last Week', 'Last Month', 'Last Year']
    };
    return { current: current[mode], past: past[mode] };
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
    setCurrentMonth(start || now);
  };

  const renderCalendarDays = (monthOffset = 0) => {
    const monthDate = addMonths(currentMonth, monthOffset);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const startWeek = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endWeek = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows: JSX.Element[] = [];
    let day = startWeek;
    let weekIndex = 0;

    let previewStart: Date | null = null;
    let previewEnd: Date | null = null;
    let isInHoverRange = false;
    let isPreviewStart = false;
    let isPreviewEnd = false;

    // Hover logic for daily
    if ((mode === 'daily' || mode === 'all') && tempRange?.startDate && !tempRange.endDate && hoverDate) {
      previewStart = new Date(Math.min(tempRange.startDate.getTime(), hoverDate.getTime()));
      previewEnd = new Date(Math.max(tempRange.startDate.getTime(), hoverDate.getTime()));
    }

    while (day <= endWeek) {
      const week: JSX.Element[] = [];
      // Calculate if the entire week should be highlighted (For Weekly Mode)
      // Check if this week's start day is inside the selected range
      const weekStartForCheck = startOfWeek(day, { weekStartsOn: 1 });
      
      let isWeekSelected = false;
      if (mode === 'weekly' && tempRange?.startDate) {
         if (tempRange.endDate) {
           // Full range exists
           isWeekSelected = isWithinInterval(weekStartForCheck, { start: tempRange.startDate, end: tempRange.endDate });
         } else {
           // Only start selected (waiting for end), highlight just that week
           isWeekSelected = isSameDay(weekStartForCheck, startOfWeek(tempRange.startDate, { weekStartsOn: 1 }));
         }
      }

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
              // Apply highlight if it's a selected range OR if the whole week is selected in weekly mode
              (isRangeDay || isWeekSelected) && 'bg-purple-100 border border-purple-200 fade-highlight',
              gradient,
              (isEndpoint || (isWeekSelected && (isSameDay(currentDay, startOfWeek(currentDay, {weekStartsOn:1})) || isSameDay(currentDay, endOfWeek(currentDay, {weekStartsOn:1}))))) && (mode === 'weekly' ? 'bg-purple-500 text-white font-semibold' : 'bg-purple-500 text-white font-semibold shadow-md scale-105 ring-2 ring-purple-300'),
              // Ensure endpoints in daily mode pop
              isEndpoint && mode !== 'weekly' && 'bg-purple-500 text-white', 
              
              !isSelected && !isInHoverRange && !isToday && !isWeekSelected && 'hover:bg-gray-100 text-gray-700'
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
          {monthOffset === monthsView - 1 && (
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

  const renderMonthGrid = (yearOffset = 0) => {
    // FIX: Using yearOffset to potentially show different years if needed, though usually just one
    const year = currentMonth.getFullYear() + yearOffset; 
    
    return (
      <div className="p-2 text-center relative animate-slideUp min-w-[280px]">
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between mb-1 px-2">
          <button
            onClick={() => setCurrentMonth(subYears(currentMonth, 1))}
            className="p-1 hover:bg-gray-100 rounded-md transition-all hover:scale-110"
          >
            <ChevronLeft className="h-4 w-4 text-purple-600" />
          </button>
          <div className="text-xs font-semibold text-gray-600 flex items-center gap-1">
            <span className="cursor-pointer hover:underline transition-colors text-purple-600 hover:text-purple-800" onClick={() => setPickerMode('year')}>
              {year}
            </span>
          </div>
          <button
            onClick={() => setCurrentMonth(addYears(currentMonth, 1))}
            className="p-1 hover:bg-gray-100 rounded-md transition-all hover:scale-110"
          >
            <ChevronRight className="h-4 w-4 text-purple-600" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          {Array.from({ length: 12 }).map((_, i) => {
            const monthDate = new Date(year, i, 1);
            const monthStart = monthDate;
            const monthEnd = endOfMonth(monthDate);
            
            const isStartMonth = tempRange?.startDate && isSameDay(monthStart, startOfMonth(tempRange.startDate));
            const isEndMonth = tempRange?.endDate && isSameDay(monthEnd, endOfMonth(tempRange.endDate));
            
            const isInRange = tempRange?.startDate && tempRange?.endDate && 
              monthStart >= startOfMonth(tempRange.startDate) && monthEnd <= endOfMonth(tempRange.endDate);
            
            // Highlight just start if waiting for end
            const isPartialStart = !tempRange?.endDate && tempRange?.startDate && isSameDay(monthStart, startOfMonth(tempRange.startDate));

            const isSelected = isStartMonth || isEndMonth || isPartialStart;
            
            return (
              <button 
                key={i} 
                className={cn(
                  "px-3 py-4 text-sm rounded-md transition-all duration-200 hover:scale-105 border border-transparent hover:border-purple-200",
                  isSelected && "bg-purple-500 text-white font-semibold shadow-md",
                  !isSelected && isInRange && "bg-purple-100 text-purple-700",
                  !isSelected && !isInRange && "hover:bg-purple-50 text-gray-700"
                )} 
                onClick={() => handleMonthSelect(i)}
              >
                {format(monthDate, 'MMM')}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderYearGrid = () => {
    const baseYear = Math.floor(new Date().getFullYear() / 10) * 10 + decadeOffset * 10;
    return (
      <div className="p-2 text-center relative animate-slideUp max-h-[300px] overflow-y-auto min-w-[280px]">
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between mb-1 px-2">
          <button
            onClick={() => setDecadeOffset(prev => prev - 1)}
            className="p-1 hover:bg-gray-100 rounded-md transition-all hover:scale-110"
          >
            <ChevronLeft className="h-4 w-4 text-purple-600" />
          </button>
          <div className="text-xs font-semibold text-gray-600">
            {baseYear} - {baseYear + 9}
          </div>
          <button
            onClick={() => setDecadeOffset(prev => prev + 1)}
            className="p-1 hover:bg-gray-100 rounded-md transition-all hover:scale-110"
          >
            <ChevronRight className="h-4 w-4 text-purple-600" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          {Array.from({ length: 12 }).map((_, i) => {
             // Show a slightly larger range than 10 to fill grid nicely
            const year = baseYear + i;
            const yearStart = startOfYear(new Date(year, 0, 1));
            const yearEnd = endOfYear(yearStart);
            
            const isStartYear = tempRange?.startDate && isSameDay(yearStart, startOfYear(tempRange.startDate));
            const isEndYear = tempRange?.endDate && isSameDay(yearEnd, endOfYear(tempRange.endDate));
            
            const isInRange = tempRange?.startDate && tempRange?.endDate && 
              yearStart >= startOfYear(tempRange.startDate) && yearEnd <= endOfYear(tempRange.endDate);

            const isPartialStart = !tempRange?.endDate && tempRange?.startDate && isSameDay(yearStart, startOfYear(tempRange.startDate));

            const isSelected = isStartYear || isEndYear || isPartialStart;

            return (
              <button
                key={year}
                className={cn(
                  'px-3 py-3 text-sm rounded-md transition-all duration-200 hover:scale-105 border border-transparent hover:border-purple-200',
                  isSelected && 'bg-purple-500 text-white font-semibold shadow-md',
                  !isSelected && isInRange && 'bg-purple-100 text-purple-700',
                  !isSelected && !isInRange && 'hover:bg-purple-50 text-gray-700'
                )}
                onClick={() => handleYearSelect(year)}
              >
                {year}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderCalendar = (offset = 0) => {
    if (mode === 'monthly') {
      return renderMonthGrid(offset);
    } else if (mode === 'yearly') {
      return renderYearGrid();
    } else {
      return renderCalendarDays(offset);
    }
  };

  const renderPickerModal = () => {
    // Only render the modal if explicitly triggered via headers (pickerMode !== 'none')
    if (pickerMode === 'none') return null;

    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white/95 backdrop-blur-sm z-20 p-4 animate-fadeIn rounded-xl">
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
              {Array.from({ length: 12 }).map((_, i) => {
                const monthDate = new Date(currentMonth.getFullYear(), i, 1);
                // Simple select logic for the modal inside Daily view
                const isSelected = tempRange?.startDate && tempRange?.startDate.getMonth() === i && tempRange?.startDate.getFullYear() === currentMonth.getFullYear();
                
                return (
                  <button 
                    key={i} 
                    className={cn(
                      "px-3 py-2 text-sm rounded-md hover:bg-purple-100 transition-all duration-200 hover:scale-105 border border-transparent hover:border-purple-200",
                      isSelected && "bg-purple-500 text-white font-semibold shadow-md",
                      !isSelected && "text-gray-700"
                    )} 
                    onClick={() => handleMonthSelect(i)}
                  >
                    {format(monthDate, 'MMM')}
                  </button>
                );
              })}
            </div>
          )}
          {pickerMode === 'year' && (
            <div ref={yearListRef} className="grid grid-cols-4 gap-2 max-h-[220px] overflow-y-auto scroll-smooth animate-slideUp">
              {Array.from({ length: 201 }).map((_, i) => {
                const baseYear = new Date().getFullYear();
                const year = baseYear - 100 + i;
                const isSelected = tempRange?.startDate && tempRange?.startDate.getFullYear() === year;

                return (
                  <button
                    key={year}
                    data-year={year}
                    className={cn(
                      'px-3 py-2 text-sm rounded-md hover:bg-purple-100 transition-all duration-200 hover:scale-105 border border-transparent hover:border-purple-200',
                      isSelected && 'bg-purple-500 text-white font-semibold shadow-md',
                      !isSelected && "text-gray-700"
                    )}
                    onClick={() => handleYearSelect(year)}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleHover = (e: React.MouseEvent, day: Date) => {
    setHoverDate(day);
    if ((mode === 'daily' || mode === 'all') && tempRange?.startDate && !tempRange.endDate) {
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

  const { current: currentLabels, past: pastLabels } = getQuickSelectLabels();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="datepicker" className="w-fit justify-start text-left text-sm font-normal h-8 px-2 py-1 rounded-full shadow-inner">
          <CalendarIcon className="mr-0 h-4 w-4 text-white" />
          {value?.startDate && value?.endDate ? (
            <>
              {format(value.startDate, 'MMM dd, yy')} - {format(value.endDate, 'MMM dd, yy')}
            </>
          ) : (
            <span className="text-white justify-center text-xs">Select range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-auto shadow-xl rounded-xl overflow-hidden animate-slideUp" align="start">
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
          {/* Quick Selections */}
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
            {(tab === 'current' ? currentLabels : pastLabels).map((label) => (
              <button key={label} className="compact-btn transition-all duration-200 hover:scale-105" onClick={() => handleQuickSelect(label)}>
                {label}
              </button>
            ))}
          </div>
          <div className={cn('flex flex-col sm:flex-row items-center justify-center', monthsView === 2 ? 'sm:space-x-2' : '')}>
            {/* 
               If Monthly/Yearly, we typically only need ONE grid (one year view), 
               so we suppress the second calendar even if monthsView is 2 
            */}
            {renderCalendar(0)}
            {monthsView === 2 && (mode === 'daily' || mode === 'all' || mode === 'weekly') && renderCalendar(1)}
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
            onClick={() => { 
              setCurrentMonth(new Date()); 
              setTempRange(null); 
            }}
          >
            Reset
          </Button>
          <Button 
            size="sm" 
            className="h-7 text-xs px-2 bg-purple-500 hover:bg-purple-600 transition-all hover:scale-105" 
            onClick={() => { 
              onChange(tempRange); 
              onApply?.(); 
              setOpen(false); 
            }}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};