import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface HolidaySelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (holidays: Omit<Holiday, "id" | "created_at" | "updated_at">[]) => void;
}

export function HolidaySelectionDialog({
  open,
  onOpenChange,
  onSubmit,
}: HolidaySelectionDialogProps) {
  const [selectedDates, setSelectedDates]   = useState<Date[]>([]);
  const [holidayName, setHolidayName]       = useState("");
  const [holidayType, setHolidayType]       = useState("National");
  const [isRecurring, setIsRecurring]       = useState(false);
  const [applicableRegions, setApplicableRegions] = useState("All");

  const removeDate = (index: number) => {
    setSelectedDates(prev => prev.filter((_, i) => i !== index));
  };

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
      <DialogContent className="sm:max-w-[680px] max-h-[90vh] flex flex-col p-0 gap-0 border-violet-200 dark:border-violet-900">
        {/* Purple header */}
        <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-r from-violet-600 to-purple-700 rounded-t-lg">
          <DialogTitle className="text-white text-xl flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" />
            Add Holiday Days
          </DialogTitle>
          <DialogDescription className="text-violet-200">
            Select multiple dates and configure holiday details. All selections share the same name and type.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-6">
          <div className="space-y-6">
            {/* Name + Type row */}
            <div className="grid grid-cols-2 gap-4">
              <HolidayNameInput value={holidayName} onChange={setHolidayName} />
              <HolidayTypeSelect value={holidayType} onValueChange={setHolidayType} />
            </div>

            {/* Advanced options */}
            <div className="grid grid-cols-2 gap-4">
              {/* Applicable regions */}
              <div className="space-y-2">
                <Label htmlFor="regions">Applicable Regions</Label>
                <select
                  id="regions"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

              {/* Recurring toggle */}
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

            {/* Calendar */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Select Dates{" "}
                <span className="text-muted-foreground font-normal">
                  (click multiple)
                </span>
              </Label>
              <Calendar
                mode="multiple"
                selected={selectedDates.length > 0 ? selectedDates : undefined}
                onSelect={(dates) => setSelectedDates(Array.isArray(dates) ? dates : [])}
                className="rounded-xl border border-violet-100 dark:border-violet-900 w-full"
              />
            </div>

            {/* Selected dates chips */}
            {selectedDates.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">
                  Selected ({selectedDates.length}) — {holidayName || "Unnamed holiday"}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {[...selectedDates]
                    .sort((a, b) => a.getTime() - b.getTime())
                    .map((date, i) => (
                      <Badge
                        key={date.toISOString()}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 border",
                          holidayType === "National"
                            ? "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300"
                            : holidayType === "Regional"
                            ? "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300"
                            : "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300"
                        )}
                      >
                        <span className="text-xs">{format(date, "EEE, MMM d")}</span>
                        <button
                          type="button"
                          onClick={() => removeDate(selectedDates.indexOf(date))}
                          className="rounded-full hover:opacity-70 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />
        <DialogFooter className="px-6 py-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {selectedDates.length === 0
              ? "No dates selected"
              : `${selectedDates.length} date${selectedDates.length !== 1 ? "s" : ""} will be added`}
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
              Add {selectedDates.length > 0 ? `${selectedDates.length} ` : ""}Holiday{selectedDates.length !== 1 ? "s" : ""}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}