import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  WeekendConfig,
  WorkingDayException,
  WeekendPattern,
  DEFAULT_WEEKEND_CONFIG,
} from "@/types/time-tracker-types";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";
import { format } from "date-fns";

const DEFAULT_DOW_CONFIG = [0, 6].map(dow => ({
  day_of_week: dow,
  is_weekend: true,
  pattern: "all" as WeekendPattern,
}));

export const useWeekendConfig = () => {
  const [weekendConfig, setWeekendConfig] = useState<WeekendConfig[]>([]);
  const [exceptions, setExceptions]       = useState<WorkingDayException[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [isSaving, setIsSaving]           = useState(false);

  const authData        = getAuthDataFromLocalStorage();
  const organization_id = authData?.organization_id as string;

  // ── Fetch weekend config ──────────────────────────────────
  const fetchWeekendConfig = useCallback(async () => {
    if (!organization_id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("weekend_config")
        .select("*")
        .eq("organization_id", organization_id)
        .order("day_of_week");

      if (error) throw error;

      if (!data || data.length === 0) {
        // Seed defaults: Sunday and Saturday fully off
        const defaults: WeekendConfig[] = DEFAULT_DOW_CONFIG.map(d => ({
          ...d,
          organization_id,
          effective_from: format(new Date(), "yyyy-MM-dd"),
        }));
        setWeekendConfig(defaults);
      } else {
        setWeekendConfig(data as WeekendConfig[]);
      }
    } catch (err) {
      console.error("Error fetching weekend config:", err);
      toast.error("Failed to load weekend configuration");
    } finally {
      setIsLoading(false);
    }
  }, [organization_id]);

  // ── Fetch working-day exceptions ──────────────────────────
  const fetchExceptions = useCallback(async () => {
    if (!organization_id) return;
    try {
      const { data, error } = await supabase
        .from("working_day_exceptions")
        .select("*")
        .eq("organization_id", organization_id)
        .order("exception_date", { ascending: true });

      if (error) throw error;
      setExceptions((data ?? []) as WorkingDayException[]);
    } catch (err) {
      console.error("Error fetching exceptions:", err);
    }
  }, [organization_id]);

  // ── Save weekend config (upsert) ──────────────────────────
  const saveWeekendConfig = async (configs: WeekendConfig[]) => {
    if (!organization_id) return;
    setIsSaving(true);
    try {
      const rows = configs.map(c => ({
        organization_id,
        day_of_week:    c.day_of_week,
        is_weekend:     c.is_weekend,
        pattern:        c.pattern,
        effective_from: c.effective_from ?? format(new Date(), "yyyy-MM-dd"),
      }));

      const { error } = await supabase
        .from("weekend_config")
        .upsert(rows, { onConflict: "organization_id,day_of_week" });

      if (error) throw error;
      toast.success("Weekend configuration saved");
      await fetchWeekendConfig();
    } catch (err) {
      console.error("Error saving weekend config:", err);
      toast.error("Failed to save weekend configuration");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Update a single day's config locally ──────────────────
  const updateDayConfig = (
    day_of_week: number,
    patch: Partial<Pick<WeekendConfig, "is_weekend" | "pattern">>
  ) => {
    setWeekendConfig(prev => {
      const exists = prev.find(c => c.day_of_week === day_of_week);
      if (exists) {
        return prev.map(c =>
          c.day_of_week === day_of_week ? { ...c, ...patch } : c
        );
      }
      return [
        ...prev,
        {
          organization_id,
          day_of_week,
          is_weekend: patch.is_weekend ?? false,
          pattern: patch.pattern ?? "all",
          effective_from: format(new Date(), "yyyy-MM-dd"),
        },
      ];
    });
  };

  // ── Add working-day exception ─────────────────────────────
  const addException = async (
    exception_date: string,
    is_working_day: boolean,
    reason?: string
  ) => {
    if (!organization_id) return;
    try {
      const { error } = await supabase
        .from("working_day_exceptions")
        .upsert(
          { organization_id, exception_date, is_working_day, reason },
          { onConflict: "organization_id,exception_date" }
        );
      if (error) throw error;
      toast.success(
        is_working_day
          ? "Marked as working day"
          : "Marked as non-working day"
      );
      await fetchExceptions();
    } catch (err) {
      console.error("Error adding exception:", err);
      toast.error("Failed to save exception");
    }
  };

  // ── Remove working-day exception ──────────────────────────
  const removeException = async (id: string) => {
    try {
      const { error } = await supabase
        .from("working_day_exceptions")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Exception removed");
      await fetchExceptions();
    } catch (err) {
      console.error("Error removing exception:", err);
      toast.error("Failed to remove exception");
    }
  };

  useEffect(() => {
    fetchWeekendConfig();
    fetchExceptions();
  }, [fetchWeekendConfig, fetchExceptions]);

  return {
    weekendConfig,
    exceptions,
    isLoading,
    isSaving,
    updateDayConfig,
    saveWeekendConfig,
    addException,
    removeException,
    refetch: () => { fetchWeekendConfig(); fetchExceptions(); },
  };
};