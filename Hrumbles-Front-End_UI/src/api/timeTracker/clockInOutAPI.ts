
import { supabase } from "@/integrations/supabase/client";
import { TimeLog } from "@/types/time-tracker-types";
import { toast } from "sonner";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";

export const clockIn = async (
  employeeId: string, 
  projectId?: string, 
  projectTimeData?: any,
  organization_id: string
) => {
  try {
    const authData = getAuthDataFromLocalStorage();
        if (!authData) {
          throw new Error('Failed to retrieve authentication data');
        }
        const { organization_id, userId } = authData;
    const { data, error } = await supabase
    
      .from('time_logs')
      .insert({
        employee_id: employeeId,
        project_id: projectId,
        project_time_data: projectTimeData,
        clock_in_time: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        organization_id: organization_id,

      })
      .select()
      .single();

    if (error) throw error;
    
    toast.success("Clocked in successfully");
    return data;
  } catch (error) {
    console.error("Error clocking in:", error);
    toast.error("Failed to clock in");
    return null;
  }
};

export const clockOut = async (timeLogId: string, projectTimeData?: any) => {
  try {
    const { data, error } = await supabase
      .from('time_logs')
      .update({
        clock_out_time: new Date().toISOString(),
        project_time_data: projectTimeData,
        duration_minutes: 0 // This will be calculated by a trigger
      })
      .eq('id', timeLogId)
      .select()
      .single();

    if (error) throw error;
    
    toast.success("Clocked out successfully");
    return data;
  } catch (error) {
    console.error("Error clocking out:", error);
    toast.error("Failed to clock out");
    return null;
  }
};
