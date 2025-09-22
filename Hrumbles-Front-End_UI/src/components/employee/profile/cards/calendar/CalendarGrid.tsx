import React from "react";
import { format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarDay } from "./types";

interface CalendarGridProps {
  days: CalendarDay[];
  selectedDate: Date;
  onSelectDate: (date: Date, hasInterview: boolean, hasHoliday: boolean, hasLeave: boolean) => void;
}

const weekDays = [
  { label: 'S', name: 'Sunday' },
  { label: 'M', name: 'Monday' },
  { label: 'T', name: 'Tuesday' },
  { label: 'W', name: 'Wednesday' },
  { label: 'T', name: 'Thursday' },
  { label: 'F', name: 'Friday' },
  { label: 'S', name: 'Saturday' },
];

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  days,
  selectedDate,
  onSelectDate,
}) => {
  return (
    <>
      <div className="grid grid-cols-7 gap-3">
        {weekDays.map((day) => (
          <div
            key={day.name}
            className="h-14 flex items-center justify-center text-xs font-medium text-black"
          >
            {day.label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-8">
        {days.map((day, index) => (
          <div 
            key={index}
            className={cn(
              "h-7 w-7 flex items-center justify-center text-xs relative",
              "rounded-full transition-colors cursor-pointer mx-auto",
              !day.isCurrentMonth && "text-gray-900",
              day.isToday && !day.hasInterview && !day.hasHoliday && !day.hasLeave && !isSameDay(day.date, selectedDate) && "bg-blue-50 text-blue-600 font-medium",
              day.hasInterview && !isSameDay(day.date, selectedDate) && "bg-purple-200 text-purple-600 font-medium",
              day.hasHoliday && !day.hasInterview && !isSameDay(day.date, selectedDate) && "bg-blue-200 text-blue-600 font-medium",
              day.hasLeave && !day.hasInterview && !day.hasHoliday && !isSameDay(day.date, selectedDate) && (
                day.leaveStatus === 'approved' ? "bg-green-50 text-green-600 font-medium" : "bg-amber-200 text-amber-600 font-medium"
              ),
              day.isToday && (day.hasInterview || day.hasHoliday || day.hasLeave) && !isSameDay(day.date, selectedDate) && "border border-blue-200",
              day.isSunday && !day.hasInterview && !day.hasHoliday && !day.hasLeave && !isSameDay(day.date, selectedDate) && "text-[#F59E0B]",
              !day.isSunday && day.isCurrentMonth && !day.isToday && !day.hasInterview && !day.hasHoliday && !day.hasLeave && !isSameDay(day.date, selectedDate) && "text-black hover:bg-gray-100 hover:text-gray-900",
              isSameDay(day.date, selectedDate) && "bg-[#1A73E8] text-white hover:bg-[#1A73E8]/90"
            )}
            onClick={() => onSelectDate(day.date, day.hasInterview, day.hasHoliday, day.hasLeave)}
          >
            {format(day.date, 'd')}
            <div className="absolute flex space-x-0.5 -top-0.5 -right-1.5">
              {day.hasInterview && (
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              )}
              {day.hasHoliday && (
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              )}
              {day.hasLeave && (
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  day.leaveStatus === 'approved' ? "bg-green-500" : "bg-amber-500"
                )} />
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};