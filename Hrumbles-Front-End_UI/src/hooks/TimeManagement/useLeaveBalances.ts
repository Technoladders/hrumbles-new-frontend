import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LeaveTypeSummary } from "@/types/leave-types";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";

export const useLeaveBalances = (year: number) => {
  const authData        = getAuthDataFromLocalStorage();
  const organization_id = authData?.organization_id as string | undefined;

  return useQuery({
    queryKey: ["leaveBalanceSummary", organization_id, year],
    queryFn: async (): Promise<LeaveTypeSummary[]> => {
      if (!organization_id) return [];

      // Get all leave types for this org
      const { data: types, error: typesErr } = await supabase
        .from("leave_types")
        .select("id, name, color")
        .eq("organization_id", organization_id)
        .eq("is_active", true);

      if (typesErr) throw typesErr;
      if (!types?.length) return [];

      // Get all balances for this org + year in one query
      const { data: balances, error: balErr } = await supabase
        .from("employee_leave_balances")
        .select("leave_type_id, remaining_days, used_days")
        .eq("year", year)
        .in("leave_type_id", types.map((t) => t.id));

      if (balErr) throw balErr;

      // Aggregate per leave type
      return types.map((t) => {
        const rows = (balances ?? []).filter((b) => b.leave_type_id === t.id);
        const total_allocated  = rows.reduce((s, r) => s + (r.remaining_days ?? 0) + (r.used_days ?? 0), 0);
        const total_used       = rows.reduce((s, r) => s + (r.used_days ?? 0), 0);
        const total_remaining  = rows.reduce((s, r) => s + (r.remaining_days ?? 0), 0);
        return {
          leave_type_id:    t.id,
          leave_type_name:  t.name,
          leave_type_color: t.color,
          total_employees:  rows.length,
          total_allocated,
          total_used,
          total_remaining,
          avg_remaining:    rows.length > 0 ? +(total_remaining / rows.length).toFixed(1) : 0,
        };
      });
    },
    enabled: !!organization_id,
  });
};