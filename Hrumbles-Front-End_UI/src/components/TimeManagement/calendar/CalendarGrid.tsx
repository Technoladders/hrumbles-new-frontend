
import { format } from "date-fns";
import { Holiday } from "@/types/time-tracker-types";
import { Badge } from "@/components/ui/badge";
import { EmployeeLeaveDay } from "@/hooks/TimeManagement/useEmployeeLeaves";

interface CalendarGridProps {
  days: (number | null)[];
  weekdays: string[];
  currentDate: Date;
  getDateForDay: (day: number) => Date;
  getHolidayForDay: (day: number | null) => Holiday | undefined;
  isHoliday: (day: number | null) => boolean;
  isLeaveDay: (day: Date | null) => boolean;
  getLeaveInfoForDay: (day: Date | null) => EmployeeLeaveDay | null | undefined;
}

export const CalendarGrid = ({
  days,
  weekdays,
  currentDate,
  getDateForDay,
  getHolidayForDay,
  isHoliday,
  isLeaveDay,
  getLeaveInfoForDay,
}: CalendarGridProps) => {
  const today = new Date();
  const isCurrentMonth = today.getMonth() === currentDate.getMonth() && 
                         today.getFullYear() === currentDate.getFullYear();
  const currentDay = today.getDate();

  return (
    <div className="grid grid-cols-7 gap-2 text-center">
      {weekdays.map((day) => (
        <div key={day} className="font-medium py-2 text-sm text-muted-foreground">
          {day}
        </div>
      ))}
      
      {days.map((day, index) => {
        const date = day ? getDateForDay(day) : null;
        const holiday = getHolidayForDay(day);
        const isHolidayDay = isHoliday(day);
        const isLeave = date ? isLeaveDay(date) : false;
        const leaveInfo = date ? getLeaveInfoForDay(date) : null;
        const isToday = isCurrentMonth && day === currentDay;
        
        return (
          <div 
            key={index} 
            className={`
              border rounded-md p-2 h-24 relative transition-all
              ${!day ? 'bg-muted/20' : 'hover:bg-accent/10 hover:shadow-sm cursor-pointer'}
              ${(index % 7 === 0 || index % 7 === 6) && day ? 'bg-muted/10' : ''}
              ${isHolidayDay ? 'bg-warning/10 border-warning/30' : ''}
              ${isToday ? 'border-2 border-primary shadow-sm' : ''}
              ${isLeave ? `border-2 shadow-sm` : ''}
            `}
            style={isLeave ? { borderColor: leaveInfo?.leaveType.color } : {}}
          >
            {day && (
              <>
                <div className={`text-sm font-medium ${isToday ? 'text-white bg-primary rounded-full w-6 h-6 flex items-center justify-center mx-auto' : ''}`}>
                  {day}
                </div>
                
                {isHolidayDay && (
                  <Badge className="absolute top-6 right-1 bg-warning text-warning-foreground text-xs">
                    Holiday
                  </Badge>
                )}
                
                {isLeave && (
                  <Badge 
                    className="absolute top-6 right-1 text-xs"
                    style={{ 
                      backgroundColor: leaveInfo?.leaveType.color || '#3b82f6',
                      color: '#ffffff'
                    }}
                  >
                    Leave
                  </Badge>
                )}
                
                {holiday && (
                  <div className="text-xs mt-8 text-left truncate" title={holiday.name}>
                    {holiday.name}
                  </div>
                )}
                
                {isLeave && !holiday && (
                  <div 
                    className="text-xs mt-8 text-left truncate" 
                    title={leaveInfo?.leaveType.name}
                    style={{ color: leaveInfo?.leaveType.color || '#3b82f6' }}
                  >
                    {leaveInfo?.leaveType.name}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};
