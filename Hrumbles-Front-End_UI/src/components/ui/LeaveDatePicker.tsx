// Updated LeaveDatePicker.tsx - Fixed to only include working days (non-weekend, non-holiday) in daySelections and per-day selectors.
// Added endOfYear import. Ensured totalDays only sums working days. Range can span non-working days, but selections only for working.
// Weekends styled yellow (allowed for range), holidays disabled (cannot start/end on them, excluded from selections).

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  addDays,
  addMonths,
  differenceInDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isSameDay,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import "./enhanced-date-range.css";

type DaySelection = "full" | "first" | "second";
interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface ApplyPayload {
  range: DateRange | null;
  daySelections?: Record<string, DaySelection>;
  totalDays?: number;
}

interface LeaveDatePickerProps {
  value: DateRange | null;
  onChange: (range: DateRange | null) => void;
  onApply?: (payload: ApplyPayload) => void;
  monthsView?: 1 | 2;
  className?: string;
  holidays?: (Date | string)[];
}

export const LeaveDatePicker: React.FC<LeaveDatePickerProps> = ({
  value,
  onChange,
  onApply,
  monthsView = 2,
  className,
  holidays = [],
}) => {
  const [open, setOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | null>(value ?? null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [pickerMode, setPickerMode] = useState<"none" | "month" | "year">("none");
  const [tab, setTab] = useState<"current" | "past">("current");
  const [daySelections, setDaySelections] = useState<Record<string, DaySelection>>({});
  const yearListRef = useRef<HTMLDivElement | null>(null);

  // normalize holidays into startOfDay strings for quick lookup
  const holidaySet = useMemo(() => {
    const set = new Set<string>();
    holidays.forEach((h) => {
      const d = typeof h === "string" ? new Date(h) : h;
      if (!isNaN(d.getTime())) set.add(startOfDay(d).toISOString());
    });
    return set;
  }, [holidays]);

  // Working day check
  const isWorkingDay = useCallback((d: Date) => {
    return !isWeekend(d) && !isHoliday(d);
  }, [holidaySet]);

  useEffect(() => {
    setTempRange(value ?? null);
    // if external value has range, populate default day selections as 'full' for working days only
    if (value && value.startDate && value.endDate) {
      const allDays = getDatesBetween(value.startDate, value.endDate);
      const workingDays = allDays.filter(isWorkingDay);
      const map: Record<string, DaySelection> = {};
      workingDays.forEach((d) => {
        map[startOfDayISO(d)] = "full";
      });
      setDaySelections(map);
    } else {
      setDaySelections({});
    }
  }, [value, isWorkingDay]);

  useEffect(() => {
    if (pickerMode === "year" && yearListRef.current) {
      const currentYear = new Date().getFullYear();
      const activeButton = yearListRef.current.querySelector(`button[data-year="${currentYear}"]`);
      if (activeButton) activeButton.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [pickerMode]);

  // Helpers
  function startOfDayISO(d: Date) {
    return startOfDay(d).toISOString();
  }

  function isWeekend(d: Date) {
    const day = d.getDay();
    return day === 0 || day === 6;
  }

  function isHoliday(d: Date) {
    return holidaySet.has(startOfDay(d).toISOString());
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

  // When user clicks a calendar day
  function handleDayClick(day: Date) {
    if (isHoliday(day)) return; // cannot pick holiday
    if (!tempRange?.startDate || (tempRange.startDate && tempRange.endDate)) {
      // start new selection
      setTempRange({ startDate: day, endDate: null });
      const workingDays = getWorkingDaysBetween(day, day);
      const map: Record<string, DaySelection> = {};
      workingDays.forEach((d) => (map[startOfDayISO(d)] = "full"));
      setDaySelections(map);
    } else if (day < tempRange.startDate) {
      // clicked before start -> swap
      const newRange = { startDate: day, endDate: tempRange.startDate };
      setTempRange(newRange);
      // init day selections for working days only
      const workingDays = getWorkingDaysBetween(newRange.startDate!, newRange.endDate!);
      const map: Record<string, DaySelection> = {};
      workingDays.forEach((d) => (map[startOfDayISO(d)] = "full"));
      setDaySelections(map);
    } else {
      // set end date
      const newRange = { startDate: tempRange.startDate, endDate: day };
      setTempRange(newRange);
      const workingDays = getWorkingDaysBetween(newRange.startDate!, newRange.endDate!);
      const map: Record<string, DaySelection> = {};
      workingDays.forEach((d) => (map[startOfDayISO(d)] = "full"));
      setDaySelections(map);
    }
    setHoverDate(null);
  }

  function handleHover(e: React.MouseEvent, day: Date) {
    setHoverDate(day);
  }

  function handleQuickSelect(label: string) {
    const now = startOfDay(new Date());
    let start: Date | null = null;
    let end: Date | null = null;
    switch (label) {
      case "Today":
        start = end = now;
        break;
      case "This Week":
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = addDays(start, 6);
        break;
      case "This Month":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case "This Year":
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      case "Yesterday":
        start = end = subDays(now, 1);
        break;
      case "Last Week":
        const lastWeekStart = subWeeks(now, 1);
        start = startOfWeek(lastWeekStart, { weekStartsOn: 1 });
        end = addDays(start, 6);
        break;
      case "Last Month":
        const lastMonthStart = subMonths(now, 1);
        start = startOfMonth(lastMonthStart);
        end = endOfMonth(lastMonthStart);
        break;
      case "Last Year":
        const lastYear = subYears(now, 1);
        start = startOfYear(lastYear);
        end = endOfYear(lastYear);
        break;
    }
    if (start && end) {
      const newRange = { startDate: start, endDate: end };
      setTempRange(newRange);
      const workingDays = getWorkingDaysBetween(start, end);
      const map: Record<string, DaySelection> = {};
      workingDays.forEach((d) => (map[startOfDayISO(d)] = "full"));
      setDaySelections(map);
      // move calendar to start
      setCurrentMonth(start);
    }
  }

  function setSelectionForDay(d: Date, sel: DaySelection) {
    const key = startOfDayISO(d);
    setDaySelections((prev) => ({ ...prev, [key]: sel }));
  }

  // total days calculation (full = 1, half = 0.5) - only for working days
  const totalDays = useMemo(() => {
    if (!tempRange?.startDate || !tempRange?.endDate) return 0;
    const workingDays = getWorkingDaysBetween(tempRange.startDate, tempRange.endDate);
    return workingDays.reduce((sum, d) => {
      const v = daySelections[startOfDayISO(d)] ?? "full";
      if (v === "full") return sum + 1;
      return sum + 0.5;
    }, 0);
  }, [tempRange, daySelections, isWorkingDay]);

  // Apply handler: calls both onChange (backwards-compatible) and onApply with enriched payload
  function handleApply() {
    onChange(tempRange);
    onApply?.({
      range: tempRange,
      daySelections: tempRange?.startDate && tempRange?.endDate ? { ...daySelections } : undefined,
      totalDays: tempRange?.startDate && tempRange?.endDate ? totalDays : undefined,
    });
    setOpen(false);
  }

  // Reset selection
  function handleReset() {
    setTempRange(null);
    setDaySelections({});
    onChange(null);
  }

  // Calendar rendering (compact) - shows 1 or 2 months depending on monthsView
  const renderCalendar = (monthOffset = 0) => {
    const monthDate = addMonths(currentMonth, monthOffset);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const startWeek = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endWeek = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows: JSX.Element[] = [];
    let day = startWeek;
    let weekIndex = 0;

    // preview when selecting start but no end
    let previewStart: Date | null = null;
    let previewEnd: Date | null = null;
    if (tempRange?.startDate && !tempRange.endDate && hoverDate) {
      previewStart = new Date(Math.min(tempRange.startDate.getTime(), hoverDate.getTime()));
      previewEnd = new Date(Math.max(tempRange.startDate.getTime(), hoverDate.getTime()));
    }

    while (day <= endWeek) {
      const week: JSX.Element[] = [];
      for (let i = 0; i < 7; i++) {
        const currentDay = day;
        const iso = startOfDayISO(currentDay);
        const isSelected =
          tempRange?.startDate &&
          tempRange?.endDate &&
          isWithinInterval(currentDay, { start: tempRange.startDate, end: tempRange.endDate });
        const isStart = tempRange?.startDate && isSameDay(currentDay, tempRange.startDate);
        const isEnd = tempRange?.endDate && isSameDay(currentDay, tempRange.endDate);

        let isInHoverRange = false;
        if (previewStart && previewEnd) {
          isInHoverRange = isWithinInterval(currentDay, { start: previewStart, end: previewEnd });
        }

        const disabled = isHoliday(currentDay);
        const weekend = isWeekend(currentDay);

        const baseClasses = cn(
          "w-8 h-8 flex items-center justify-center rounded-md text-sm cursor-pointer relative transition-all duration-150",
          disabled
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : isStart || isEnd
            ? "bg-purple-500 text-white font-semibold shadow-md"
            : isSelected || isInHoverRange
            ? "bg-purple-100 text-purple-700"
            : "hover:bg-gray-100 text-gray-700"
        );

        week.push(
          <div
            key={currentDay.toISOString()}
            className={baseClasses}
            onClick={() => !disabled && handleDayClick(currentDay)}
            onMouseEnter={(e) => !disabled && handleHover(e, currentDay)}
            onMouseLeave={() => setHoverDate(null)}
            title={disabled ? "Holiday (not selectable)" : weekend ? "Weekend (allowed)" : undefined}
            style={weekend && !disabled ? { boxShadow: "inset 0 0 0 1px rgba(250,180,50,0.08)" } : undefined}
          >
            <div className="text-[11px] leading-none">
              <div className={cn(weekend && !disabled ? "text-yellow-700 font-medium" : undefined)}>
                {currentDay.getDate()}
              </div>
            </div>
          </div>
        );

        day = addDays(day, 1);
      }
      rows.push(
        <div key={`week-${weekIndex++}`} className="grid grid-cols-7 gap-1">
          {week}
        </div>
      );
    }

    return (
      <div className="p-2 text-center relative animate-slideUp">
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between mb-1 px-2">
          {monthOffset === 0 && (
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1 hover:bg-gray-100 rounded-md transition-all"
            >
              <ChevronLeft className="h-4 w-4 text-purple-600" />
            </button>
          )}

          <div className="text-xs font-semibold text-gray-600 flex items-center gap-1">
            <span className="cursor-pointer text-purple-600 hover:text-purple-800" onClick={() => setPickerMode("month")}>
              {format(monthDate, "MMMM")}
            </span>
            <span className="cursor-pointer text-purple-600 hover:text-purple-800" onClick={() => setPickerMode("year")}>
              {format(monthDate, "yyyy")}
            </span>
          </div>

          {monthOffset === monthsView - 1 && (
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1 hover:bg-gray-100 rounded-md transition-all"
            >
              <ChevronRight className="h-4 w-4 text-purple-600" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-7 text-[10px] text-gray-400 mb-1">
          <div>Mo</div>
          <div>Tu</div>
          <div>We</div>
          <div>Th</div>
          <div>Fr</div>
          <div>Sa</div>
          <div>Su</div>
        </div>

        <div className="space-y-1">{rows}</div>
      </div>
    );
  };

  // Simple month/year pickers (kept small)
  const renderPickerModal = () => {
    if (pickerMode === "none") return null;
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white/95 backdrop-blur-sm z-20 p-4 animate-fadeIn">
        <div className="bg-white rounded-lg shadow-xl border border-purple-200 p-4 w-full max-w-md max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-purple-600">{pickerMode === "month" ? "Select Month" : "Select Year"}</h3>
            <button onClick={() => setPickerMode("none")} className="p-1 hover:bg-gray-100 rounded-md transition-all">
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>

          {pickerMode === "month" && (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <button key={i} className="px-3 py-2 text-sm rounded-md hover:bg-purple-100 transition-all" onClick={() => { setCurrentMonth(new Date(currentMonth.getFullYear(), i, 1)); setPickerMode("none"); }}>
                  {format(new Date(2025, i, 1), "MMM")}
                </button>
              ))}
            </div>
          )}

          {pickerMode === "year" && (
            <div ref={yearListRef} className="grid grid-cols-4 gap-2 max-h-[220px] overflow-y-auto scroll-smooth">
              {Array.from({ length: 101 }).map((_, i) => {
                const base = new Date().getFullYear() - 50;
                const year = base + i;
                return (
                  <button key={year} data-year={year} className={cn("px-3 py-2 text-sm rounded-md hover:bg-purple-100 transition-all", year === new Date().getFullYear() ? "bg-purple-500 text-white" : "")} onClick={() => { setCurrentMonth(new Date(year, currentMonth.getMonth(), 1)); setPickerMode("none"); }}>
                    {year}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex justify-end mt-4 pt-2 border-t border-gray-200">
            <Button variant="outline" size="sm" className="h-8 text-xs px-3" onClick={() => setPickerMode("none")}>Cancel</Button>
          </div>
        </div>
      </div>
    );
  };

  // Per-day selection UI rendered after user has chosen a full range - only working days
  const renderPerDaySelectors = () => {
    if (!tempRange?.startDate || !tempRange?.endDate) return null;
    const workingDays = getWorkingDaysBetween(tempRange.startDate, tempRange.endDate);
    if (workingDays.length === 0) return null;
    return (
      <div className="p-3 border-t border-gray-200 space-y-2 bg-white">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-700">Day-wise selection ({workingDays.length} working days)</div>
          <div className="text-xs text-gray-500">Total: <span className="font-semibold">{totalDays}</span> days</div>
        </div>

        <div className="grid gap-2 max-h-60 overflow-y-auto">
          {workingDays.map((d) => {
            const iso = startOfDayISO(d);
            const sel = daySelections[iso] ?? "full";
            return (
              <div key={iso} className="flex items-center justify-between gap-3 py-2 px-2 rounded-md border border-gray-100">
                <div className="flex items-center gap-3 min-w-[180px]">
                  <div className="text-sm text-gray-700">{format(d, "EEE, MMM dd")}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className={cn("px-2 py-1 rounded-md text-xs", sel === "full" ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-700")}
                    onClick={() => setSelectionForDay(d, "full")}
                  >
                    Full
                  </button>

                  <button
                    className={cn("px-2 py-1 rounded-md text-xs", sel === "first" ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-700")}
                    onClick={() => setSelectionForDay(d, "first")}
                  >
                    1st Half
                  </button>

                  <button
                    className={cn("px-2 py-1 rounded-md text-xs", sel === "second" ? "bg-purple-500 text-white" : "bg-gray-100 text-gray-700")}
                    onClick={() => setSelectionForDay(d, "second")}
                  >
                    2nd Half
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="datepicker"
          className={cn(
            "justify-start text-left text-md font-normal h-10 px-3 py-1 rounded-full shadow-inner",
            className ?? "w-full"
          )}
        >
          <CalendarIcon className="mr-2 h-5 w-5 text-white" />
          {value?.startDate && value?.endDate ? (
            <>
              {format(value.startDate, "MMM dd, yy")} - {format(value.endDate, "MMM dd, yy")}
            </>
          ) : value?.startDate ? (
            <>{format(value.startDate, "MMM dd, yy")}</>
          ) : (
            <span className="text-white text-sm">Select range</span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="p-0 w-[450px] shadow-xl rounded-xl overflow-hidden animate-slideUp" align="start">
        {/* top summary */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-3 py-2 text-center text-xs font-medium text-gray-600">
          {tempRange?.startDate ? (
            <div className="flex items-center justify-center gap-2">
              <span className="cursor-pointer text-purple-600" onClick={() => tempRange.startDate && setCurrentMonth(tempRange.startDate)}>
                {format(tempRange.startDate, "MMM dd, yyyy")}
              </span>
              {tempRange?.endDate && <span className="text-gray-400">→</span>}
              {tempRange?.endDate && (
                <span className="cursor-pointer text-purple-600" onClick={() => tempRange.endDate && setCurrentMonth(tempRange.endDate)}>
                  {format(tempRange.endDate, "MMM dd, yyyy")}
                </span>
              )}
              {tempRange?.endDate && <span className="text-gray-500 ml-2">({differenceInDays(tempRange.endDate, tempRange.startDate) + 1} days)</span>}
            </div>
          ) : (
            <div className="text-gray-500">Pick start and end date</div>
          )}
        </div>

        {/* body */}
        <div className="flex compact-date-range-container flex-col sm:flex-row">
          {/* calendars */}
          <div className={cn("flex flex-col sm:flex-row items-center justify-center p-2", monthsView === 2 ? "sm:space-x-2" : "")}>
            {renderCalendar(0)}
            {monthsView === 2 && renderCalendar(1)}
          </div>
        </div>

        {/* per-day selectors */}
        {renderPerDaySelectors()}

        {/* footer */}
        <div className="p-2 border-t border-gray-200 flex justify-end gap-2">
          <Button size="sm" variant="secondary" className="h-8 text-xs px-3" onClick={handleReset}>Reset</Button>
          <Button size="sm" className="h-8 text-xs px-3 bg-purple-500 hover:bg-purple-600" onClick={handleApply}>Apply</Button>
        </div>

        {renderPickerModal()}
      </PopoverContent>
    </Popover>
  );
};

export default LeaveDatePicker;