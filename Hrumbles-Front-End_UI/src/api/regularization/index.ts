import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RegularizationRequest } from "@/types/time-tracker-types";

/**
 * Extract "HH:mm" from a stored datetime string, timezone-safe.
 * Handles "2026-05-20T09:00:00", "2026-05-20T09:00:00Z", "...+05:30" etc.
 */
export const extractHHMM = (datetimeStr: string | null | undefined): string => {
  if (!datetimeStr) return '';
  const t = datetimeStr.split('T')[1];
  if (!t) return '';
  const clean = t.split('+')[0].split('Z')[0];
  const parts = clean.split(':');
  if (parts.length < 2) return '';
  return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
};

// ─── Submit ───────────────────────────────────────────────────────────────────

export const submitRegularizationRequest = async (data: {
  employeeId: string;
  timeLogId?: string;
  date: string;                  // yyyy-MM-dd
  originalClockIn?: string;
  originalClockOut?: string;
  requestedClockIn: string;      // HH:mm (24h from native <input type="time">)
  requestedClockOut: string;     // HH:mm (24h)
  reason: string;
  organizationId: string;
}): Promise<{ success: boolean; isDuplicate: boolean }> => {
  try {
    // Duplicate pending guard
    const { data: existing } = await supabase
      .from('timesheet_regularization')
      .select('id')
      .eq('employee_id', data.employeeId)
      .eq('date', data.date)
      .eq('status', 'pending')
      .maybeSingle();

    if (existing) {
      toast.error("A pending request already exists for this date");
      return { success: false, isDuplicate: true };
    }

    // Store as naive datetime — no timezone suffix so read-back is consistent
    const clockInDT  = `${data.date}T${data.requestedClockIn}:00`;
    const clockOutDT = `${data.date}T${data.requestedClockOut}:00`;

    const { error } = await supabase
      .from('timesheet_regularization')
      .insert({
        employee_id:       data.employeeId,
        time_log_id:       data.timeLogId || null,
        date:              data.date,
        original_clock_in: data.originalClockIn  || null,
        original_clock_out:data.originalClockOut || null,
        requested_clock_in: clockInDT,
        requested_clock_out: clockOutDT,
        reason:            data.reason,
        status:            'pending',
        organization_id:   data.organizationId,
      });

    if (error) throw error;
    toast.success("Regularization request submitted successfully");
    return { success: true, isDuplicate: false };
  } catch (err) {
    console.error("submitRegularizationRequest:", err);
    toast.error("Failed to submit regularization request");
    return { success: false, isDuplicate: false };
  }
};

// ─── Approve ──────────────────────────────────────────────────────────────────

export const approveRegularizationRequest = async (
  requestId: string,
  approverId: string,
  notes?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('timesheet_regularization')
      .update({
        status:         'approved',
        approver_id:    approverId,
        approver_notes: notes?.trim() || null,
        updated_at:     new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) throw error;
    toast.success("Request approved");
    return true;
  } catch (err) {
    console.error("approveRegularizationRequest:", err);
    toast.error("Failed to approve request");
    return false;
  }
};

// ─── Reject ───────────────────────────────────────────────────────────────────

export const rejectRegularizationRequest = async (
  requestId: string,
  approverId: string,
  notes: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('timesheet_regularization')
      .update({
        status:         'rejected',
        approver_id:    approverId,
        approver_notes: notes.trim(),
        updated_at:     new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) throw error;
    toast.success("Request rejected");
    return true;
  } catch (err) {
    console.error("rejectRegularizationRequest:", err);
    toast.error("Failed to reject request");
    return false;
  }
};

// ─── Cancel (employee) ────────────────────────────────────────────────────────

export const cancelRegularizationRequest = async (requestId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('timesheet_regularization')
      .update({
        status:     'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('status', 'pending'); // safety — only pending can be cancelled

    if (error) throw error;
    toast.success("Request cancelled");
    return true;
  } catch (err) {
    console.error("cancelRegularizationRequest:", err);
    toast.error("Failed to cancel request");
    return false;
  }
};

// ─── Fetch ────────────────────────────────────────────────────────────────────

export const fetchRegularizationRequests = async (
  organizationId: string,
  employeeId?: string
): Promise<RegularizationRequest[]> => {
  try {
    let query = supabase
      .from('timesheet_regularization')
      .select(`
        *,
        employee:hr_employees!timesheet_regularization_employee_id_fkey(
          id, first_name, last_name, email, department_id
        ),
        time_log:time_logs(
          id, clock_in_time, clock_out_time, duration_minutes, date
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (employeeId) query = query.eq('employee_id', employeeId);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as unknown as RegularizationRequest[];
  } catch (err) {
    console.error("fetchRegularizationRequests:", err);
    toast.error("Failed to fetch regularization requests");
    return [];
  }
};