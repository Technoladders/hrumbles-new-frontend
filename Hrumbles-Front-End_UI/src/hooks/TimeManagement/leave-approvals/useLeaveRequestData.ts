import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { supabase } from "@/integrations/supabase/client";
import { LeaveRequest } from "@/types/leave-types";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";

export const useLeaveRequestData = () => {
  const authData        = getAuthDataFromLocalStorage();
  const organization_id = authData?.organization_id as string | undefined;

  // ── Pending leave requests (org-scoped) ───────────────────
  const { data: pendingRequests = [], isLoading: isPendingLoading } = useQuery({
    queryKey: ["pendingLeaveRequests", organization_id],
    queryFn:  async () => {
      if (!organization_id) return [];
      const { data, error } = await supabase
        .from("leave_requests")
        .select(`
          *,
          employee:employee_id(id, first_name, last_name, email, hr_departments(name)),
          leave_type:leave_type_id(id, name, color, icon)
        `)
        .eq("status", "pending")
        .eq("organization_id", organization_id)   // ← org filter
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as (LeaveRequest & { employee: any; leave_type: any })[];
    },
    enabled:   !!organization_id,
    staleTime: 2 * 60 * 1000,
  });

  // ── Recent approvals / rejections (org-scoped) ────────────
  const { data: recentApprovals = [], isLoading: isRecentLoading } = useQuery({
    queryKey: ["recentLeaveApprovals", organization_id],
    queryFn:  async () => {
      if (!organization_id) return [];
      const { data, error } = await supabase
        .from("leave_requests")
        .select(`
          *,
          employee:employee_id(id, first_name, last_name, email, hr_departments(name)),
          leave_type:leave_type_id(id, name, color, icon),
          approved_by_employee:approved_by(id, first_name, last_name, email)
        `)
        .eq("organization_id", organization_id)   // ← org filter
        .in("status", ["approved", "rejected", "cancelled"])
        .order("updated_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as (LeaveRequest & { employee: any; leave_type: any; approved_by_employee: any })[];
    },
    enabled:   !!organization_id,
    staleTime: 2 * 60 * 1000,
  });

  return {
    pendingRequests,
    recentApprovals,
    isLoading: isPendingLoading || isRecentLoading,
  };
};