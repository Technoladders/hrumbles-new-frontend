
import { useState, useEffect } from "react";
import { format, parseISO, startOfMonth, endOfMonth, addMonths, addYears, subYears } from "date-fns";
import { Holiday, OfficialHoliday } from "@/types/time-tracker-types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Calculate days for the calendar grid
  const startOfCurrentMonth = startOfMonth(currentDate);
  const endOfCurrentMonth = endOfMonth(currentDate);
  const startDay = startOfCurrentMonth.getDay();
  const totalDays = endOfCurrentMonth.getDate();
  
  const currentMonthYear = format(currentDate, "MMMM yyyy");
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  const days = Array.from({ length: 42 }, (_, i) => {
    const dayOffset = i - startDay;
    const day = dayOffset + 1;
    return day > 0 && day <= totalDays ? day : null;
  });

  const changeMonth = (offset: number) => {
    setCurrentDate(prev => addMonths(prev, offset));
  };

  const changeYear = (offset: number) => {
    setCurrentDate(prev => offset > 0 ? addYears(prev, 1) : subYears(prev, 1));
  };

  useEffect(() => {
    fetchHolidays();
  }, [currentDate]);

  const fetchHolidays = async () => {
    try {
      const startDate = format(startOfCurrentMonth, "yyyy-MM-dd");
      const endDate = format(endOfCurrentMonth, "yyyy-MM-dd");
      
      const { data: holidays, error } = await supabase.functions.invoke('get_holidays_between_dates', {
        body: { start_date: startDate, end_date: endDate }
      });
      
      if (error) throw error;
      
      const mappedHolidays: Holiday[] = Array.isArray(holidays) ? holidays.map((item: OfficialHoliday) => ({
        id: item.id,
        name: item.holiday_name,
        date: item.holiday_date,
        day_of_week: item.day_of_week || '',
        type: item.holiday_type,
        is_recurring: item.is_recurring,
        created_at: item.created_at,
        updated_at: item.updated_at
      })) : [];
      
      setHolidays(mappedHolidays);
    } catch (error) {
      console.error('Error fetching holidays:', error);
      toast.error('Failed to load holidays');
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback method for fetching holidays if RPC fails
  const fetchHolidaysFallback = async (startDate: string, endDate: string) => {
    try {
      // Using straight SQL query via functions instead
      const days = [];
      let currentDate = new Date(startDate);
      const endDateTime = new Date(endDate);
      
      while (currentDate <= endDateTime) {
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        const { data: isHoliday } = await supabase.functions.invoke('is_date_holiday', { 
          body: { check_date: dateStr }
        });
        
        if (isHoliday) {
          days.push({
            id: dateStr,
            name: "Holiday",
            date: dateStr,
            day_of_week: format(currentDate, 'EEEE'),
            type: 'System',
            is_recurring: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      setHolidays(days);
    } catch (error) {
      console.error('Error in holiday fallback:', error);
      setHolidays([]);
    }
  };

  const getDateForDay = (day: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month, day);
  };
  
  const isHoliday = (day: number | null) => {
    if (!day) return false;
    const currentDateStr = format(getDateForDay(day), "yyyy-MM-dd");
    return holidays.some(holiday => holiday.date === currentDateStr);
  };
  
  const getHolidayForDay = (day: number | null) => {
    if (!day) return undefined;
    const currentDateStr = format(getDateForDay(day), "yyyy-MM-dd");
    return holidays.find(holiday => holiday.date === currentDateStr);
  };

  return {
    currentDate,
    currentMonthYear,
    weekdays,
    days,
    holidays,
    isLoading,
    getDateForDay,
    isHoliday,
    getHolidayForDay,
    changeMonth,
    changeYear,
  };
};
