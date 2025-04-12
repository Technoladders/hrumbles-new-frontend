
import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface CalendarHeaderProps {
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  onPrevMonth,
  onNextMonth,
}) => {
  return (
    <div className="flex items-center justify-between px-2">
      <button 
        onClick={onPrevMonth}
        className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
      </button>
      <h2 className="text-sm font-semibold text-gray-900">
        {format(currentDate, 'MMMM yyyy')}
      </h2>
      <button 
        onClick={onNextMonth}
        className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
      >
        <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
      </button>
    </div>
  );
};
