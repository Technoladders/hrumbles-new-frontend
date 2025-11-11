
import { supabase } from "@/integrations/supabase/client";
import { TimeLog } from "@/types/time-tracker-types";

export const fetchActiveTimeLog = async (employeeId: string): Promise<TimeLog | null> => {
  try {
    // Remove the project relationship from the query since it's causing errors
    const { data, error } = await supabase
      .from('time_logs')
      .select('*, break_logs(*)')
      .eq('employee_id', employeeId)
      .is('clock_out_time', null)
     .maybeSingle();

    if (error) throw error;
    
    if (data) {
      // Create a properly typed TimeLog object with all required fields
      const typedData: TimeLog = {
        id: data.id,
        employee_id: data.employee_id,
        date: data.date,
        clock_in_time: data.clock_in_time,
        clock_out_time: data.clock_out_time,
        duration_minutes: data.duration_minutes,
        project_id: data.project_id,
        notes: data.notes,
        status: data.status as TimeLog['status'],
        is_submitted: data.is_submitted || false,
        is_approved: data.is_approved || false,
        approved_at: data.approved_at || null,
        approved_by: data.approved_by || null,
        rejection_reason: data.rejection_reason || null,
        project_time_data: data.project_time_data || null,
        created_at: data.created_at || null,
        updated_at: null, // This field doesn't exist in the result, so set it to null
        project: data.project_id ? { name: `Project ${data.project_id.substring(0, 8)}` } : null,
        clarification_status: data.clarification_status || null,
        clarification_response: data.clarification_response || null,
        clarification_submitted_at: data.clarification_submitted_at || null,
        total_working_hours: data.total_working_hours || null,

       break_logs: (data.break_logs || []).map((b: any) => ({
          id: b.id,
          time_log_id: b.time_log_id,
          break_start_time: b.break_start_time,
          break_end_time: b.break_end_time,
          duration_minutes: b.duration_minutes,
          break_type: b.break_type,
          created_at: b.created_at,
        })),
      };
      
      return typedData;
    }
    return null;
  } catch (error) {
    console.error("Error fetching active time log:", error);
    return null;
  }
};
