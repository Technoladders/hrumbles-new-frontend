import { useState, useEffect } from "react";
import { format, addDays, startOfDay, startOfMonth, getDay, isSameDay } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { HolidayDatePicker } from "./HolidayDatePicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, CalendarDays, Settings2, AlertTriangle } from "lucide-react";
import {
  WeekendConfig,
  WorkingDayException,
  WeekendPattern,
  DAY_NAMES,
  DAY_SHORT,
  PATTERN_LABELS,
} from "@/types/time-tracker-types";
import { useWeekendConfig } from "@/hooks/TimeManagement/useWeekendConfig";
import { Holiday } from "@/types/time-tracker-types";
import { weekOfMonth } from "@/utils/holidayUtils";
import { cn } from "@/lib/utils";

interface WeekendConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Official holidays to show as orange indicators in the exception picker */
  holidays?: Holiday[];
}

const WORKING_DAYS = [1, 2, 3, 4, 5]; // Mon–Fri (cannot be made weekend)
const CONFIGURABLE_DAYS = [0, 6];      // Sun, Sat

// Preview: generate this month's calendar and annotate each date
function useMonthPreview(configs: WeekendConfig[], exceptions: WorkingDayException[]) {
  const today = new Date();
  const start = startOfMonth(today);
  const days: { date: Date; status: "working" | "weekend" | "exception_working" | "exception_nonworking" }[] = [];

  for (let i = 0; i < 31; i++) {
    const d = addDays(start, i);
    if (d.getMonth() !== start.getMonth()) break;
    const dow = getDay(d);
    const dateStr = format(d, "yyyy-MM-dd");

    const exc = exceptions.find(e => e.exception_date === dateStr);
    if (exc) {
      days.push({ date: d, status: exc.is_working_day ? "exception_working" : "exception_nonworking" });
      continue;
    }

    const cfg = configs.find(c => c.day_of_week === dow);
    if (!cfg) {
      days.push({ date: d, status: dow === 0 || dow === 6 ? "weekend" : "working" });
      continue;
    }

    if (!cfg.is_weekend) {
      days.push({ date: d, status: "working" });
      continue;
    }

    // Evaluate pattern
    const nth = weekOfMonth(d);
    let isOff = true;
    switch (cfg.pattern) {
      case "none":         isOff = false; break;
      case "alternate":    isOff = nth % 2 === 0; break;
      case "1st_3rd":      isOff = nth === 1 || nth === 3; break;
      case "2nd_4th":      isOff = nth === 2 || nth === 4; break;
      case "2nd_4th_5th":  isOff = nth === 2 || nth === 4 || nth === 5; break;
    }
    days.push({ date: d, status: isOff ? "weekend" : "working" });
  }

  return days;
}

export function WeekendConfigDialog({ open, onOpenChange, holidays = [] }: WeekendConfigDialogProps) {
  const {
    weekendConfig,
    exceptions,
    isLoading,
    isSaving,
    updateDayConfig,
    saveWeekendConfig,
    addException,
    removeException,
  } = useWeekendConfig();

  const [localConfig, setLocalConfig] = useState<WeekendConfig[]>([]);

  // Map holidays → { date, name } for HolidayDatePicker orange indicators
  const holidayDateInfos = holidays.map(h => ({ date: h.date, name: h.name }));
  const [exceptionDate, setExceptionDate] = useState<Date | null>(null);
  const [exceptionType, setExceptionType] = useState<"working" | "nonworking">("working");
  const [exceptionReason, setExceptionReason] = useState("");
  const [activeTab, setActiveTab] = useState("weekend");

  useEffect(() => {
    setLocalConfig(weekendConfig);
  }, [weekendConfig]);

  const preview = useMonthPreview(localConfig, exceptions);

  const getConfig = (dow: number) =>
    localConfig.find(c => c.day_of_week === dow);

  const handleToggleWeekend = (dow: number, isWeekend: boolean) => {
    setLocalConfig(prev => {
      const exists = prev.find(c => c.day_of_week === dow);
      if (exists) {
        return prev.map(c =>
          c.day_of_week === dow
            ? { ...c, is_weekend: isWeekend, pattern: isWeekend ? c.pattern : "none" }
            : c
        );
      }
      return [
        ...prev,
        {
          organization_id: "",
          day_of_week: dow,
          is_weekend: isWeekend,
          pattern: isWeekend ? "all" : "none",
          effective_from: format(new Date(), "yyyy-MM-dd"),
        },
      ];
    });
  };

  const handlePatternChange = (dow: number, pattern: WeekendPattern) => {
    setLocalConfig(prev =>
      prev.map(c => c.day_of_week === dow ? { ...c, pattern } : c)
    );
  };

  const handleSave = async () => {
    await saveWeekendConfig(localConfig);
    onOpenChange(false);
  };

  const handleAddException = async () => {
    if (!exceptionDate) return;
    await addException(
      format(exceptionDate, "yyyy-MM-dd"),
      exceptionType === "working",
      exceptionReason || undefined
    );
    setExceptionDate(null);
    setExceptionReason("");
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "working":            return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300";
      case "weekend":            return "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300";
      case "exception_working":  return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300";
      case "exception_nonworking": return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300";
      default: return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[780px] max-h-[90vh] flex flex-col p-0 gap-0 border-violet-200 dark:border-violet-900">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-r from-violet-600 to-purple-700 rounded-t-lg">
          <DialogTitle className="text-white text-xl flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Weekend & Working Day Configuration
          </DialogTitle>
          <DialogDescription className="text-violet-200">
            Configure weekly schedules and override specific dates for your organization.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-4 grid grid-cols-3 bg-violet-50 dark:bg-violet-950/50">
            <TabsTrigger value="weekend" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white">
              Weekly Schedule
            </TabsTrigger>
            <TabsTrigger value="exceptions" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white">
              Date Exceptions
            </TabsTrigger>
            <TabsTrigger value="preview" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white">
              Month Preview
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-6 overflow-auto">
            {/* ─── WEEKLY SCHEDULE ─────────────────────────────── */}
            <TabsContent value="weekend" className="mt-6 space-y-6">
              {/* Mon–Fri: read-only info */}
              <div className="rounded-lg border border-violet-100 dark:border-violet-900 bg-violet-50/50 dark:bg-violet-950/20 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4 text-violet-500" />
                  <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
                    Monday – Friday are always working days
                  </span>
                </div>
                <div className="flex gap-2">
                  {WORKING_DAYS.map(dow => (
                    <Badge
                      key={dow}
                      className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-0"
                    >
                      {DAY_SHORT[dow]}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Sat & Sun configuration */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Configure weekend days
                </h3>

                {[6, 0].map(dow => {
                  const cfg = getConfig(dow);
                  const isOff = cfg?.is_weekend ?? (dow === 0 || dow === 6);
                  const pattern = (cfg?.pattern ?? "all") as WeekendPattern;

                  return (
                    <div
                      key={dow}
                      className={cn(
                        "rounded-xl border p-5 transition-colors",
                        isOff
                          ? "border-violet-200 bg-violet-50/50 dark:border-violet-800 dark:bg-violet-950/30"
                          : "border-border bg-background"
                      )}
                    >
                      {/* Day header + toggle */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold",
                            isOff
                              ? "bg-violet-600 text-white"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                          )}>
                            {DAY_SHORT[dow]}
                          </div>
                          <div>
                            <p className="font-semibold">{DAY_NAMES[dow]}</p>
                            <p className="text-xs text-muted-foreground">
                              {isOff ? (pattern === "all" ? "Always off" : PATTERN_LABELS[pattern]) : "Always working"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`toggle-${dow}`} className="text-sm text-muted-foreground">
                            {isOff ? "Weekend" : "Working"}
                          </Label>
                          <Switch
                            id={`toggle-${dow}`}
                            checked={isOff}
                            onCheckedChange={v => handleToggleWeekend(dow, v)}
                            className="data-[state=checked]:bg-violet-600"
                          />
                        </div>
                      </div>

                      {/* Pattern selector — only shown if day is a weekend */}
                      {isOff && (
                        <div className="space-y-3 pt-3 border-t border-violet-100 dark:border-violet-900">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium text-violet-700 dark:text-violet-300">
                              {dow === 6 ? "Saturday" : "Sunday"} working pattern
                            </Label>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[260px]">
                                  <p className="text-xs">
                                    Controls which occurrences of this day are treated as working days
                                    vs. weekends within each month.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {(Object.entries(PATTERN_LABELS) as [WeekendPattern, string][])
                              .filter(([k]) => k !== "none")
                              .map(([key, label]) => (
                                <button
                                  key={key}
                                  onClick={() => handlePatternChange(dow, key)}
                                  className={cn(
                                    "text-left px-3 py-2.5 rounded-lg border text-sm transition-all",
                                    pattern === key
                                      ? "border-violet-600 bg-violet-600 text-white"
                                      : "border-border hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/50"
                                  )}
                                >
                                  {label}
                                </button>
                              ))}
                          </div>

                          {/* Pattern visual hint for Saturday */}
                          {dow === 6 && pattern !== "all" && (
                            <SaturdayPatternPreview pattern={pattern} />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* ─── DATE EXCEPTIONS ─────────────────────────────── */}
            <TabsContent value="exceptions" className="mt-6 space-y-6">
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20 p-4 flex gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Date exceptions override all weekly rules. Use them to mark a specific holiday as a
                  working day (e.g. make-up day) or a specific weekday as non-working.
                </p>
              </div>

              {/* Add exception */}
              <div className="rounded-xl border p-5 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-violet-600" />
                  Add date exception
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Select date</Label>
                    <div className="rounded-xl border border-violet-100 dark:border-violet-900 bg-violet-50/30 dark:bg-violet-950/20 p-3">
                      <HolidayDatePicker
                        selected={exceptionDate ? [exceptionDate] : []}
                        onChange={dates => setExceptionDate(dates.length > 0 ? dates[dates.length - 1] : null)}
                        holidayDates={holidayDateInfos}
                        existingExceptions={exceptions.map(e => e.exception_date)}
                      />
                    </div>
                    {exceptionDate && (
                      <p className="text-xs text-muted-foreground">
                        Selected: <span className="font-semibold text-violet-700 dark:text-violet-300">{format(exceptionDate, "EEEE, MMM d, yyyy")}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Exception type</Label>
                      <div className="grid grid-cols-1 gap-2">
                        <button
                          onClick={() => setExceptionType("working")}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium transition-all",
                            exceptionType === "working"
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : "border-border hover:border-emerald-300"
                          )}
                        >
                          <div className="w-3 h-3 rounded-full bg-emerald-500" />
                          Force working day
                          <span className="text-xs text-muted-foreground font-normal ml-auto">
                            overrides holiday/weekend
                          </span>
                        </button>
                        <button
                          onClick={() => setExceptionType("nonworking")}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium transition-all",
                            exceptionType === "nonworking"
                              ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                              : "border-border hover:border-rose-300"
                          )}
                        >
                          <div className="w-3 h-3 rounded-full bg-rose-500" />
                          Force non-working day
                          <span className="text-xs text-muted-foreground font-normal ml-auto">
                            overrides working day
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="exc-reason">Reason (optional)</Label>
                      <Input
                        id="exc-reason"
                        placeholder="e.g. Make-up for Republic Day"
                        value={exceptionReason}
                        onChange={e => setExceptionReason(e.target.value)}
                      />
                    </div>

                    <Button
                      onClick={handleAddException}
                      disabled={!exceptionDate}
                      className="w-full bg-violet-600 hover:bg-violet-700"
                    >
                      Add exception{exceptionDate ? " for " + format(exceptionDate, "MMM d, yyyy") : ""}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Existing exceptions list */}
              {exceptions.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                    Active exceptions ({exceptions.length})
                  </h3>
                  {exceptions.map(exc => (
                    <div
                      key={exc.id}
                      className="flex items-center justify-between px-4 py-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          exc.is_working_day ? "bg-emerald-500" : "bg-rose-500"
                        )} />
                        <div>
                          <p className="text-sm font-medium">
                            {format(new Date(exc.exception_date), "EEEE, MMMM d, yyyy")}
                          </p>
                          {exc.reason && (
                            <p className="text-xs text-muted-foreground">{exc.reason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={exc.is_working_day
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 border"
                          : "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 border"
                        }>
                          {exc.is_working_day ? "Working" : "Non-working"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive h-7"
                          onClick={() => removeException(exc.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ─── MONTH PREVIEW ───────────────────────────────── */}
            <TabsContent value="preview" className="mt-6 space-y-4">
              <div className="flex items-center gap-6 text-sm flex-wrap">
                {[
                  { label: "Working", cls: "bg-emerald-100 text-emerald-700" },
                  { label: "Weekend", cls: "bg-violet-100 text-violet-700" },
                  { label: "Forced working", cls: "bg-amber-100 text-amber-700" },
                  { label: "Forced off", cls: "bg-rose-100 text-rose-700" },
                ].map(({ label, cls }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className={cn("w-5 h-5 rounded text-xs flex items-center justify-center font-bold", cls)}>
                      1
                    </div>
                    <span className="text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                  <div key={d} className="text-xs text-muted-foreground font-medium py-1">{d}</div>
                ))}

                {/* Empty cells for first day offset */}
                {Array.from({ length: preview[0] ? getDay(preview[0].date) : 0 }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {preview.map(({ date, status }) => (
                  <div
                    key={date.toISOString()}
                    className={cn(
                      "rounded-lg py-2 text-xs font-semibold border",
                      statusColor(status)
                    )}
                  >
                    {format(date, "d")}
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                {[
                  { label: "Working days", count: preview.filter(d => d.status === "working" || d.status === "exception_working").length, cls: "text-emerald-600" },
                  { label: "Weekend days", count: preview.filter(d => d.status === "weekend").length, cls: "text-violet-600" },
                  { label: "Exceptions", count: preview.filter(d => d.status.startsWith("exception")).length, cls: "text-amber-600" },
                ].map(({ label, count, cls }) => (
                  <div key={label} className="rounded-lg border p-3">
                    <p className={cn("text-2xl font-bold", cls)}>{count}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <Separator />
        <DialogFooter className="px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {activeTab === "weekend" && (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {isSaving ? "Saving…" : "Save weekend config"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Saturday pattern visual hint ─────────────────────────────
function SaturdayPatternPreview({ pattern }: { pattern: WeekendPattern }) {
  const weeks = [1, 2, 3, 4, 5];
  const isOff = (nth: number): boolean => {
    switch (pattern) {
      case "alternate":    return nth % 2 === 0;
      case "1st_3rd":      return nth === 1 || nth === 3;
      case "2nd_4th":      return nth === 2 || nth === 4;
      case "2nd_4th_5th":  return nth === 2 || nth === 4 || nth === 5;
      default:             return true;
    }
  };

  return (
    <div className="flex items-center gap-2 pt-2">
      <span className="text-xs text-muted-foreground w-24">This month:</span>
      <div className="flex gap-1.5">
        {weeks.map(nth => (
          <div
            key={nth}
            className={cn(
              "w-10 h-8 rounded text-xs flex flex-col items-center justify-center font-semibold border",
              isOff(nth)
                ? "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300"
                : "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
            )}
          >
            <span>{nth}{nth === 1 ? "st" : nth === 2 ? "nd" : nth === 3 ? "rd" : "th"}</span>
            <span className="text-[9px] font-normal">{isOff(nth) ? "off" : "work"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}