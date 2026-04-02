/**
 * useOrgCalendarConfig
 *
 * Single hook that pre-fetches everything the LeaveDatePicker needs:
 *   1. Org's weekend_config (patterns per DOW)
 *   2. Official holidays for the year
 *   3. Working-day exceptions for the year
 *
 * Returns helper functions so the picker can resolve any date
 * without a single extra DB call.
 *
 * Cached by React Query — re-fetched only when year or org changes.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAuthDataFromLocalStorage } from "@/utils/localstorage";
import { format, startOfYear, endOfYear, addDays, startOfDay } from "date-fns";
import { WeekendConfig, WeekendPattern } from "@/types/time-tracker-types";
import { evaluatePattern, weekOfMonth } from "@/utils/holidayUtils";

export type ClientDayStatus =
  | "working"
  | "weekend"
  | "holiday"
  | "exception_working"
  | "exception_nonworking";

interface CalendarConfig {
  /** Returns the status of any date — instant, no async */
  getDayStatus: (date: Date) => ClientDayStatus;
  /** true = employee can select this date for leave */
  isWorkingDay: (date: Date) => boolean;
  /** Holiday name if the date is a holiday, otherwise null */
  getHolidayName: (date: Date) => string | null;
  isLoading: boolean;
}

function isoDate(d: Date): string {
  return format(startOfDay(d), "yyyy-MM-dd");
}

export function useOrgCalendarConfig(year: number): CalendarConfig {
  const authData        = getAuthDataFromLocalStorage();
  const organization_id = authData?.organization_id as string | undefined;

  const { data, isLoading } = useQuery({
    queryKey: ["orgCalendarConfig", organization_id, year],
    queryFn: async () => {
      if (!organization_id) return null;

      const yearStart = format(startOfYear(new Date(year, 0, 1)), "yyyy-MM-dd");
      const yearEnd   = format(endOfYear(new Date(year, 0, 1)),   "yyyy-MM-dd");

      const [wcRes, holRes, excRes] = await Promise.all([
        // Weekend config — one row per DOW, tiny result
        supabase
          .from("weekend_config")
          .select("day_of_week, is_weekend, pattern")
          .eq("organization_id", organization_id),

        // Official holidays for the year
        supabase
          .from("official_holidays")
          .select("holiday_date, holiday_name")
          .eq("organization_id", organization_id)
          .gte("holiday_date", yearStart)
          .lte("holiday_date", yearEnd),

        // Working-day exceptions for the year
        supabase
          .from("working_day_exceptions")
          .select("exception_date, is_working_day")
          .eq("organization_id", organization_id)
          .gte("exception_date", yearStart)
          .lte("exception_date", yearEnd),
      ]);

      const weekendConfigs: WeekendConfig[] = (wcRes.data ?? []) as any;
      const holidayMap   = new Map<string, string>(); // date → name
      const exceptionMap = new Map<string, boolean>(); // date → is_working_day

      (holRes.data ?? []).forEach((h: any) => {
        holidayMap.set(h.holiday_date, h.holiday_name);
      });
      (excRes.data ?? []).forEach((e: any) => {
        exceptionMap.set(e.exception_date, e.is_working_day);
      });

      // Build dow → config map for fast lookup
      const dowMap = new Map<number, { is_weekend: boolean; pattern: WeekendPattern }>();
      weekendConfigs.forEach((c) => {
        dowMap.set(c.day_of_week, {
          is_weekend: c.is_weekend,
          pattern:    (c.pattern ?? "all") as WeekendPattern,
        });
      });

      return { dowMap, holidayMap, exceptionMap };
    },
    enabled:   !!organization_id,
    staleTime: 15 * 60 * 1000, // 15 min — calendar config changes rarely
  });

  const getDayStatus = (date: Date): ClientDayStatus => {
    if (!data) {
      // Default while loading: Sat/Sun weekend, everything else working
      const dow = date.getDay();
      return dow === 0 || dow === 6 ? "weekend" : "working";
    }

    const { dowMap, holidayMap, exceptionMap } = data;
    const dateStr = isoDate(date);

    // Priority 1: exception
    if (exceptionMap.has(dateStr)) {
      return exceptionMap.get(dateStr) ? "exception_working" : "exception_nonworking";
    }

    // Priority 2: official holiday
    if (holidayMap.has(dateStr)) return "holiday";

    // Priority 3: weekend config
    const dow = date.getDay(); // 0=Sun, 6=Sat
    const cfg = dowMap.get(dow);

    if (!cfg) {
      // No config row — default: Sat/Sun off, weekdays on
      return dow === 0 || dow === 6 ? "weekend" : "working";
    }

    if (!cfg.is_weekend) return "working";

    // Evaluate pattern
    return evaluatePattern(cfg.pattern, date) ? "weekend" : "working";
  };

  const isWorkingDay = (date: Date): boolean => {
    const s = getDayStatus(date);
    return s === "working" || s === "exception_working";
  };

  const getHolidayName = (date: Date): string | null => {
    if (!data) return null;
    return data.holidayMap.get(isoDate(date)) ?? null;
  };

  return { getDayStatus, isWorkingDay, getHolidayName, isLoading };
}