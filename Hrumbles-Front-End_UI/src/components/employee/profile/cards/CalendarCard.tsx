
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Calendar, ListTodo } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, 
         isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, format } from "date-fns";
import { CalendarHeader } from "./calendar/CalendarHeader";
import { CalendarGrid } from "./calendar/CalendarGrid";
import { EventsList } from "./calendar/EventsList";
import { TasksList } from "./calendar/TasksList";
import { Holiday, CalendarDay } from "./calendar/types";

export const CalendarCard = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const year = new Date().getFullYear();
        const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/IN`);
        const data = await response.json();
        setHolidays(data);
      } catch (error) {
        console.error("Failed to fetch holidays:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHolidays();
  }, []);

  const generateMonth = (date: Date): CalendarDay[] => {
    const start = startOfWeek(startOfMonth(date));
    const end = endOfWeek(endOfMonth(date));
    const days = eachDayOfInterval({ start, end });

    return days.map(day => ({
      date: day,
      isCurrentMonth: isSameMonth(day, date),
      isToday: isSameDay(day, new Date()),
      isHoliday: isHoliday(day),
      isSunday: day.getDay() === 0,
      holidayInfo: getHolidayInfo(day),
    }));
  };

  const isHoliday = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return holidays.some(holiday => holiday.date === dateString);
  };

  const getHolidayInfo = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return holidays.find(holiday => holiday.date === dateString);
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const days = generateMonth(currentDate);

  return (
    <Card className="p-4 hover:shadow-md transition-shadow bg-white/80 backdrop-blur-sm h-[350px] overflow-hidden">
      <div className="grid grid-cols-[2fr_3fr] gap-4 h-full">
        <div className="flex flex-col space-y-2 min-w-0">
          <CalendarHeader 
            currentDate={currentDate}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
          />
          <CalendarGrid 
            days={days}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>
        
        <div className="flex flex-col h-full min-w-0">
          <Tabs defaultValue="events" className="flex flex-col h-full">
            <TabsList className="grid grid-cols-2 mb-1.5">
              <TabsTrigger value="events" className="flex items-center gap-1 text-xs">
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">Upcoming Events</span>
              </TabsTrigger>
              <TabsTrigger value="tasks" className="flex items-center gap-1 text-xs">
                <ListTodo className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">Tasks</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="events" className="flex-1 overflow-hidden">
              <EventsList />
            </TabsContent>

            <TabsContent value="tasks" className="flex-1 overflow-hidden">
              <TasksList />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Card>
  );
};
