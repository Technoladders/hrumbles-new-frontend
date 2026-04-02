/**
 * HolidayDatePicker
 *
 * Inline multi-select calendar for the holiday modal + exception picker.
 * Three distinct visual states:
 *   - Official holiday date  → orange tint + dot + tooltip name
 *   - Already an exception   → grey dot, non-clickable
 *   - Normal day             → standard, fully interactive
 *
 * Shift-click fills a contiguous range.
 */

import { useState, useCallback } from "react";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameDay,
  isSameMonth,
  isToday,
  format,
  isWithinInterval,
  startOfDay,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export interface HolidayDateInfo {
  date: string;   // "yyyy-MM-dd"
  name: string;
}

interface HolidayDatePickerProps {
  selected: Date[];
  onChange: (dates: Date[]) => void;
  /** Official holidays — shown as orange tint + dot + tooltip name */
  holidayDates?: HolidayDateInfo[];
  /** Already-saved exceptions — shown as grey dot, non-clickable */
  existingExceptions?: string[];
  /** Legacy: flat existing dates (non-clickable) — kept for backward compat */
  existingDates?: string[];
}

export function HolidayDatePicker({
  selected,
  onChange,
  holidayDates = [],
  existingExceptions = [],
  existingDates = [],
}: HolidayDatePickerProps) {
  const [viewMonth, setViewMonth]   = useState<Date>(startOfMonth(new Date()));
  const [lastClicked, setLastClicked] = useState<Date | null>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  // Lookup helpers
  const holidayMap = new Map(holidayDates.map(h => [h.date, h.name]));
  const isHoliday  = (d: Date) => holidayMap.has(format(d, "yyyy-MM-dd"));
  const getHolidayName = (d: Date) => holidayMap.get(format(d, "yyyy-MM-dd")) ?? "";

  const allBlocked = new Set([...existingExceptions, ...existingDates]);
  const isBlocked  = (d: Date) => allBlocked.has(format(d, "yyyy-MM-dd"));

  const isSelected  = (d: Date) => selected.some(s => isSameDay(s, d));
  const isThisMonth = (d: Date) => isSameMonth(d, viewMonth);

  // Build 6-row grid
  const gridDays = useCallback((): Date[] => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 0 });
    const end   = endOfWeek(endOfMonth(viewMonth),     { weekStartsOn: 0 });
    const days: Date[] = [];
    let cur = start;
    while (cur <= end) {
      days.push(startOfDay(cur));
      cur = addDays(cur, 1);
    }
    return days;
  }, [viewMonth]);

  const handleClick = (day: Date, shiftHeld: boolean) => {
    if (isBlocked(day)) return;

    if (shiftHeld && lastClicked) {
      const a = lastClicked < day ? lastClicked : day;
      const b = lastClicked < day ? day : lastClicked;
      const count = Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
      const range = Array.from({ length: count }, (_, i) =>
        startOfDay(addDays(a, i))
      ).filter(d => !isBlocked(d));

      const allAlreadySel = range.every(d => isSelected(d));
      if (allAlreadySel) {
        onChange(selected.filter(s => !range.some(r => isSameDay(r, s))));
      } else {
        const toAdd = range.filter(d => !selected.some(s => isSameDay(s, d)));
        onChange([...selected, ...toAdd].sort((a, b) => a.getTime() - b.getTime()));
      }
    } else {
      if (isSelected(day)) {
        onChange(selected.filter(s => !isSameDay(s, day)));
      } else {
        onChange([...selected, day].sort((a, b) => a.getTime() - b.getTime()));
      }
    }
    setLastClicked(day);
  };

  const days = gridDays();
  const minSel = selected.length > 0 ? selected[0] : null;
  const maxSel = selected.length > 0 ? selected[selected.length - 1] : null;
  const isInRange = (d: Date) =>
    selected.length > 1 &&
    minSel && maxSel &&
    isWithinInterval(d, { start: minSel, end: maxSel });

  return (
    <div className="select-none">
      {/* ── Month nav ──────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          type="button"
          onClick={() => setViewMonth(prev => subMonths(prev, 1))}
          className="w-7 h-7 flex items-center justify-center rounded-md text-violet-600 hover:bg-violet-100 dark:text-violet-400 dark:hover:bg-violet-900/50 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">
          {format(viewMonth, "MMMM yyyy")}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth(prev => addMonths(prev, 1))}
          className="w-7 h-7 flex items-center justify-center rounded-md text-violet-600 hover:bg-violet-100 dark:text-violet-400 dark:hover:bg-violet-900/50 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* ── Weekday headers ─────────────────────────────────── */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-[11px] font-semibold text-violet-400 dark:text-violet-600 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* ── Day grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map(day => {
          const sel      = isSelected(day);
          const blocked  = isBlocked(day);
          const holiday  = isHoliday(day);
          const hName    = holiday ? getHolidayName(day) : "";
          const inRange  = isInRange(day);
          const today    = isToday(day);
          const dimmed   = !isThisMonth(day);
          const hovered  = hoveredDate && isSameDay(hoveredDate, day);

          const isFirst  = minSel && isSameDay(day, minSel) && selected.length > 1;
          const isLast   = maxSel && isSameDay(day, maxSel) && selected.length > 1;

          return (
            <div
              key={day.toISOString()}
              className="flex items-center justify-center py-0.5 relative"
              onMouseEnter={() => setHoveredDate(day)}
              onMouseLeave={() => setHoveredDate(null)}
            >
              {/* Range background strips */}
              <div className="relative w-full flex items-center justify-center">
                {inRange && !isFirst && (
                  <div className="absolute left-0 right-1/2 h-7 bg-violet-100 dark:bg-violet-900/40 z-0" />
                )}
                {inRange && !isLast && (
                  <div className="absolute left-1/2 right-0 h-7 bg-violet-100 dark:bg-violet-900/40 z-0" />
                )}
                {inRange && !sel && (
                  <div className="absolute inset-x-0 h-7 bg-violet-100 dark:bg-violet-900/40 z-0" />
                )}

                {/* Day button */}
                <button
                  type="button"
                  disabled={blocked}
                  onClick={e => handleClick(day, e.shiftKey)}
                  className={cn(
                    "relative z-10 w-8 h-8 rounded-full text-sm transition-all duration-150 flex items-center justify-center font-medium",
                    // holiday tint (unselected)
                    holiday && !sel && !blocked &&
                      "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-800/50",
                    // normal unselected this month
                    !holiday && !sel && !blocked && isThisMonth(day) &&
                      "text-foreground hover:bg-violet-100 dark:hover:bg-violet-900/50",
                    // dimmed out-of-month
                    dimmed && !sel &&
                      "text-muted-foreground/40 hover:bg-violet-50 dark:hover:bg-violet-950/30",
                    // today ring
                    today && !sel &&
                      "ring-2 ring-violet-400 ring-offset-1 dark:ring-violet-500",
                    // blocked (existing exception)
                    blocked &&
                      "cursor-not-allowed opacity-40",
                    // selected
                    sel &&
                      "bg-violet-600 text-white shadow-md hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-400 font-semibold scale-105",
                    // in-range not endpoint
                    inRange && !sel &&
                      "bg-violet-200 text-violet-800 dark:bg-violet-800/60 dark:text-violet-200"
                  )}
                  aria-label={`${format(day, "MMMM d, yyyy")}${holiday ? ` — ${hName}` : ""}`}
                  aria-pressed={sel}
                >
                  {day.getDate()}

                  {/* Dot indicators */}
                  {!sel && (holiday || blocked) && (
                    <span className={cn(
                      "absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
                      holiday ? "bg-orange-500" : "bg-muted-foreground/50"
                    )} />
                  )}
                </button>
              </div>

              {/* Tooltip — holiday name on hover */}
              {hovered && holiday && !sel && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none whitespace-nowrap">
                  <div className="bg-orange-600 text-white text-[10px] font-medium px-2 py-1 rounded-md shadow-lg">
                    {hName}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-orange-600" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Legend ──────────────────────────────────────────── */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-violet-100 dark:border-violet-900 flex-wrap">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <div className="w-3 h-3 rounded-full bg-violet-600" />
          Selected
        </div>
        {holidayDates.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <div className="w-3 h-3 rounded-full bg-orange-200 dark:bg-orange-800 border border-orange-400 flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-orange-500" />
            </div>
            Holiday
          </div>
        )}
        {allBlocked.size > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <div className="w-3 h-3 rounded-full bg-muted border border-muted-foreground/30 flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-muted-foreground/50" />
            </div>
            Exception set
          </div>
        )}
        <div className="ml-auto text-[11px] text-muted-foreground/60">
          Shift-click to fill range
        </div>
      </div>
    </div>
  );
}