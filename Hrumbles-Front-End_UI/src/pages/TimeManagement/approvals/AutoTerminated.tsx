
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { TimeLog } from "@/types/time-tracker-types";
import { TimesheetTable } from "@/components/TimeManagement/timesheet/TimesheetTable";

const AutoTerminated = () => {
  const [autoTerminatedLogs, setAutoTerminatedLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAutoTerminatedLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('time_logs')
        .select(`
          id,
          employee_id,
          date,
          clock_in_time,
          clock_out_time,
          duration_minutes,
          status,
          is_submitted,
          notes,
          created_at,
          project_id,
          employee:hr_employees!employee_id(
      id,
      first_name,
      last_name,
      department_id
    )
        `)
        .eq('status', 'auto_terminated')
        .order('date', { ascending: false });

      if (error) {
        throw error;
      }

      // Transform data to match TimeLog interface
      const typedLogs: TimeLog[] = (data || []).map(item => {
        if (!item) return {} as TimeLog; // Handle null items
        
        return {
          id: item.id || '',
          employee_id: item.employee_id || '',
          date: item.date || '',
          clock_in_time: item.clock_in_time || null,
          clock_out_time: item.clock_out_time || null,
          duration_minutes: item.duration_minutes || null,
          status: 'auto_terminated' as TimeLog['status'],
          project_id: item.project_id || null,
          notes: item.notes || null,
          is_submitted: item.is_submitted || false,
          is_approved: false,
          approved_at: null,
          approved_by: null,
          rejection_reason: null,
          project_time_data: null,
          created_at: item.created_at || null,
          updated_at: null,
          employees: item.employees || null,
          project: null
        };
      }).filter(item => item.id) as TimeLog[];

      setAutoTerminatedLogs(typedLogs);
    } catch (error: any) {
      console.error("Error fetching auto-terminated logs:", error);
      toast.error("Failed to load auto-terminated logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAutoTerminatedLogs();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl font-bold">Auto-Terminated Timesheets</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <TimesheetTable 
            timesheets={autoTerminatedLogs}
            type="pending" // Using a valid type here
            onViewTimesheet={() => {}}
            loading={loading}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default AutoTerminated;
