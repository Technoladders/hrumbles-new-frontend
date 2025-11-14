import React, { useState } from 'react';
import { addMonths, endOfMonth, endOfWeek, endOfYear, format, isSameDay, isWithinInterval, startOfMonth, startOfWeek, startOfYear, subMonths, subWeeks, subYears } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import './compact-date-range.css';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface CompactDateRangeSelectorProps {
  value: DateRange | null;
  onChange: (range: DateRange | null) => void;
  onApply?: () => void;
  monthsView?: 1 | 2;
}

export const CompactDateRangeSelector: React.FC<CompactDateRangeSelectorProps> = ({
  value,
  onChange,
  onApply,
  monthsView = 2,
}) => {
  const [open, setOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | null>(value);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const handleDayClick = (day: Date) => {
    if (!tempRange?.startDate || (tempRange.startDate && tempRange.endDate)) {
      setTempRange({ startDate: day, endDate: null });
    } else {
      const start = tempRange.startDate;
      const end = day < start ? start : day;
      setTempRange({ startDate: start, endDate: end });
    }
  };

  const handleHover = (day: Date) => {
    setHoverDate(day);
  };

  const handleQuickSelect = (label: string) => {
    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    switch (label) {
      // Current
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
      // Past
      case 'Yesterday':
        start = end = subWeeks(now, 0);
        start.setDate(start.getDate() - 1);
        end.setDate(end.getDate() - 1);
        break;
      case 'Last Week':
        start = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        end = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        break;
      case 'Last Month':
        start = startOfMonth(subMonths(now, 1));
        end = endOfMonth(subMonths(now, 1));
        break;
      case 'Last Year':
        start = startOfYear(subYears(now, 1));
        end = endOfYear(subYears(now, 1));
        break;
    }

    const newRange = { startDate: start, endDate: end };
    setTempRange(newRange);
    onChange(newRange);
    if (onApply) onApply();
    setOpen(false);
  };

  const handleApply = () => {
    if (tempRange) {
      onChange(tempRange);
      onApply?.();
      setOpen(false);
    }
  };

  const handleClear = () => {
    setTempRange(null);
    onChange(null);
    onApply?.();
    setOpen(false);
  };

  const renderCalendar = (monthOffset = 0) => {
    const monthDate = addMonths(new Date(), monthOffset);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const startWeek = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endWeek = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows: JSX.Element[] = [];
    let day = startWeek;

    while (day <= endWeek) {
      const days = Array.from({ length: 7 }).map(() => {
        const isSelected =
          tempRange?.startDate &&
          tempRange?.endDate &&
          isWithinInterval(day, { start: tempRange.startDate, end: tempRange.endDate });
        const isStart = tempRange?.startDate && isSameDay(day, tempRange.startDate);
        const isEnd = tempRange?.endDate && isSameDay(day, tempRange.endDate);
        const isInHoverRange =
          tempRange?.startDate &&
          !tempRange?.endDate &&
          hoverDate &&
          isWithinInterval(day, {
            start: tempRange.startDate,
            end: hoverDate < tempRange.startDate ? tempRange.startDate : hoverDate,
          });

        const classes = cn(
          'w-8 h-8 flex items-center justify-center rounded-md text-sm cursor-pointer select-none',
          (isSelected || isInHoverRange) && 'bg-blue-100 text-blue-700',
          (isStart || isEnd) && 'bg-blue-500 text-white font-semibold',
          !isSelected && !isInHoverRange && 'hover:bg-gray-100 text-gray-700'
        );

        const currentDay = day;
        day = new Date(day);
        day.setDate(day.getDate() + 1);

        return (
          <div
            key={currentDay.toISOString()}
            className={classes}
            onClick={() => handleDayClick(currentDay)}
            onMouseEnter={() => handleHover(currentDay)}
          >
            {currentDay.getDate()}
          </div>
        );
      });

      rows.push(
        <div key={day.toISOString()} className="flex justify-between">
          {days}
        </div>
      );
    }

    return (
      <div className="p-2 text-center">
        <div className="text-xs font-semibold mb-1 text-gray-600">
          {format(monthDate, 'MMMM yyyy')}
        </div>
        <div className="grid grid-cols-7 text-[10px] text-gray-400 mb-1">
          <div>Mo</div>
          <div>Tu</div>
          <div>We</div>
          <div>Th</div>
          <div>Fr</div>
          <div>Sa</div>
          <div>Su</div>
        </div>
        {rows}
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-[250px] justify-start text-left text-sm font-normal h-8 px-2 py-1',
            !value?.startDate && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-white/80" />
          {value?.startDate && value?.endDate ? (
            <>
              {format(value.startDate, 'MMM dd, yy')} - {format(value.endDate, 'MMM dd, yy')}
            </>
          ) : (
            <span className="text-white/80">Select range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-auto shadow-lg rounded-lg overflow-hidden" align="start">
        <div className="flex compact-date-range-container">
          {/* Left Quick Options */}
          <div className="compact-date-shortcuts border-r border-gray-200 p-3 w-[150px] flex flex-col gap-1 text-sm">
            <div className="text-xs font-semibold text-gray-500 uppercase">Current</div>
            {['Today', 'This Week', 'This Month', 'This Year'].map((label) => (
              <button key={label} className="compact-btn" onClick={() => handleQuickSelect(label)}>
                {label}
              </button>
            ))}
            <div className="mt-2 text-xs font-semibold text-gray-500 uppercase">Past</div>
            {['Yesterday', 'Last Week', 'Last Month', 'Last Year'].map((label) => (
              <button key={label} className="compact-btn" onClick={() => handleQuickSelect(label)}>
                {label}
              </button>
            ))}
          </div>

          {/* Right Calendars */}
          <div className={cn('flex', monthsView === 2 ? 'flex-row' : 'flex-col')}>
            {renderCalendar(0)}
            {monthsView === 2 && renderCalendar(1)}
          </div>
        </div>

        <div className="p-2 border-t border-gray-200 flex justify-end gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs px-2" onClick={handleClear}>
            Clear
          </Button>
          <Button size="sm" className="h-7 text-xs px-2" onClick={handleApply}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
