import React, { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DateRangePicker } from 'react-date-range';
import { cn } from '@/lib/utils';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

// Update interface to match CompaniesPage.tsx
interface DateRange {
  from: Date;
  to: Date;
  key?: string; // Make key optional to match usage
}

interface DateRangePickerFieldProps {
  dateRange: DateRange | undefined; // Allow undefined to match CompaniesPage
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
      from: dateRange?.from || new Date(),
      to: dateRange?.to || new Date(),
      key: 'selection',
    },
  ]);

  const handleSelect = (item: { selection: { startDate: Date; endDate: Date; key: string } }) => {
    const newRange = {
      from: item.selection.startDate,
      to: item.selection.endDate,
      key: item.selection.key,
    };
    console.log('DateRangePickerField: new range selected:', newRange);
    setState([newRange]);
    onDateRangeChange(newRange);
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              'w-[300px] justify-start text-left font-normal',
              !dateRange?.from && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, 'LLL dd, y')} -{' '}
                  {format(dateRange.to, 'LLL dd, y')}
                </>
              ) : (
                format(dateRange.from, 'LLL dd, y')
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
            ranges={state.map(range => ({
              startDate: range.from,
              endDate: range.to,
              key: range.key || 'selection',
            }))}
            direction="horizontal"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};