import { useState, useEffect, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  addYears,
  subYears,
  startOfYear,
  endOfYear,
  parseISO,
} from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Holiday, OfficialHolidayInsert, HolidayType } from "@/types/time-tracker-types";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";

export interface HolidayStats {
  totalThisYear: number;
  upcomingThisMonth: number;
  byType: Record<string, number>;
}

export const useHolidays = () => {
  const [currentDate, setCurrentDate]   = useState(new Date());
  const [holidays, setHolidays]         = useState<Holiday[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [stats, setStats]               = useState<HolidayStats>({
    totalThisYear: 0,
    upcomingThisMonth: 0,
    byType: {},
  });

  const authData        = getAuthDataFromLocalStorage();
  const organization_id = authData?.organization_id as string;

  // ── Map DB row → Holiday ──────────────────────────────────
  const mapRow = (item: any): Holiday => ({
    id:                 item.id,
    name:               item.holiday_name,
    date:               item.holiday_date,
    day_of_week:        item.day_of_week ?? format(parseISO(item.holiday_date), "EEEE"),
    type:               item.holiday_type as HolidayType,
    is_recurring:       item.is_recurring,
    applicable_regions: item.applicable_regions,
    created_at:         item.created_at,
    updated_at:         item.updated_at,
  });

  // ── Fetch holidays for current month ─────────────────────
  const fetchHolidays = useCallback(async () => {
    if (!organization_id) return;
    setIsLoading(true);
    try {
      const start = format(startOfMonth(currentDate), "yyyy-MM-dd");
      const end   = format(endOfMonth(currentDate), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("official_holidays")
        .select("*")
        .eq("organization_id", organization_id)
        .gte("holiday_date", start)
        .lte("holiday_date", end)
        .order("holiday_date", { ascending: true });

      if (error) throw error;
      setHolidays((data ?? []).map(mapRow));
    } catch (err) {
      console.error("Error fetching holidays:", err);
      toast.error("Failed to load holidays");
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, organization_id]);

  // ── Fetch year-level stats ────────────────────────────────
  const fetchStats = useCallback(async () => {
    if (!organization_id) return;
    try {
      const yearStart = format(startOfYear(currentDate), "yyyy-MM-dd");
      const yearEnd   = format(endOfYear(currentDate), "yyyy-MM-dd");
      const today     = format(new Date(), "yyyy-MM-dd");
      const monthEnd  = format(endOfMonth(currentDate), "yyyy-MM-dd");

      const { data } = await supabase
        .from("official_holidays")
        .select("holiday_date, holiday_type")
        .eq("organization_id", organization_id)
        .gte("holiday_date", yearStart)
        .lte("holiday_date", yearEnd);

      const all = data ?? [];
      const byType: Record<string, number> = {};
      all.forEach(h => {
        byType[h.holiday_type] = (byType[h.holiday_type] ?? 0) + 1;
      });

      const upcoming = all.filter(
        h => h.holiday_date >= today && h.holiday_date <= monthEnd
      ).length;

      setStats({ totalThisYear: all.length, upcomingThisMonth: upcoming, byType });
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }, [currentDate, organization_id]);

  // ── Add holidays ──────────────────────────────────────────
  const handleAddHolidays = async (
    newHolidays: Omit<Holiday, "id" | "created_at" | "updated_at">[]
  ) => {
    if (!organization_id) return;
    try {
      // Deduplicate by holiday_date within the incoming batch.
      // Multiple holidays can share the same date (e.g. April 14 = Tamil New Year
      // + Ambedkar Jayanti + Vishu + Bihu). Postgres upsert errors with code 21000
      // if two rows in the same command target the same conflict key.
      // Fix: merge same-date names into one row before sending.
      const dateMap = new Map<string, typeof newHolidays[0]>();
      for (const h of newHolidays) {
        if (dateMap.has(h.date)) {
          const prev = dateMap.get(h.date)!;
          if (!prev.name.includes(h.name)) {
            dateMap.set(h.date, {
              ...prev,
              name: `${prev.name} / ${h.name}`,
              type: prev.type === "National" || h.type === "National" ? "National" : prev.type,
            });
          }
        } else {
          dateMap.set(h.date, h);
        }
      }

      const deduped = Array.from(dateMap.values());
      const merged  = newHolidays.length - deduped.length;

      const rows = deduped.map(h => ({
        organization_id,
        holiday_name:       h.name,
        holiday_date:       h.date,
        day_of_week:        h.day_of_week,
        holiday_type:       h.type,
        is_recurring:       h.is_recurring ?? false,
        applicable_regions: h.applicable_regions ?? "All",
      }));

      // ignoreDuplicates:true silently skips dates already in DB (no 21000 error)
      const { error } = await supabase
        .from("official_holidays")
        .upsert(rows, { onConflict: "organization_id,holiday_date", ignoreDuplicates: true });

      if (error) throw error;

      const label = merged > 0
        ? `Saved ${deduped.length} holiday${deduped.length !== 1 ? "s" : ""} (${merged} same-date entries merged)`
        : `Saved ${deduped.length} holiday${deduped.length !== 1 ? "s" : ""}`;
      toast.success(label);
      setIsDialogOpen(false);
      await Promise.all([fetchHolidays(), fetchStats()]);
    } catch (err: any) {
      console.error("Error adding holidays:", err);
      toast.error(err?.message ?? "Failed to add holidays");
    }
  };

  // ── Edit holiday ──────────────────────────────────────────
  const handleEditHoliday = async (
    id: string,
    patch: Partial<Pick<Holiday, "name" | "type" | "is_recurring" | "applicable_regions">>
  ) => {
    try {
      const updatePayload: any = {};
      if (patch.name)               updatePayload.holiday_name  = patch.name;
      if (patch.type)               updatePayload.holiday_type  = patch.type;
      if (patch.is_recurring !== undefined) updatePayload.is_recurring = patch.is_recurring;
      if (patch.applicable_regions) updatePayload.applicable_regions = patch.applicable_regions;

      const { error } = await supabase
        .from("official_holidays")
        .update(updatePayload)
        .eq("id", id)
        .eq("organization_id", organization_id);

      if (error) throw error;
      toast.success("Holiday updated");
      await Promise.all([fetchHolidays(), fetchStats()]);
    } catch (err) {
      console.error("Error editing holiday:", err);
      toast.error("Failed to update holiday");
    }
  };

  // ── Delete holiday ────────────────────────────────────────
  const handleDeleteHoliday = async (id: string) => {
    try {
      const { error } = await supabase
        .from("official_holidays")
        .delete()
        .eq("id", id)
        .eq("organization_id", organization_id);

      if (error) throw error;
      toast.success("Holiday deleted");
      await Promise.all([fetchHolidays(), fetchStats()]);
    } catch (err) {
      console.error("Error deleting holiday:", err);
      toast.error("Failed to delete holiday");
    }
  };

  // ── Navigation ────────────────────────────────────────────
  const changeMonth = (offset: number) =>
    setCurrentDate(prev => addMonths(prev, offset));

  const changeYear = (offset: number) =>
    setCurrentDate(prev => offset > 0 ? addYears(prev, 1) : subYears(prev, 1));

  useEffect(() => {
    fetchHolidays();
    fetchStats();
  }, [fetchHolidays, fetchStats]);

  return {
    currentDate,
    holidays,
    isLoading,
    isDialogOpen,
    stats,
    organization_id,
    setIsDialogOpen,
    handleAddHolidays,
    handleEditHoliday,
    handleDeleteHoliday,
    changeMonth,
    changeYear,
    refetch: () => { fetchHolidays(); fetchStats(); },
  };
};