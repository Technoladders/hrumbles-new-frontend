import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, addMonths, addYears, subYears } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Holiday, OfficialHolidayInsert } from "@/types/time-tracker-types";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";

export const useHolidays = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const authData = getAuthDataFromLocalStorage();
  const organization_id = authData?.organization_id;

  const fetchHolidays = async () => {
    if (!organization_id) return;

    try {
      setIsLoading(true);
      const startDate = format(startOfMonth(currentDate), "yyyy-MM-dd");
      const endDate = format(endOfMonth(currentDate), "yyyy-MM-dd");
      
      // Direct DB Query (RLS filtered)
      const { data, error } = await supabase
        .from('official_holidays')
        .select('*')
        .eq('organization_id', organization_id)
        .gte('holiday_date', startDate)
        .lte('holiday_date', endDate)
        .order('holiday_date', { ascending: true });
      
      if (error) throw error;
      
      const mappedHolidays: Holiday[] = data.map((item: any) => ({
        id: item.id,
        name: item.holiday_name,
        date: item.holiday_date,
        day_of_week: item.day_of_week || format(new Date(item.holiday_date), 'EEEE'),
        type: item.holiday_type,
        is_recurring: item.is_recurring,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));

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
      const { error } = await supabase
        .from('official_holidays')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Holiday deleted successfully');
      fetchHolidays();
    } catch (error) {
      console.error('Error deleting holiday:', error);
      toast.error('Failed to delete holiday');
    }
  };

  const handleAddHolidays = async (newHolidays: Omit<Holiday, "id" | "created_at" | "updated_at">[]) => {
    if (!organization_id) return;

    try {
      const holidaysToInsert = newHolidays.map(holiday => ({
        organization_id, // Important: Scope to Org
        holiday_name: holiday.name,
        holiday_date: holiday.date,
        day_of_week: holiday.day_of_week,
        holiday_type: holiday.type,
        is_recurring: holiday.is_recurring || false,
      }));

      const { error } = await supabase
        .from('official_holidays')
        .insert(holidaysToInsert);
        
      if (error) throw error;

      toast.success(`Added ${newHolidays.length} holiday(s)`);
      setIsDialogOpen(false);
      fetchHolidays();
    } catch (error) {
      console.error('Error adding holidays:', error);
      toast.error('Failed to add holidays');
    }
  };

  const changeMonth = (offset: number) => {
    setCurrentDate(prev => addMonths(prev, offset));
  };

  const changeYear = (offset: number) => {
    setCurrentDate(prev => offset > 0 ? addYears(prev, 1) : subYears(prev, 1));
  };

  useEffect(() => {
    fetchHolidays();
  }, [currentDate, organization_id]);

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