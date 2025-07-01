
import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, addMonths, addYears, subYears } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Holiday, OfficialHolidayInsert, OfficialHoliday } from "@/types/time-tracker-types";

export const useHolidays = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchHolidays = async () => {
    try {
      setIsLoading(true);
      const startDate = format(startOfMonth(currentDate), "yyyy-MM-dd");
      const endDate = format(endOfMonth(currentDate), "yyyy-MM-dd");
      
      // Use functions.invoke method for get_holidays_between_dates
      const { data, error } = await supabase.functions.invoke('get_holidays_between_dates', {
        body: { start_date: startDate, end_date: endDate }
      });
      
      if (error) {
        console.error('Error from function:', error);
        setHolidays([]);
        return;
      }
      
      // Map the data to our Holiday type
      const mappedHolidays: Holiday[] = Array.isArray(data) ? data.map((item: OfficialHoliday) => ({
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

  const handleDeleteHoliday = async (id: string) => {
    try {
      // Use functions.invoke method for delete_holiday
      const { error } = await supabase.functions.invoke('delete_holiday', { 
        body: { holiday_id: id }
      });

      if (error) throw error;

      toast.success('Holiday deleted successfully');
      fetchHolidays();
    } catch (error) {
      console.error('Error deleting holiday:', error);
      toast.error('Failed to delete holiday');
    }
  };

  const handleAddHolidays = async (newHolidays: Omit<Holiday, "id" | "created_at" | "updated_at">[]) => {
    try {
      // Transform to the correct format for the database
      const holidaysToInsert = newHolidays.map(holiday => ({
        holiday_name: holiday.name,
        holiday_date: holiday.date,
        day_of_week: holiday.day_of_week,
        holiday_type: holiday.type,
        is_recurring: holiday.is_recurring || false,
      } as OfficialHolidayInsert));

      // Use functions.invoke method for add_holiday
      for (const holiday of holidaysToInsert) {
        const { error } = await supabase.functions.invoke('add_holiday', {
          body: holiday
        });
        
        if (error) {
          console.error('Error adding holiday:', error);
          toast.error(`Failed to add holiday: ${holiday.holiday_name}`);
        }
      }

      toast.success(`Added ${newHolidays.length} holiday${newHolidays.length !== 1 ? 's' : ''} successfully`);
      setIsDialogOpen(false);
      // Refetch to get the updated holiday list
      fetchHolidays();
    } catch (error) {
      console.error('Error adding holidays:', error);
      toast.error('Failed to add holidays');
    }
  };

  const changeMonth = (offset: number) => {
    const newDate = addMonths(currentDate, offset);
    setCurrentDate(newDate);
  };

  const changeYear = (offset: number) => {
    setCurrentDate(prev => offset > 0 ? addYears(prev, 1) : subYears(prev, 1));
  };

  useEffect(() => {
    fetchHolidays();
  }, [currentDate]);

  return {
    currentDate,
    holidays,
    isLoading,
    isDialogOpen,
    setIsDialogOpen,
    handleDeleteHoliday,
    handleAddHolidays,
    changeMonth,
    changeYear,
  };
};
