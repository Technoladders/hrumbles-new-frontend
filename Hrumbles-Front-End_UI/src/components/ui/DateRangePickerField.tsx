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
  startDate: Date | null;
  endDate: Date | null;
  key: string;
}

interface DateRangePickerFieldProps {
  dateRange: DateRange | null;
  onDateRangeChange: (range: DateRange | null) => void;
  onApply: () => void;
  className?: string;
}

export const DateRangePickerField: React.FC<DateRangePickerFieldProps> = ({
  dateRange,
  onDateRangeChange,
  onApply,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange[]>([
    {
      startDate: dateRange?.startDate || null,
      endDate: dateRange?.endDate || null,
      key: dateRange?.key || 'selection',
    },
  ]);

  const handleSelect = (item: { selection: DateRange }) => {
    setTempRange([item.selection]);
  };

  const handleApply = () => {
    onDateRangeChange(tempRange[0].startDate && tempRange[0].endDate ? tempRange[0] : null);
    onApply();
    setOpen(false);
  };

  const handleClear = () => {
    setTempRange([{ startDate: null, endDate: null, key: 'selection' }]);
    onDateRangeChange(null);
    onApply();
    setOpen(false);
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
            <CalendarIcon className="mr-2 h-4 w-4 text-white" />
            {dateRange?.startDate && dateRange?.endDate ? (
              <>
                {format(dateRange.startDate, 'LLL dd, y')} -{' '}
                {format(dateRange.endDate, 'LLL dd, y')}
              </>
            ) : (
              <span className="text-white">Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-auto" align="start">
          <div className="flex flex-col">
            <DateRangePicker
              onChange={handleSelect}
              showSelectionPreview={true}
              moveRangeOnFirstSelection={false}
              months={2}
              ranges={tempRange}
              direction="horizontal"
            />
            <div className="p-3 border-t border-gray-200 flex justify-end gap-2">
              <Button variant="outline" onClick={handleClear}>Clear</Button>
              <Button onClick={handleApply}>Apply</Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};