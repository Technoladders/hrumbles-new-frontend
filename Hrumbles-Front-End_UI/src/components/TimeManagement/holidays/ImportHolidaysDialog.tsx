import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Download,
  MapPin,
  Calendar,
  ChevronRight,
  ChevronLeft,
  CheckSquare,
  Square,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import {
  INDIAN_STATES,
  ALL_STATE_CODES,
} from "@/data/indianStates";
import {
  getHolidaysForYearAndStates,
  ResolvedHoliday,
  CATEGORY_COLOR,
} from "@/data/indianHolidaysService";
import { cn } from "@/lib/utils";

interface ImportHolidaysDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (
    holidays: Array<{
      name: string;
      date: string;
      day_of_week: string;
      type: "National" | "Regional";
      is_recurring: boolean;
      applicable_regions: string;
    }>
  ) => void;
  /** Already-saved dates to grey out */
  existingDates?: string[];
}

type Step = "location" | "review";

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1, CURRENT_YEAR + 2];



// Group states by region for display
const STATE_REGIONS = ["North", "South", "East", "West", "Central", "Northeast", "UT"] as const;

export function ImportHolidaysDialog({
  open,
  onOpenChange,
  onImport,
  existingDates = [],
}: ImportHolidaysDialogProps) {
  const [step, setStep]                     = useState<Step>("location");
  const [selectedYear, setSelectedYear]     = useState(CURRENT_YEAR);
  const [selectedStates, setSelectedStates] = useState<string[]>(["ALL"]);
  const [checkedIds, setCheckedIds]         = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<string | "all">("all");

  // ── Build holiday list for selected year + states ─────────────
  const holidayList = useMemo(() => {
    const codes = selectedStates.includes("ALL")
      ? ["ALL", ...INDIAN_STATES.map(s => s.code)]
      : ["ALL", ...selectedStates]; // always include national ones
    return getHolidaysForYearAndStates(selectedYear, codes);
  }, [selectedYear, selectedStates]);

  const filteredList = useMemo(() => {
    if (filterCategory === "all") return holidayList;
    return holidayList.filter(h => h.category === filterCategory);
  }, [holidayList, filterCategory]);

  const alreadyAdded = (date: string) => existingDates.includes(date);

  // ── State selection helpers ───────────────────────────────────
  const toggleState = (code: string) => {
    if (code === "ALL") {
      setSelectedStates(prev => prev.includes("ALL") ? [] : ["ALL"]);
      return;
    }
    setSelectedStates(prev => {
      const withoutAll = prev.filter(c => c !== "ALL");
      return withoutAll.includes(code)
        ? withoutAll.filter(c => c !== code)
        : [...withoutAll, code];
    });
  };

  const toggleRegion = (region: string) => {
    const regionCodes = INDIAN_STATES
      .filter(s => s.region === region)
      .map(s => s.code);
    const allSelected = regionCodes.every(c => selectedStates.includes(c));
    if (allSelected) {
      setSelectedStates(prev => prev.filter(c => !regionCodes.includes(c)));
    } else {
      setSelectedStates(prev => {
        const combined = [...new Set([...prev.filter(c => c !== "ALL"), ...regionCodes])];
        return combined;
      });
    }
  };

  // ── Checkbox helpers ──────────────────────────────────────────
  const toggleCheck = (id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      filteredList
        .filter(h => !alreadyAdded(h.date))
        .forEach(h => next.add(h.id));
      return next;
    });
  };

  const deselectAllVisible = () => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      filteredList.forEach(h => next.delete(h.id));
      return next;
    });
  };

  const selectByType = (type: "National" | "Regional") => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      filteredList
        .filter(h => h.type === type && !alreadyAdded(h.date))
        .forEach(h => next.add(h.id));
      return next;
    });
  };

  // ── Step navigation ───────────────────────────────────────────
  const handleGoToReview = () => {
    if (selectedStates.length === 0) return;
    // Auto-select all applicable, non-existing holidays
    const autoSelect = new Set(
      holidayList
        .filter(h => !alreadyAdded(h.date))
        .map(h => h.id)
    );
    setCheckedIds(autoSelect);
    setStep("review");
  };

  // ── Import ────────────────────────────────────────────────────
  const handleImport = () => {
    const toImport = holidayList
      .filter(h => checkedIds.has(h.id) && !alreadyAdded(h.date))
      .map(h => ({
        name:               h.name,
        date:               h.date,
        day_of_week:        format(parseISO(h.date), "EEEE"),
        type:               h.type,
        is_recurring:       false,
        applicable_regions: "All",
      }));

    onImport(toImport);
    handleClose();
  };

  const handleClose = () => {
    setStep("location");
    setSelectedYear(CURRENT_YEAR);
    setSelectedStates(["ALL"]);
    setCheckedIds(new Set());
    setFilterCategory("all");
    onOpenChange(false);
  };

  const checkedCount = holidayList.filter(
    h => checkedIds.has(h.id) && !alreadyAdded(h.date)
  ).length;

  const categories = useMemo(() =>
    [...new Set(holidayList.map(h => h.category))].sort(),
    [holidayList]
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] flex flex-col p-0 gap-0 border-violet-200 dark:border-violet-900">

        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-r from-violet-600 to-purple-700 rounded-t-lg shrink-0">
          <DialogTitle className="text-white text-xl flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Import Indian Holidays
          </DialogTitle>
          <DialogDescription className="text-violet-200">
            {step === "location"
              ? "Select year and states/UTs to load applicable holidays."
              : `${holidayList.length} holidays found for ${selectedYear} — review and select.`}
          </DialogDescription>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-2">
            {(["location", "review"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                  step === s || (i === 0 && step === "review")
                    ? "bg-white text-violet-700"
                    : "bg-violet-400/40 text-violet-200"
                )}>
                  {i + 1}
                </div>
                <span className={cn(
                  "text-xs",
                  step === s ? "text-white font-medium" : "text-violet-300"
                )}>
                  {s === "location" ? "Select Location" : "Review & Import"}
                </span>
                {i < 1 && <ChevronRight className="h-3 w-3 text-violet-400" />}
              </div>
            ))}
          </div>
        </DialogHeader>

        {/* ── STEP 1: Location ──────────────────────────────────── */}
        {step === "location" && (
          <ScrollArea className="flex-1 min-h-0 px-6 py-5 overflow-auto">
            <div className="space-y-6">

              {/* Year selector */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-violet-600" />
                  Select Year
                </Label>
                <div className="flex gap-2 flex-wrap">
                  {YEAR_OPTIONS.map(yr => (
                    <button
                      key={yr}
                      onClick={() => setSelectedYear(yr)}
                      className={cn(
                        "px-5 py-2.5 rounded-lg border text-sm font-medium transition-all",
                        selectedYear === yr
                          ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                          : "border-border hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40"
                      )}
                    >
                      {yr}
                      {yr === CURRENT_YEAR && (
                        <span className="ml-1.5 text-[10px] opacity-80">(current)</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* State selector */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-violet-600" />
                    Select States / UTs
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {selectedStates.includes("ALL")
                      ? "All states selected"
                      : `${selectedStates.length} selected`}
                  </span>
                </div>

                {/* All India toggle */}
                <button
                  onClick={() => toggleState("ALL")}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all",
                    selectedStates.includes("ALL")
                      ? "border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
                      : "border-border hover:border-violet-300"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                    selectedStates.includes("ALL")
                      ? "bg-violet-600 border-violet-600"
                      : "border-muted-foreground"
                  )}>
                    {selectedStates.includes("ALL") && (
                      <svg viewBox="0 0 10 8" className="w-3 h-3 fill-white">
                        <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  🇮🇳 All India (National holidays for all states)
                </button>

                {/* State groups by region */}
                {STATE_REGIONS.map(region => {
                  const states = INDIAN_STATES.filter(s => s.region === region);
                  if (states.length === 0) return null;
                  const regionCodes = states.map(s => s.code);
                  const allRegionSelected = regionCodes.every(c => selectedStates.includes(c));
                  const someRegionSelected = regionCodes.some(c => selectedStates.includes(c));

                  return (
                    <div key={region} className="space-y-1.5">
                      <button
                        onClick={() => toggleRegion(region)}
                        className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider"
                      >
                        <div className={cn(
                          "w-3.5 h-3.5 rounded border flex items-center justify-center",
                          allRegionSelected
                            ? "bg-violet-600 border-violet-600"
                            : someRegionSelected
                            ? "bg-violet-300 border-violet-400"
                            : "border-muted-foreground"
                        )} />
                        {region} India
                      </button>

                      <div className="flex flex-wrap gap-1.5 pl-5">
                        {states.map(s => {
                          const isSel = selectedStates.includes(s.code);
                          return (
                            <button
                              key={s.code}
                              onClick={() => toggleState(s.code)}
                              className={cn(
                                "px-2.5 py-1 rounded-md border text-xs transition-all",
                                isSel
                                  ? "bg-violet-600 text-white border-violet-600"
                                  : "border-border hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30"
                              )}
                            >
                              {s.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Preview count */}
              {selectedStates.length > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800">
                  <Sparkles className="h-4 w-4 text-violet-600 shrink-0" />
                  <p className="text-sm text-violet-700 dark:text-violet-300">
                    <span className="font-bold">
                      {holidayList.length}
                    </span>{" "}
                    holidays will be loaded for {selectedYear}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* ── STEP 2: Review ────────────────────────────────────── */}
        {step === "review" && (
          <>
            {/* Toolbar */}
            <div className="px-6 py-3 border-b flex items-center gap-2 flex-wrap shrink-0 bg-muted/30">
              {/* Quick select */}
              <button
                onClick={selectAllVisible}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-violet-200 hover:bg-violet-50 dark:border-violet-800 dark:hover:bg-violet-950/40 text-violet-700 dark:text-violet-300 transition-colors"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                Select all
              </button>
              <button
                onClick={deselectAllVisible}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border hover:bg-muted transition-colors"
              >
                <Square className="h-3.5 w-3.5" />
                Deselect all
              </button>
              <button
                onClick={() => selectByType("National")}
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-violet-100 text-violet-700 hover:bg-violet-200 dark:bg-violet-950 dark:text-violet-300 transition-colors"
              >
                National only
              </button>
              <button
                onClick={() => selectByType("Regional")}
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-teal-100 text-teal-700 hover:bg-teal-200 dark:bg-teal-950 dark:text-teal-300 transition-colors"
              >
                Regional only
              </button>

              {/* Category filter */}
              <div className="ml-auto flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Filter:</span>
                <select
                  value={filterCategory}
                  onChange={e => setFilterCategory(e.target.value)}
                  className="text-xs border rounded-md px-2 py-1 bg-background"
                >
                  <option value="all">All categories</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0 px-6 py-3 overflow-auto">
              {filteredList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                  <AlertCircle className="h-8 w-8 opacity-30" />
                  <p className="text-sm">No holidays found for this filter</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredList.map(h => {
                    const existing = alreadyAdded(h.date);
                    const checked = checkedIds.has(h.id);
                    const parsedDate = parseISO(h.date);

                    return (
                      <div
                        key={h.id}
                        onClick={() => !existing && toggleCheck(h.id)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
                          existing
                            ? "opacity-50 cursor-not-allowed bg-muted/30 border-dashed"
                            : checked
                            ? "border-violet-300 bg-violet-50/60 dark:border-violet-800 dark:bg-violet-950/30 cursor-pointer"
                            : "border-border hover:border-violet-200 hover:bg-muted/20 cursor-pointer"
                        )}
                      >
                        {/* Checkbox */}
                        <div className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                          existing
                            ? "bg-muted border-muted-foreground/30"
                            : checked
                            ? "bg-violet-600 border-violet-600"
                            : "border-muted-foreground/50"
                        )}>
                          {(checked || existing) && (
                            <svg viewBox="0 0 10 8" className="w-3 h-3">
                              <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>

                        {/* Date block */}
                        <div className="w-20 shrink-0 text-center">
                          <p className="text-xs font-bold text-violet-700 dark:text-violet-300">
                            {format(parsedDate, "d MMM")}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {format(parsedDate, "EEEE")}
                          </p>
                        </div>

                        {/* Name + description */}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            existing && "line-through text-muted-foreground"
                          )}>
                            {h.name}
                          </p>
                          {h.description && (
                            <p className="text-xs text-muted-foreground truncate">{h.description}</p>
                          )}
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge className={cn("text-[10px] px-1.5 py-0 border", CATEGORY_COLOR[h.category] ?? CATEGORY_COLOR["Public holiday"])}>
                            {h.category}
                          </Badge>
                          {h.type === "National" ? (
                            <Badge className="text-[10px] px-1.5 py-0 bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 border">
                              National
                            </Badge>
                          ) : (
                            <Badge className="text-[10px] px-1.5 py-0 bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 border">
                              Regional
                            </Badge>
                          )}
                          {existing && (
                            <Badge className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground border">
                              Already added
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </>
        )}

        <Separator />

        {/* Footer */}
        <DialogFooter className="px-6 py-4 flex items-center justify-between shrink-0">
          <div className="text-xs text-muted-foreground">
            {step === "location" ? (
              <span>
                {selectedStates.includes("ALL")
                  ? "All India selected"
                  : `${selectedStates.length} state${selectedStates.length !== 1 ? "s" : ""} selected`}
              </span>
            ) : (
              <span>
                <span className="font-semibold text-violet-700 dark:text-violet-300">
                  {checkedCount}
                </span>{" "}
                holiday{checkedCount !== 1 ? "s" : ""} selected for import
                {existingDates.length > 0 && (
                  <span className="ml-2 text-muted-foreground/70">
                    ({holidayList.filter(h => alreadyAdded(h.date)).length} already added)
                  </span>
                )}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {step === "review" && (
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={() => setStep("location")}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>

            {step === "location" ? (
              <Button
                onClick={handleGoToReview}
                disabled={selectedStates.length === 0}
                className="bg-violet-600 hover:bg-violet-700 gap-1.5"
              >
                Review holidays
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleImport}
                disabled={checkedCount === 0}
                className="bg-violet-600 hover:bg-violet-700 gap-1.5"
              >
                <Download className="h-4 w-4" />
                Import {checkedCount > 0 ? `${checkedCount} ` : ""}
                holiday{checkedCount !== 1 ? "s" : ""}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}