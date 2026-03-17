/**
 * holidayUtils.ts
 * 
 * Shared utility for querying day status across timesheet, leave, and attendance.
 * All downstream modules import from here — never duplicate this logic.
 */

import { supabase } from "@/integrations/supabase/client";
import { DayStatus, WeekendPattern } from "@/types/time-tracker-types";
import { format, getDay } from "date-fns";

/**
 * Returns the week-of-month occurrence for a given date.
 * e.g. the 3rd Saturday of the month → 3
 */
export function weekOfMonth(date: Date): number {
  return Math.floor((date.getDate() - 1) / 7) + 1;
}

/**
 * Evaluates a weekend pattern for a given date.
 * Returns true if the day should be treated as a weekend day.
 */
export function evaluatePattern(pattern: WeekendPattern, date: Date): boolean {
  const nth = weekOfMonth(date);
  switch (pattern) {
    case "all":         return true;
    case "none":        return false;
    case "alternate":   return nth % 2 === 0;          // 2nd, 4th off
    case "1st_3rd":     return nth === 1 || nth === 3;
    case "2nd_4th":     return nth === 2 || nth === 4;
    case "2nd_4th_5th": return nth === 2 || nth === 4 || nth === 5;
    default:            return true;
  }
}

/**
 * Core function: determines the status of a date for an org.
 * Uses the DB function get_day_status for authoritative server-side result,
 * with a client-side fallback for offline/cached usage.
 */
export async function getDayStatus(
  date: Date,
  organization_id: string
): Promise<DayStatus> {
  const dateStr = format(date, "yyyy-MM-dd");

  try {
    const { data, error } = await supabase
      .rpc("get_day_status", { p_org_id: organization_id, p_date: dateStr });
    if (!error && data) return data as DayStatus;
  } catch (_) {
    // Fall through to client-side calculation
  }

  // Client-side fallback
  return getDayStatusClient(date, organization_id);
}

/**
 * Client-side fallback — queries tables directly.
 * Useful for batch operations (e.g. counting working days in a range).
 */
export async function getDayStatusClient(
  date: Date,
  organization_id: string
): Promise<DayStatus> {
  const dateStr = format(date, "yyyy-MM-dd");
  const dow = getDay(date); // 0=Sun, 6=Sat

  // 1. Exception override
  const { data: exc } = await supabase
    .from("working_day_exceptions")
    .select("is_working_day")
    .eq("organization_id", organization_id)
    .eq("exception_date", dateStr)
    .maybeSingle();

  if (exc !== null && exc !== undefined) {
    return exc.is_working_day ? "exception_working" : "exception_nonworking";
  }

  // 2. Holiday check
  const { count: hCount } = await supabase
    .from("official_holidays")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organization_id)
    .eq("holiday_date", dateStr);

  if (hCount && hCount > 0) return "holiday";

  // 3. Weekend config
  const { data: cfg } = await supabase
    .from("weekend_config")
    .select("is_weekend, pattern")
    .eq("organization_id", organization_id)
    .eq("day_of_week", dow)
    .maybeSingle();

  if (!cfg) {
    return dow === 0 || dow === 6 ? "weekend" : "working";
  }

  if (!cfg.is_weekend) return "working";
  return evaluatePattern(cfg.pattern as WeekendPattern, date) ? "weekend" : "working";
}

/**
 * Batch check: count working days between two dates (inclusive).
 * Used by leave module for working-day deduction.
 */
export async function countWorkingDays(
  from: Date,
  to: Date,
  organization_id: string
): Promise<number> {
  const days: Date[] = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const statuses = await Promise.all(
    days.map(d => getDayStatusClient(d, organization_id))
  );

  return statuses.filter(s => s === "working" || s === "exception_working").length;
}

/**
 * Quick boolean check — is this date a non-working day?
 * Used by timesheet to auto-skip, and attendance to suppress alerts.
 */
export async function isNonWorkingDay(
  date: Date,
  organization_id: string
): Promise<boolean> {
  const status = await getDayStatus(date, organization_id);
  return status === "holiday" || status === "weekend" || status === "exception_nonworking";
}