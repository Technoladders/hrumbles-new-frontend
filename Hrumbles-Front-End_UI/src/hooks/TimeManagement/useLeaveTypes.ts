import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LeaveType } from "@/types/leave-types";
import { toast } from "sonner";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";

export const useLeaveTypes = () => {
  const queryClient                                   = useQueryClient();
  const [isAddPolicyDialogOpen, setIsAddPolicyDialogOpen] = useState(false);
  const [isRecalculating, setIsRecalculating]         = useState(false);

  const authData        = getAuthDataFromLocalStorage();
  const organization_id = authData?.organization_id as string | undefined;

  // ── Fetch ─────────────────────────────────────────────────────────────
  const { data: leaveTypes, isLoading } = useQuery({
    // organization_id in key ensures re-fetch on org switch
    queryKey: ["leaveTypes", organization_id],
    queryFn:  async () => {
      if (!organization_id) return [];
      const { data, error } = await supabase
        .from("leave_types")
        .select("*")
        .eq("organization_id", organization_id)
        .order("name");
      if (error) throw error;
      return data as LeaveType[];
    },
    enabled: !!organization_id,
  });

  // ── Add ───────────────────────────────────────────────────────────────
  const addLeaveTypeMutation = useMutation({
    mutationFn: async (newLeaveType: any) => {
      if (!organization_id) throw new Error("Organization ID missing");
      const { data, error } = await supabase
        .from("leave_types")
        .insert([{ ...newLeaveType, organization_id }])
        .select()
        .single();
      if (error) throw error;

      // Init balances for all employees (non-blocking)
      const { error: rpcError } = await supabase.rpc(
        "initialize_new_leave_type_for_all",
        { new_leave_type_id: data.id, target_org_id: organization_id }
      );
      if (rpcError) {
        console.error("Balance init failed:", rpcError);
        toast.warning(
          "Policy created, but automatic balance allocation failed. Use Recalculate to fix."
        );
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Leave policy created and allocated to eligible employees.");
      queryClient.invalidateQueries({ queryKey: ["leaveTypes", organization_id] });
      setIsAddPolicyDialogOpen(false);
    },
    onError: (err: any) =>
      toast.error(`Failed to add leave type: ${err.message}`),
  });

  // ── Update ────────────────────────────────────────────────────────────
  const updateLeaveTypeMutation = useMutation({
    mutationFn: async (leaveType: Partial<LeaveType> & { id: string }) => {
      const { id, ...updates } = leaveType;
      const { data, error } = await supabase
        .from("leave_types")
        .update(updates)
        .eq("id", id)
        .eq("organization_id", organization_id!)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Leave policy updated");
      queryClient.invalidateQueries({ queryKey: ["leaveTypes", organization_id] });
    },
    onError: (err: any) =>
      toast.error(`Failed to update leave type: ${err.message}`),
  });

  // ── Delete ────────────────────────────────────────────────────────────
  const deleteLeaveTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("leave_types")
        .delete()
        .eq("id", id)
        .eq("organization_id", organization_id!);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      toast.success("Leave type deleted");
      queryClient.invalidateQueries({ queryKey: ["leaveTypes", organization_id] });
    },
    onError: (err: any) =>
      toast.error(`Failed to delete leave type: ${err.message}`),
  });

  // ── Copy / duplicate a policy ─────────────────────────────────────────
  const copyLeaveType = async (source: LeaveType) => {
    if (!organization_id) return;
    const { id, created_at, updated_at, ...rest } = source;
    try {
      const { error } = await supabase.from("leave_types").insert([
        { ...rest, name: `${rest.name} (Copy)`, organization_id, is_active: false },
      ]);
      if (error) throw error;
      toast.success(`"${source.name}" duplicated. Edit the copy to customise it.`);
      queryClient.invalidateQueries({ queryKey: ["leaveTypes", organization_id] });
    } catch (err: any) {
      toast.error(`Failed to copy: ${err.message}`);
    }
  };

  // ── Org-scoped recalculate ─────────────────────────────────────────────
  // Scoped to current org only — no cross-tenant blast
  const recalculateOrgBalances = async (year: number) => {
    if (!organization_id) return;
    setIsRecalculating(true);
    try {
      const { error } = await supabase.rpc("recalculate_all_balances", {
        target_year: year,
        target_org_id: organization_id,   // org-scoped parameter
      });
      if (error) throw error;
      toast.success(`Balances recalculated for ${year}.`);
      queryClient.invalidateQueries({ queryKey: ["leaveTypes", organization_id] });
    } catch (err: any) {
      toast.error(`Recalculation failed: ${err.message}`);
    } finally {
      setIsRecalculating(false);
    }
  };

  return {
    leaveTypes:             leaveTypes ?? [],
    isLoading,
    isRecalculating,
    organization_id,
    addLeaveType:           addLeaveTypeMutation.mutate,
    updateLeaveType:        updateLeaveTypeMutation.mutate,
    deleteLeaveType:        deleteLeaveTypeMutation.mutate,
    copyLeaveType,
    recalculateOrgBalances,
    isAddPolicyDialogOpen,
    setIsAddPolicyDialogOpen,
  };
};