import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmployeeLeaveBalance, LeaveType } from "@/types/leave-types";
import { toast } from "sonner";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";

export const useEmployeeLeaveBalances = (employeeId: string) => {
  const queryClient = useQueryClient();

  // ── Auth: read inside hook, never at module level ─────────
  const authData        = getAuthDataFromLocalStorage();
  const organization_id = authData?.organization_id as string | undefined;

  const currentYear = new Date().getFullYear();

  // ── Balances ──────────────────────────────────────────────
  const { data: leaveBalances = [], isLoading } = useQuery({
    queryKey: ["employee_leave_balances", employeeId, currentYear],
    queryFn:  async () => {
      if (!employeeId) return [];
      const { data, error } = await supabase
        .from("employee_leave_balances")
        .select("*, leave_type:leave_type_id(*)")
        .eq("employee_id", employeeId)
        .eq("year", currentYear);
      if (error) throw error;
      return data as EmployeeLeaveBalance[];
    },
    enabled:          !!employeeId,
    staleTime:        5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // ── Leave types (org-scoped, used for initialisation) ─────
  const { data: leaveTypes } = useQuery({
    queryKey: ["leaveTypes", organization_id],   // ← org_id in key
    queryFn:  async () => {
      if (!organization_id) return [];
      const { data, error } = await supabase
        .from("leave_types")
        .select("*")
        .eq("organization_id", organization_id)  // ← org filter
        .order("name");
      if (error) throw error;
      return data as LeaveType[];
    },
    enabled:   !!organization_id,
    staleTime: 5 * 60 * 1000,
  });

  // ── Initialise balances ───────────────────────────────────
  const initializeMutation = useMutation({
    mutationFn: async ({
      employeeId: empId,
      leaveTypeIds,
    }: {
      employeeId: string;
      leaveTypeIds: string[];
    }) => {
      if (!organization_id) throw new Error("Organization ID missing");
      const leaveTypesMap = new Map<string, LeaveType>();
      (leaveTypes ?? []).forEach((t) => leaveTypesMap.set(t.id, t));

      const rows = leaveTypeIds.map((ltId) => ({
        employee_id:      empId,
        leave_type_id:    ltId,
        year:             currentYear,
        remaining_days:   leaveTypesMap.get(ltId)?.annual_allowance ?? 0,
        used_days:        0,
        carryforward_days: 0,
        organization_id,
      }));

      const { data, error } = await supabase
        .from("employee_leave_balances")
        .insert(rows)
        .select();
      if (error) throw error;
      return data as EmployeeLeaveBalance[];
    },
    onSuccess: (newBalances) => {
      queryClient.setQueryData(
        ["employee_leave_balances", employeeId, currentYear],
        (old: EmployeeLeaveBalance[] | undefined) =>
          old ? [...old, ...newBalances] : newBalances
      );
      toast.success("Leave balances initialised");
    },
    onError: (err: any) =>
      toast.error(`Failed to initialise balances: ${err.message}`),
  });

  const refetchLeaveBalances = () =>
    queryClient.invalidateQueries({
      queryKey: ["employee_leave_balances", employeeId, currentYear],
    });

  return {
    leaveBalances,
    isLoading,
    initializeLeaveBalances: initializeMutation.mutateAsync,
    refetchLeaveBalances,
  };
};