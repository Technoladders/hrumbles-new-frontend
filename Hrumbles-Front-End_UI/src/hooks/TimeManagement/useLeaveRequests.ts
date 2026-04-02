import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LeaveRequest, LeaveRequestFormData } from "@/types/leave-types";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";

export const useLeaveRequests = (employeeId: string) => {
  const queryClient    = useQueryClient();
  const authData       = getAuthDataFromLocalStorage();
  const organization_id = authData?.organization_id as string | undefined;

  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);

  // ── Fetch requests ────────────────────────────────────────
  const { data: leaveRequests = [], isLoading } = useQuery({
    queryKey: ["leave_requests", employeeId],
    queryFn:  async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from("leave_requests")
        .select(`
          *,
          leave_type:leave_type_id(*),
          hr_employees:employee_id(id, first_name, last_name, hr_departments(name))
        `)
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data.map((item: any) => ({
        ...item,
        leave_type: item.leave_type,
        employee: item.hr_employees
          ? {
              id:         item.hr_employees.id,
              name:       `${item.hr_employees.first_name} ${item.hr_employees.last_name}`.trim(),
              department: item.hr_employees.hr_departments?.name,
            }
          : null,
      })) as LeaveRequest[];
    },
    enabled:   !!employeeId,
    staleTime: 5 * 60 * 1000,
  });

  // ── Create request ────────────────────────────────────────
  const createLeaveRequest = useMutation({
    mutationFn: async (formData: LeaveRequestFormData) => {
      if (!employeeId || !organization_id)
        throw new Error("Auth details missing");

      // Client-side working day count from breakdown (already filtered by picker)
      const requestedDays = formData.dayBreakdown.reduce(
        (acc, d) => acc + (d.type === "full" ? 1 : 0.5),
        0
      );

      // ── DB validation (server recounts, client count is a hint) ──
      const { data: validation, error: valErr } = await supabase.rpc(
        "validate_leave_request",
        {
          p_employee_id:   employeeId,
          p_leave_type_id: formData.leaveTypeId,
          p_start_date:    formData.startDate,
          p_end_date:      formData.endDate,
          p_total_days:    requestedDays,
          p_org_id:        organization_id,   // ← new param
        }
      );

      if (valErr) throw new Error("Validation system error. Please try again.");

      if (validation && !validation.valid)
        throw new Error(validation.message);

      // Use server-recalculated days if returned (handles alternate Saturday config)
      const finalDays = validation?.server_days ?? requestedDays;

      // ── Holiday days for record-keeping ───────────────────
      const { data: daysCalc } = await supabase.rpc(
        "calculate_working_and_holiday_days",
        {
          p_org_id:     organization_id,   // ← new param
          p_start_date: formData.startDate,
          p_end_date:   formData.endDate,
        }
      );
      const holidayDays = daysCalc?.[0]?.holiday_days ?? 0;

      // ── Insert ────────────────────────────────────────────
      const { data, error } = await supabase
        .from("leave_requests")
        .insert({
          organization_id,
          employee_id:            employeeId,
          leave_type_id:          formData.leaveTypeId,
          start_date:             formData.startDate,
          end_date:               formData.endDate,
          total_days:             finalDays,
          working_days:           finalDays,
          holiday_days:           holidayDays,
          status:                 "pending",
          notes:                  formData.notes,
          day_breakdown:          formData.dayBreakdown,
          additional_recipients:  formData.additionalRecipients ?? [],   // ← standardised
          cc_recipients:          formData.ccRecipients          ?? [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave_requests", employeeId] });
      queryClient.invalidateQueries({
        queryKey: ["employee_leave_balances", employeeId],
      });
      setIsRequestDialogOpen(false);
      toast.success("Leave request submitted successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to submit request"),
  });

  // ── Cancel request ────────────────────────────────────────
  const cancelLeaveRequest = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from("leave_requests")
        .update({
          status:              "cancelled",
          cancellation_reason: reason,
          cancelled_at:        new Date().toISOString(),
          cancelled_by:        employeeId,
        })
        .eq("id", id)
        .eq("employee_id", employeeId);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave_requests", employeeId] });
      queryClient.invalidateQueries({
        queryKey: ["employee_leave_balances", employeeId],
      });
      toast.success("Leave request cancelled");
    },
    onError: (err: any) =>
      toast.error(`Failed to cancel: ${err.message}`),
  });

  const refetchLeaveRequests = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["leave_requests", employeeId] });
  }, [queryClient, employeeId]);

  return {
    leaveRequests,
    loading:           isLoading,
    isLoading,
    isSubmitting:      createLeaveRequest.isPending || cancelLeaveRequest.isPending,
    createLeaveRequest: createLeaveRequest.mutateAsync,
    cancelLeaveRequest: cancelLeaveRequest.mutateAsync,
    refetchLeaveRequests,
    isRequestDialogOpen,
    setIsRequestDialogOpen,
  };
};