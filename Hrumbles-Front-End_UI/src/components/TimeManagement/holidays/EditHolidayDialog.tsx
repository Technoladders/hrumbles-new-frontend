import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { Holiday } from "@/types/time-tracker-types";
import { HolidayNameInput } from "./HolidayNameInput";
import { HolidayTypeSelect } from "./HolidayTypeSelect";
import { format, parseISO } from "date-fns";

interface EditHolidayDialogProps {
  holiday: Holiday | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, patch: Partial<Pick<Holiday, "name" | "type" | "is_recurring" | "applicable_regions">>) => Promise<void>;
}

export function EditHolidayDialog({ holiday, open, onOpenChange, onSave }: EditHolidayDialogProps) {
  const [name, setName]                     = useState("");
  const [type, setType]                     = useState<Holiday["type"]>("National");
  const [isRecurring, setIsRecurring]       = useState(false);
  const [applicableRegions, setApplicableRegions] = useState("All");
  const [isSaving, setIsSaving]             = useState(false);

  useEffect(() => {
    if (holiday) {
      setName(holiday.name);
      setType(holiday.type);
      setIsRecurring(holiday.is_recurring);
      setApplicableRegions(holiday.applicable_regions ?? "All");
    }
  }, [holiday]);

  const handleSave = async () => {
    if (!holiday) return;
    setIsSaving(true);
    await onSave(holiday.id, { name, type, is_recurring: isRecurring, applicable_regions: applicableRegions });
    setIsSaving(false);
    onOpenChange(false);
  };

  if (!holiday) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 gap-0 border-violet-200 dark:border-violet-900">
        <DialogHeader className="px-6 pt-6 pb-4 bg-gradient-to-r from-violet-600 to-purple-700 rounded-t-lg">
          <DialogTitle className="text-white text-lg flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Edit Holiday
          </DialogTitle>
          <DialogDescription className="text-violet-200">
            {holiday.day_of_week},{" "}
            {format(parseISO(holiday.date), "MMMM d, yyyy")}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-6 space-y-5">
          <HolidayNameInput value={name} onChange={setName} />
          <HolidayTypeSelect value={type} onValueChange={v => setType(v as Holiday["type"])} />

          <div className="space-y-2">
            <Label>Applicable Regions</Label>
            <select
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

          <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-input bg-background">
            <div>
              <p className="text-sm font-medium">Recurring holiday</p>
              <p className="text-xs text-muted-foreground">Repeats on the same date every year</p>
            </div>
            <Switch
              checked={isRecurring}
              onCheckedChange={setIsRecurring}
              className="data-[state=checked]:bg-violet-600"
            />
          </div>
        </div>

        <Separator />
        <DialogFooter className="px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {isSaving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}