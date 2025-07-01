
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface RegularizationDatePickerProps {
  date: Date;
  onDateChange: (date: Date | undefined) => void;
  isDateValid: (date: Date) => boolean;
  disabled?: boolean;  // Added disabled prop
}

export const RegularizationDatePicker = ({
  date,
  onDateChange,
  isDateValid,
  disabled = false  // Set default value to false
}: RegularizationDatePickerProps) => {
  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      // Create a new date with the same year, month, day but at noon to avoid timezone issues
      const selectedDate = new Date(
        newDate.getFullYear(),
        newDate.getMonth(),
        newDate.getDate(),
        12, 0, 0, 0
      );
      console.log("Date selected:", selectedDate, "formatted:", format(selectedDate, 'yyyy-MM-dd'));
      onDateChange(selectedDate);
    } else {
      onDateChange(undefined);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
          disabled={disabled}  // Apply disabled state to button
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          disabled={(date) => !isDateValid(date) || disabled}  // Apply disabled state to calendar
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};
