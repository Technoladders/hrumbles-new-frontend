import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { CalendarGrid } from "@/components/TimeManagement/calendar/CalendarGrid";
import { UpcomingEvents } from "@/components/TimeManagement/calendar/UpcomingEvents";
import { HolidayList } from "@/components/TimeManagement/calendar/HolidayList";
import { useCalendar } from "@/hooks/TimeManagement/useCalendar";
import { useEmployeeLeaves } from "@/hooks/TimeManagement/useEmployeeLeaves";
import { useSelector } from 'react-redux';
import { startOfMonth } from "date-fns";
import { MonthNavigation } from "@/components/TimeManagement/holidays/MonthNavigation";
import { useMemo } from "react";

const Calendar = () => {
  const user = useSelector((state: any) => state.auth.user);
  const employeeId = useMemo(() => user?.id || "", [user]);

  const {
    currentDate,
    currentMonthYear,
    weekdays,
    days,
    holidays,
    isLoading: isCalendarLoading,
    getDateForDay,
    isHoliday,
    getHolidayForDay,
    changeMonth,
    changeYear,
  } = useCalendar();

  const monthStart = useMemo(() => startOfMonth(currentDate), [currentDate]);

  const {
    isLeaveDay,
    getLeaveInfoForDay,
    isLoading: isLeavesLoading
  } = useEmployeeLeaves(employeeId, monthStart);

  const isLoading = isCalendarLoading || isLeavesLoading;

  console.log('Calendar rendered', { employeeId, currentDate, monthStart });

  return (
    <div className="content-area">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Work Calendar</h1>
        <p className="text-muted-foreground">
          View your schedule, leave, and holidays
        </p>
      </div>

      <Card className="border-none shadow-md overflow-hidden bg-gradient-to-br from-card to-background">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Calendar</CardTitle>
            <MonthNavigation 
              currentMonthName={currentMonthYear}
              onPreviousMonth={() => changeMonth(-1)}
              onNextMonth={() => changeMonth(1)}
              onPreviousYear={() => changeYear(-1)}
              onNextYear={() => changeYear(1)}
            />
          </div>
          <CardDescription>
            Your work schedule and important dates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <CalendarGrid
              days={days}
              weekdays={weekdays}
              currentDate={currentDate}
              getDateForDay={getDateForDay}
              getHolidayForDay={getHolidayForDay}
              isHoliday={isHoliday}
              isLeaveDay={isLeaveDay}
              getLeaveInfoForDay={getLeaveInfoForDay}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 mt-6 sm:grid-cols-2">
        <UpcomingEvents />
        <HolidayList holidays={holidays} />
      </div>
    </div>
  );
};

export default Calendar;