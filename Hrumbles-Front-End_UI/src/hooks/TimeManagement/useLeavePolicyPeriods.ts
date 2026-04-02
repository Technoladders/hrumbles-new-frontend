import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LeavePolicyPeriod } from "@/types/leave-types";
import { toast } from "sonner";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";

export const useLeavePolicyPeriods = () => {
  const [leavePeriods, setLeavePeriods]           = useState<LeavePolicyPeriod[]>([]);
  const [policyPeriod, setPolicyPeriod]           = useState<LeavePolicyPeriod | null>(null);
  const [loading, setLoading]                     = useState(true);
  const [isSubmitting, setIsSubmitting]           = useState(false);
  const [isEditPeriodDialogOpen, setIsEditPeriodDialogOpen] = useState(false);

  // ── Auth: read inside the hook body, never at module level ───────────
  const authData        = getAuthDataFromLocalStorage();
  const organization_id = authData?.organization_id as string | undefined;

  // ── Load ─────────────────────────────────────────────────────────────
  const loadLeavePolicyPeriods = useCallback(async () => {
    if (!organization_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("leave_policy_periods")
        .select("*")
        .eq("organization_id", organization_id)
        .order("start_month", { ascending: true });

      if (error) throw error;
      setLeavePeriods(data ?? []);
      if (data && data.length > 0) setPolicyPeriod(data[0]);
    } catch (err) {
      console.error("Error loading leave policy periods:", err);
      toast.error("Failed to load leave policy periods");
    } finally {
      setLoading(false);
    }
  }, [organization_id]);

  // ── Create ────────────────────────────────────────────────────────────
  const createLeavePolicyPeriod = async (
    period: Omit<LeavePolicyPeriod, "id" | "created_at" | "updated_at">
  ) => {
    if (!organization_id) return false;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("leave_policy_periods").insert({
        organization_id,
        is_calendar_year: period.is_calendar_year,
        start_month:      period.start_month,
      });
      if (error) throw error;
      toast.success("Leave policy period created");
      await loadLeavePolicyPeriods();
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Failed to create leave policy period");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Update ────────────────────────────────────────────────────────────
  const updateLeavePolicyPeriod = async (
    id: string,
    period: Partial<LeavePolicyPeriod>
  ) => {
    if (period.start_month === undefined && period.is_calendar_year === undefined) {
      toast.error("Nothing to update");
      return false;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("leave_policy_periods")
        .update({
          is_calendar_year: period.is_calendar_year,
          start_month:      period.start_month,
        })
        .eq("id", id)
        .eq("organization_id", organization_id!);

      if (error) throw error;
      toast.success("Leave year settings updated");
      await loadLeavePolicyPeriods();
      setIsEditPeriodDialogOpen(false);
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Failed to update leave policy period");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────
  const deleteLeavePolicyPeriod = async (id: string) => {
    try {
      const { error } = await supabase
        .from("leave_policy_periods")
        .delete()
        .eq("id", id)
        .eq("organization_id", organization_id!);
      if (error) throw error;
      toast.success("Leave policy period deleted");
      await loadLeavePolicyPeriods();
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete leave policy period");
      return false;
    }
  };

  useEffect(() => {
    loadLeavePolicyPeriods();
  }, [loadLeavePolicyPeriods]);

  return {
    leavePeriods,
    policyPeriod,
    loading,
    isLoading:  loading,
    isSubmitting,
    createLeavePolicyPeriod,
    updateLeavePolicyPeriod,
    updatePolicyPeriod: updateLeavePolicyPeriod,
    deleteLeavePolicyPeriod,
    loadLeavePolicyPeriods,
    isEditPeriodDialogOpen,
    setIsEditPeriodDialogOpen,
  };
};