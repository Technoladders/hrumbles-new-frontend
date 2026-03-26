import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { X, CalendarPlus } from "lucide-react";
import { Holiday } from "@/types/time-tracker-types";
import { HolidayNameInput } from "./HolidayNameInput";
import { HolidayTypeSelect } from "./HolidayTypeSelect";
import { HolidayDatePicker } from "./HolidayDatePicker";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface HolidaySelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (holidays: Omit<Holiday, "id" | "created_at" | "updated_at">[]) => void;
  /** Already-saved dates for this org (shown as dots, not re-selectable) */
  existingDates?: string[];
}

const TYPE_BADGE: Record<string, string> = {
  National: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800",
  Regional: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800",
  Company:  "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
};

export function HolidaySelectionDialog({
  open,
  onOpenChange,
  onSubmit,
  existingDates = [],
}: HolidaySelectionDialogProps) {
  const [selectedDates, setSelectedDates]         = useState<Date[]>([]);
  const [holidayName, setHolidayName]             = useState("");
  const [holidayType, setHolidayType]             = useState("National");
  const [isRecurring, setIsRecurring]             = useState(false);
  const [applicableRegions, setApplicableRegions] = useState("All");

  const removeDate = (idx: number) =>
    setSelectedDates(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = () => {
    if (!holidayName.trim()) {
      toast.error("Please enter a holiday name");
      return;
    }
    if (selectedDates.length === 0) {
      toast.error("Please select at least one date");
      return;
    }

    const holidays = selectedDates.map(date => ({
      name:               holidayName.trim(),
      date:               format(date, "yyyy-MM-dd"),
      day_of_week:        format(date, "EEEE"),
      type:               holidayType as Holiday["type"],
      is_recurring:       isRecurring,
      applicable_regions: applicableRegions,
    }));

    onSubmit(holidays);
    resetForm();
  };

  const resetForm = () => {
    setSelectedDates([]);
    setHolidayName("");
    setHolidayType("National");
    setIsRecurring(false);
    setApplicableRegions("All");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        if (!v) resetForm();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 gap-0 border-violet-200 dark:border-violet-900">

        {/* Purple header */}
        <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-r from-violet-600 to-purple-700 rounded-t-lg shrink-0">
          <DialogTitle className="text-white text-xl flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" />
            Add Holiday Days
          </DialogTitle>
          <DialogDescription className="text-violet-200">
            Click days to select them. Shift-click to fill a range. All selected dates share the same name and type.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 px-6 py-5">
          <div className="space-y-5">

            {/* ── Name + Type ────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
              <HolidayNameInput value={holidayName} onChange={setHolidayName} />
              <HolidayTypeSelect value={holidayType} onValueChange={setHolidayType} />
            </div>

            {/* ── Regions + Recurring ────────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="regions">Applicable Regions</Label>
                <select
                  id="regions"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                  value={applicableRegions}
                  onChange={e => setApplicableRegions(e.target.value)}
                >
                  <option value="All">All regions</option>
                  <option value="North">North</option>
                  <option value="South">South</option>
                  <option value="East">East</option>
                  <option value="West">West</option>
                  <option value="HO">Head Office only</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Recurring Holiday</Label>
                <div className="flex items-center gap-3 h-10 px-3 rounded-md border border-input bg-background">
                  <Switch
                    checked={isRecurring}
                    onCheckedChange={setIsRecurring}
                    className="data-[state=checked]:bg-violet-600"
                  />
                  <span className="text-sm text-muted-foreground">
                    {isRecurring ? "Repeats every year" : "One-time only"}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* ── Main layout: calendar left, chips right ─────── */}
            <div className="grid grid-cols-[auto_1fr] gap-6 items-start">

              {/* Calendar */}
              <div className="rounded-xl border border-violet-100 dark:border-violet-900 bg-violet-50/30 dark:bg-violet-950/20 p-4 min-w-[260px]">
                <HolidayDatePicker
                  selected={selectedDates}
                  onChange={setSelectedDates}
                  existingDates={existingDates}
                />
              </div>

              {/* Selected chips panel */}
              <div className="space-y-3 min-h-[280px]">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">
                    Selected
                    <span className={cn(
                      "ml-2 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold",
                      selectedDates.length > 0
                        ? "bg-violet-600 text-white"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {selectedDates.length}
                    </span>
                  </Label>
                  {selectedDates.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedDates([])}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                {selectedDates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 rounded-xl border border-dashed border-violet-200 dark:border-violet-800 text-muted-foreground gap-2">
                    <CalendarPlus className="h-8 w-8 text-violet-300 dark:text-violet-700" />
                    <p className="text-xs text-center">
                      Click dates on the calendar<br />to add them here
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-56 pr-2">
                    <div className="flex flex-col gap-1.5">
                      {selectedDates.map((date, i) => (
                        <div
                          key={date.toISOString()}
                          className={cn(
                            "flex items-center justify-between px-3 py-2 rounded-lg border text-sm",
                            TYPE_BADGE[holidayType] ?? TYPE_BADGE.National
                          )}
                        >
                          <div>
                            <span className="font-medium">{format(date, "EEE, MMM d, yyyy")}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeDate(i)}
                            className="ml-2 rounded-full hover:opacity-70 transition-opacity shrink-0"
                            aria-label={`Remove ${format(date, "MMM d")}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                {/* Holiday name preview label */}
                {selectedDates.length > 0 && holidayName && (
                  <p className="text-xs text-muted-foreground">
                    Will be saved as <span className="font-semibold text-violet-700 dark:text-violet-300">"{holidayName}"</span> ({holidayType})
                  </p>
                )}
              </div>
            </div>

          </div>
        </ScrollArea>

        <Separator />
        <DialogFooter className="px-6 py-4 flex items-center justify-between shrink-0">
          <span className="text-xs text-muted-foreground">
            {selectedDates.length === 0
              ? "No dates selected"
              : `${selectedDates.length} date${selectedDates.length !== 1 ? "s" : ""} will be saved`}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={selectedDates.length === 0 || !holidayName.trim()}
              className="bg-violet-600 hover:bg-violet-700 gap-2"
            >
              <CalendarPlus className="h-4 w-4" />
              Save {selectedDates.length > 0 ? `${selectedDates.length} ` : ""}
              Holiday{selectedDates.length !== 1 ? "s" : ""}
            </Button>
          </div>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}