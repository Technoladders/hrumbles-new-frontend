
import React from "react";
import { format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CalendarDay } from "./types";

interface CalendarGridProps {
  days: CalendarDay[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  days,
  selectedDate,
  onSelectDate,
}) => {
  return (
    <>
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map(day => (
          <div key={day} className="h-5 flex items-center justify-center text-xs font-medium text-gray-400">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, index) => (
          <TooltipProvider key={index}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "h-6 w-6 flex items-center justify-center text-xs relative",
                    "rounded-full transition-colors cursor-pointer mx-auto",
                    !day.isCurrentMonth && "text-gray-300",
                    day.isToday && !isSameDay(day.date, selectedDate) && "bg-blue-50 text-blue-600 font-medium",
                    day.isSunday && !isSameDay(day.date, selectedDate) && "text-[#F59E0B]",
                    day.isHoliday && !isSameDay(day.date, selectedDate) && "text-[#EF4444]",
                    !day.isSunday && !day.isHoliday && day.isCurrentMonth && !isSameDay(day.date, selectedDate) && "text-gray-900 hover:bg-gray-100",
                    isSameDay(day.date, selectedDate) && "bg-[#1A73E8] text-white hover:bg-[#1A73E8]/90"
                  )}
                  onClick={() => onSelectDate(day.date)}
                >
                  {format(day.date, 'd')}
                  {day.holidayInfo && (
                    <div className="absolute -top-0.5 -right-0.5 w-1 h-1 bg-red-500 rounded-full" />
                  )}
                </div>
              </TooltipTrigger>
              {day.holidayInfo && (
                <TooltipContent>
                  <div className="text-xs">
                    <p className="font-medium">{day.holidayInfo.name}</p>
                    <p className="text-xs text-gray-500">{day.holidayInfo.localName}</p>
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </>
  );
};
