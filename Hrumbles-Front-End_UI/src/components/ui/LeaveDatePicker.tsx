/**
 * LeaveDatePicker — org-aware version
 *
 * Breaking changes from previous version:
 *   - Removed internal `isWeekend()` hardcoded function
 *   - Now accepts `calendarConfig` prop (from useOrgCalendarConfig)
 *   - Holiday dates show orange dot + tooltip, are non-selectable
 *   - Configured working Saturdays show normally (not grey)
 *   - `holidays` prop removed — use calendarConfig instead
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  addDays, addMonths, differenceInDays, endOfMonth, endOfWeek,
  endOfYear, format, isSameDay, isWithinInterval, startOfDay,
  startOfMonth, startOfWeek, startOfYear, subDays, subMonths,
  subWeeks, subYears,
} from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ClientDayStatus } from "@/hooks/TimeManagement/useOrgCalendarConfig";

type DaySelection = "full" | "first" | "second";

interface DateRange {
  startDate: Date | null;
  endDate:   Date | null;
}

export interface ApplyPayload {
  range:         DateRange | null;
  daySelections?: Record<string, DaySelection>;
  totalDays?:    number;
}

interface CalendarConfigProp {
  getDayStatus:   (date: Date) => ClientDayStatus;
  isWorkingDay:   (date: Date) => boolean;
  getHolidayName: (date: Date) => string | null;
  isLoading:      boolean;
}

interface LeaveDatePickerProps {
  value:          DateRange | null;
  onChange:       (range: DateRange | null) => void;
  onApply?:       (payload: ApplyPayload) => void;
  monthsView?:    1 | 2;
  className?:     string;
  calendarConfig: CalendarConfigProp;
}

export const LeaveDatePicker: React.FC<LeaveDatePickerProps> = ({
  value,
  onChange,
  onApply,
  monthsView = 2,
  className,
  calendarConfig,
}) => {
  const [open, setOpen]           = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | null>(value ?? null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [pickerMode, setPickerMode]     = useState<"none" | "month" | "year">("none");
  const [tab, setTab]                   = useState<"current" | "past">("current");
  const [daySelections, setDaySelections] = useState<Record<string, DaySelection>>({});
  const [hoveredDay, setHoveredDay]       = useState<Date | null>(null);
  const yearListRef = useRef<HTMLDivElement | null>(null);

  const { getDayStatus, isWorkingDay, getHolidayName } = calendarConfig;

  function startOfDayISO(d: Date) {
    return startOfDay(d).toISOString();
  }

  function getDatesBetween(start: Date, end: Date) {
    const days: Date[] = [];
    let cur = startOfDay(start);
    const last = startOfDay(end);
    while (cur <= last) {
      days.push(cur);
      cur = addDays(cur, 1);
    }
    return days;
  }

  function getWorkingDaysBetween(start: Date, end: Date) {
    return getDatesBetween(start, end).filter(isWorkingDay);
  }

  useEffect(() => {
    setTempRange(value ?? null);
    if (value?.startDate && value?.endDate) {
      const map: Record<string, DaySelection> = {};
      getWorkingDaysBetween(value.startDate, value.endDate).forEach(
        (d) => (map[startOfDayISO(d)] = "full")
      );
      setDaySelections(map);
    } else {
      setDaySelections({});
    }
  }, [value]);

  useEffect(() => {
    if (pickerMode === "year" && yearListRef.current) {
      const y = new Date().getFullYear();
      yearListRef.current
        .querySelector(`button[data-year="${y}"]`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [pickerMode]);

  function handleDayClick(day: Date) {
    const status = getDayStatus(day);
    // Block holidays and forced non-working days
    if (status === "holiday" || status === "exception_nonworking") return;

    if (!tempRange?.startDate || (tempRange.startDate && tempRange.endDate)) {
      setTempRange({ startDate: day, endDate: null });
      const map: Record<string, DaySelection> = {};
      if (isWorkingDay(day)) map[startOfDayISO(day)] = "full";
      setDaySelections(map);
    } else if (day < tempRange.startDate) {
      const newRange = { startDate: day, endDate: tempRange.startDate };
      setTempRange(newRange);
      const map: Record<string, DaySelection> = {};
      getWorkingDaysBetween(newRange.startDate!, newRange.endDate!).forEach(
        (d) => (map[startOfDayISO(d)] = "full")
      );
      setDaySelections(map);
    } else {
      const newRange = { startDate: tempRange.startDate, endDate: day };
      setTempRange(newRange);
      const map: Record<string, DaySelection> = {};
      getWorkingDaysBetween(newRange.startDate!, newRange.endDate!).forEach(
        (d) => (map[startOfDayISO(d)] = "full")
      );
      setDaySelections(map);
    }
    setHoverDate(null);
  }

  function handleQuickSelect(label: string) {
    const now = startOfDay(new Date());
    let start: Date | null = null;
    let end:   Date | null = null;
    switch (label) {
      case "Today":      start = end = now; break;
      case "This Week":  start = startOfWeek(now, { weekStartsOn: 1 }); end = addDays(start, 6); break;
      case "This Month": start = startOfMonth(now); end = endOfMonth(now); break;
      case "This Year":  start = startOfYear(now);  end = endOfYear(now);  break;
      case "Yesterday":  start = end = subDays(now, 1); break;
      case "Last Week": {
        const lw = subWeeks(now, 1);
        start = startOfWeek(lw, { weekStartsOn: 1 });
        end   = addDays(start, 6);
        break;
      }
      case "Last Month": {
        const lm = subMonths(now, 1);
        start = startOfMonth(lm); end = endOfMonth(lm);
        break;
      }
      case "Last Year": {
        const ly = subYears(now, 1);
        start = startOfYear(ly); end = endOfYear(ly);
        break;
      }
    }
    if (start && end) {
      setTempRange({ startDate: start, endDate: end });
      const map: Record<string, DaySelection> = {};
      getWorkingDaysBetween(start, end).forEach((d) => (map[startOfDayISO(d)] = "full"));
      setDaySelections(map);
      setCurrentMonth(start);
    }
  }

  function setSelectionForDay(d: Date, sel: DaySelection) {
    setDaySelections((prev) => ({ ...prev, [startOfDayISO(d)]: sel }));
  }

  const totalDays = useMemo(() => {
    if (!tempRange?.startDate || !tempRange?.endDate) return 0;
    return getWorkingDaysBetween(tempRange.startDate, tempRange.endDate).reduce(
      (sum, d) => {
        const v = daySelections[startOfDayISO(d)] ?? "full";
        return sum + (v === "full" ? 1 : 0.5);
      },
      0
    );
  }, [tempRange, daySelections]);

  function handleApply() {
    onChange(tempRange);
    onApply?.({
      range:         tempRange,
      daySelections: tempRange?.startDate && tempRange?.endDate ? { ...daySelections } : undefined,
      totalDays:     tempRange?.startDate && tempRange?.endDate ? totalDays : undefined,
    });
    setOpen(false);
  }

  function handleReset() {
    setTempRange(null);
    setDaySelections({});
    onChange(null);
  }

  const renderCalendar = (monthOffset = 0) => {
    const monthDate  = addMonths(currentMonth, monthOffset);
    const monthStart = startOfMonth(monthDate);
    const monthEnd   = endOfMonth(monthDate);
    const startWeek  = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endWeek    = endOfWeek(monthEnd,   { weekStartsOn: 1 });

    let previewStart: Date | null = null;
    let previewEnd:   Date | null = null;
    if (tempRange?.startDate && !tempRange.endDate && hoverDate) {
      previewStart = new Date(Math.min(tempRange.startDate.getTime(), hoverDate.getTime()));
      previewEnd   = new Date(Math.max(tempRange.startDate.getTime(), hoverDate.getTime()));
    }

    const rows: JSX.Element[] = [];
    let day = startWeek;
    let wi  = 0;

    while (day <= endWeek) {
      const week: JSX.Element[] = [];
      for (let i = 0; i < 7; i++) {
        const cd     = day;
        const status = getDayStatus(cd);
        const hName  = getHolidayName(cd);
        const isHoliday   = status === "holiday";
        const isWeekend   = status === "weekend";
        const isForceOff  = status === "exception_nonworking";
        const isBlocked   = isHoliday || isForceOff;
        const isForceWork = status === "exception_working";

        const isSelected = tempRange?.startDate && tempRange?.endDate &&
          isWithinInterval(cd, { start: tempRange.startDate, end: tempRange.endDate });
        const isStart = tempRange?.startDate && isSameDay(cd, tempRange.startDate);
        const isEnd   = tempRange?.endDate   && isSameDay(cd, tempRange.endDate);

        let isInHover = false;
        if (previewStart && previewEnd) {
          isInHover = isWithinInterval(cd, { start: previewStart, end: previewEnd });
        }

        const isHovered = hoveredDay && isSameDay(hoveredDay, cd);

        week.push(
          <div
            key={cd.toISOString()}
            className="relative flex items-center justify-center"
            onMouseEnter={() => { setHoverDate(cd); setHoveredDay(cd); }}
            onMouseLeave={() => { setHoveredDay(null); setHoverDate(null); }}
          >
            {/* Holiday tooltip */}
            {isHovered && hName && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none whitespace-nowrap">
                <div className="bg-orange-600 text-white text-[10px] font-medium px-2 py-1 rounded shadow-lg">
                  {hName}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-orange-600" />
                </div>
              </div>
            )}

            <div
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-md text-sm cursor-pointer transition-all duration-100 relative",
                isBlocked && "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800",
                isWeekend && !isBlocked && !isStart && !isEnd && "text-orange-600 dark:text-orange-400",
                isForceWork && !isStart && !isEnd && "ring-1 ring-emerald-400",
                (isStart || isEnd)
                  ? "bg-purple-500 text-white font-semibold shadow-md"
                  : (isSelected || isInHover) && !isBlocked
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                  : !isBlocked
                  ? "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                  : ""
              )}
              onClick={() => !isBlocked && handleDayClick(cd)}
              title={
                isHoliday  ? hName ?? "Holiday"
                : isForceOff  ? "Non-working (exception)"
                : isForceWork ? "Working day (exception)"
                : isWeekend   ? "Weekend"
                : undefined
              }
            >
              <span className="text-[11px]">{cd.getDate()}</span>
              {/* Indicator dot */}
              {isHoliday && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500" />
              )}
              {isForceWork && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500" />
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={`week-${wi++}`} className="grid grid-cols-7 gap-0.5">{week}</div>
      );
    }

    return (
      <div className="p-2 text-center">
        <div className="flex items-center justify-between mb-2 px-1">
          {monthOffset === 0 && (
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
            >
              <ChevronLeft className="h-4 w-4 text-purple-600" />
            </button>
          )}
          <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex gap-1 mx-auto">
            <span
              className="cursor-pointer text-purple-600 hover:underline"
              onClick={() => setPickerMode("month")}
            >
              {format(monthDate, "MMMM")}
            </span>
            <span
              className="cursor-pointer text-purple-600 hover:underline"
              onClick={() => setPickerMode("year")}
            >
              {format(monthDate, "yyyy")}
            </span>
          </div>
          {monthOffset === monthsView - 1 && (
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
            >
              <ChevronRight className="h-4 w-4 text-purple-600" />
            </button>
          )}
        </div>

        {/* Weekday labels */}
        <div className="grid grid-cols-7 text-[10px] text-gray-400 mb-1">
          {["Mo","Tu","We","Th","Fr","Sa","Su"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div className="space-y-0.5">{rows}</div>
      </div>
    );
  };

  const renderPickerModal = () => {
    if (pickerMode === "none") return null;
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white/95 dark:bg-gray-900/95 z-20 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-purple-200 p-4 w-full max-w-md max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4 pb-2 border-b">
            <h3 className="text-sm font-semibold text-purple-600">
              {pickerMode === "month" ? "Select Month" : "Select Year"}
            </h3>
            <button onClick={() => setPickerMode("none")} className="p-1 hover:bg-gray-100 rounded-md">
              <X className="h-4 w-4" />
            </button>
          </div>
          {pickerMode === "month" && (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <button
                  key={i}
                  className="px-3 py-2 text-sm rounded-md hover:bg-purple-100 transition-all"
                  onClick={() => {
                    setCurrentMonth(new Date(currentMonth.getFullYear(), i, 1));
                    setPickerMode("none");
                  }}
                >
                  {format(new Date(2025, i, 1), "MMM")}
                </button>
              ))}
            </div>
          )}
          {pickerMode === "year" && (
            <div
              ref={yearListRef}
              className="grid grid-cols-4 gap-2 max-h-56 overflow-y-auto"
            >
              {Array.from({ length: 101 }).map((_, i) => {
                const base = new Date().getFullYear() - 50;
                const year = base + i;
                return (
                  <button
                    key={year}
                    data-year={year}
                    className={cn(
                      "px-3 py-2 text-sm rounded-md hover:bg-purple-100 transition-all",
                      year === new Date().getFullYear() && "bg-purple-500 text-white"
                    )}
                    onClick={() => {
                      setCurrentMonth(new Date(year, currentMonth.getMonth(), 1));
                      setPickerMode("none");
                    }}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex justify-end mt-4 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setPickerMode("none")}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderPerDaySelectors = () => {
    if (!tempRange?.startDate || !tempRange?.endDate) return null;
    const working = getWorkingDaysBetween(tempRange.startDate, tempRange.endDate);
    if (working.length === 0) return null;

    return (
      <div className="p-3 border-t space-y-2 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            Day-wise ({working.length} working days)
          </span>
          <span className="text-xs text-muted-foreground">
            Total: <span className="font-semibold">{totalDays}</span> days
          </span>
        </div>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {working.map((d) => {
            const iso = startOfDayISO(d);
            const sel = daySelections[iso] ?? "full";
            return (
              <div
                key={iso}
                className="flex items-center justify-between py-2 px-2 rounded-md border"
              >
                <span className="text-sm">{format(d, "EEE, MMM dd")}</span>
                <div className="flex gap-1.5">
                  {(["full", "first", "second"] as DaySelection[]).map((v) => (
                    <button
                      key={v}
                      className={cn(
                        "px-2 py-1 rounded text-xs transition-colors",
                        sel === v
                          ? "bg-purple-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-purple-100 dark:bg-gray-800 dark:text-gray-300"
                      )}
                      onClick={() => setSelectionForDay(d, v)}
                    >
                      {v === "full" ? "Full" : v === "first" ? "1st Half" : "2nd Half"}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Legend
  const Legend = () => (
    <div className="flex items-center gap-4 px-3 py-2 border-t text-[11px] text-muted-foreground bg-gray-50 dark:bg-gray-900">
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-orange-500" /> Holiday
      </span>
      <span className="flex items-center gap-1">
        <span className="text-orange-600 font-medium">Sa</span> Weekend
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Force working
      </span>
    </div>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="datepicker"
          className={cn(
            "justify-start text-left font-normal h-10 px-3 py-1 rounded-full shadow-inner",
            className ?? "w-full"
          )}
        >
          <CalendarIcon className="mr-2 h-5 w-5 text-white" />
          {value?.startDate && value?.endDate ? (
            `${format(value.startDate, "MMM dd, yy")} - ${format(value.endDate, "MMM dd, yy")}`
          ) : value?.startDate ? (
            format(value.startDate, "MMM dd, yy")
          ) : (
            <span className="text-white text-sm">Select dates</span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="p-0 w-auto shadow-xl rounded-xl overflow-hidden"
        align="start"
      >
        {/* Summary bar */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 text-center">
          {tempRange?.startDate ? (
            <div className="flex items-center justify-center gap-2">
              <span className="text-purple-600">
                {format(tempRange.startDate, "MMM dd, yyyy")}
              </span>
              {tempRange.endDate && (
                <>
                  <span className="text-gray-400">→</span>
                  <span className="text-purple-600">
                    {format(tempRange.endDate, "MMM dd, yyyy")}
                  </span>
                  <span className="text-gray-500">
                    ({differenceInDays(tempRange.endDate, tempRange.startDate) + 1} days,{" "}
                    {totalDays} working)
                  </span>
                </>
              )}
            </div>
          ) : (
            <span className="text-gray-500">Pick start and end date</span>
          )}
        </div>

        {/* Calendars */}
        <div
          className={cn(
            "flex flex-col sm:flex-row items-start",
            monthsView === 2 ? "sm:divide-x" : ""
          )}
        >
          {renderCalendar(0)}
          {monthsView === 2 && renderCalendar(1)}
        </div>

        <Legend />
        {renderPerDaySelectors()}

        {/* Footer */}
        <div className="p-2 border-t flex justify-end gap-2 bg-white dark:bg-gray-900">
          <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={handleReset}>
            Reset
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-purple-500 hover:bg-purple-600"
            onClick={handleApply}
            disabled={!tempRange?.startDate}
          >
            Apply
          </Button>
        </div>

        {renderPickerModal()}
      </PopoverContent>
    </Popover>
  );
};

export default LeaveDatePicker;