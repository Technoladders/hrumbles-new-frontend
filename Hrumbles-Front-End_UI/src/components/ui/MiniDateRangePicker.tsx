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

interface MiniDateRangePickerProps {
  dateRange: DateRange | null;
  onDateRangeChange: (range: DateRange | null) => void;
  onApply: () => void;
  className?: string;
}

// Note the new component name: MiniDateRangePicker
export const MiniDateRangePicker: React.FC<MiniDateRangePickerProps> = ({
  dateRange,
  onDateRangeChange,
  onApply,
  className,
}) => {
  const [open, setOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange[]>([
    {
      startDate: dateRange?.startDate || new Date(), // Default to today if null
      endDate: dateRange?.endDate || new Date(),
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
            variant="datepicker" // Assuming you have a custom variant for this style
            className={cn(
              'w-auto justify-start text-left font-normal px-3', // Adjusted width and padding
              !dateRange?.startDate && 'text-white'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.startDate && dateRange?.endDate ? (
              <>
                {format(dateRange.startDate, 'MMM d, yy')} - {format(dateRange.endDate, 'MMM d, yy')}
              </>
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-auto" side="bottom" align="end">
          <div className="flex flex-col">
            <DateRangePicker
              onChange={handleSelect}
              showSelectionPreview={true}
              moveRangeOnFirstSelection={false}
              months={1} // <-- THE ONLY CRITICAL CHANGE: Shows 1 month instead of 2
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