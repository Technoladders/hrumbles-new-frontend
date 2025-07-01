
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RegularizationRequest } from "@/types/time-tracker-types";

export const submitRegularizationRequest = async (data: {
  employeeId: string;
  timeLogId?: string;
  date: string;
  originalClockIn?: string;
  originalClockOut?: string;
  requestedClockIn: string;
  requestedClockOut: string;
  reason: string;
  organization_id: string;
}) => {
  try {
    console.log("Submitting regularization with data:", data);
    
    const { data: result, error } = await supabase
      .from('timesheet_regularization')
      .insert({
        employee_id: data.employeeId,
        time_log_id: data.timeLogId,
        date: data.date,
        original_clock_in: data.originalClockIn,
        original_clock_out: data.originalClockOut,
        requested_clock_in: data.requestedClockIn,
        requested_clock_out: data.requestedClockOut,
        reason: data.reason,
        status: 'pending',
        organization_id: data.organization_id
      })
      .select();

    if (error) throw error;
    
    toast.success("Regularization request submitted successfully");
    return true;
  } catch (error) {
    console.error("Error submitting regularization request:", error);
    toast.error("Failed to submit regularization request");
    return false;
  }
};

export const approveRegularizationRequest = async (
  requestId: string,
  notes?: string
) => {
  try {
    const { error } = await supabase
      .from('timesheet_regularization')
      .update({
        status: 'approved',
        approver_notes: notes || ''
      })
      .eq('id', requestId);

    if (error) throw error;
    
    toast.success("Regularization request approved");
    return true;
  } catch (error) {
    console.error("Error approving regularization request:", error);
    toast.error("Failed to approve regularization request");
    return false;
  }
};

export const rejectRegularizationRequest = async (
  requestId: string,
  notes: string
) => {
  try {
    const { error } = await supabase
      .from('timesheet_regularization')
      .update({
        status: 'rejected',
        approver_notes: notes
      })
      .eq('id', requestId);

    if (error) throw error;
    
    toast.success("Regularization request rejected");
    return true;
  } catch (error) {
    console.error("Error rejecting regularization request:", error);
    toast.error("Failed to reject regularization request");
    return false;
  }
};

export const fetchRegularizationRequests = async (employeeId?: string): Promise<RegularizationRequest[]> => {
  try {
    let query = supabase
      .from('timesheet_regularization')
      .select(`
        *,
        employee:hr_employees!timesheet_regularization_employee_id_fkey(id, first_name, last_name, department_id, email),
        time_logs(*)
      `);
    
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }
    
    const { data, error } = await query.returns<RegularizationRequest[]>();
    
    if (error) throw error;
    
    console.log("Fetched regularization requests:", data);
    
    return data;
  } catch (error) {
    console.error("Error fetching regularization requests:", error);
    toast.error("Failed to fetch regularization requests");
    return [];
  }
};
