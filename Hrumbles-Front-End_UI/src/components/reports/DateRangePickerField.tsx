import React, { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRangePicker } from 'react-date-range';
import { cn } from '@/lib/utils';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

interface DateRange {
  startDate: Date;
  endDate: Date;
  key: string;
}

interface DateRangePickerFieldProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  className?: string;
}

export const DateRangePickerField: React.FC<DateRangePickerFieldProps> = ({
  dateRange,
  onDateRangeChange,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<DateRange[]>([
    {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      key: dateRange.key || 'selection',
    },
  ]);

  const handleSelect = (item: { selection: DateRange }) => {
    setState([item.selection]);
    onDateRangeChange(item.selection);
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="datepicker"
            className={cn(
              'w-[300px] justify-start text-left font-normal',
              !dateRange?.startDate && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.startDate ? (
              dateRange.endDate ? (
                <>
                  {format(dateRange.startDate, 'LLL dd, y')} -{' '}
                  {format(dateRange.endDate, 'LLL dd, y')}
                </>
              ) : (
                format(dateRange.startDate, 'LLL dd, y')
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-auto" align="start">
          <DateRangePicker
            onChange={handleSelect}
            showSelectionPreview={true}
            moveRangeOnFirstSelection={false}
            months={2}
            ranges={state}
            direction="horizontal"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};