
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { Holiday, OfficialHolidayInsert } from "@/types/time-tracker-types";
import { HolidayNameInput } from "./HolidayNameInput";
import { HolidayTypeSelect } from "./HolidayTypeSelect";
import { SelectedDatesDisplay } from "./SelectedDatesDisplay";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [holidayName, setHolidayName] = useState("");
  const [holidayType, setHolidayType] = useState("National");
  const [isCheckingDates, setIsCheckingDates] = useState(false);

  const handleSelectDate = async (dates: Date[] | undefined) => {
    if (!dates) return;
    
    setSelectedDates(dates);
    
    const existingDates = selectedDates;
    const newDates = dates.filter(date => !existingDates.some(existing => 
      format(existing, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
    ));

    if (newDates.length > 0) {
      setIsCheckingDates(true);
      
      for (const date of newDates) {
        const formattedDate = format(date, "yyyy-MM-dd");
        
        try {
          // Using a raw query approach to avoid TypeScript issues
          const { data } = await supabase
            .rpc('is_date_holiday', { check_date: formattedDate });

          if (data === true) {
            toast.warning(`${format(date, "MMMM d, yyyy")} is already marked as a holiday`);
          }
        } catch (error) {
          console.error("Error checking date:", error);
        }
      }
      
      setIsCheckingDates(false);
    }
  };

  const removeDate = (index: number) => {
    const newDates = [...selectedDates];
    newDates.splice(index, 1);
    setSelectedDates(newDates);
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
      name: holidayName,
      date: format(date, "yyyy-MM-dd"),
      day_of_week: format(date, "EEEE"),
      type: holidayType,
      is_recurring: false
    }));

    onSubmit(holidays);
    resetForm();
  };

  const resetForm = () => {
    setSelectedDates([]);
    setHolidayName("");
    setHolidayType("National");
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Holiday Days</DialogTitle>
          <DialogDescription>
            Select multiple days to mark as holidays. These will be visible on all employee calendars.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <HolidayNameInput value={holidayName} onChange={setHolidayName} />
          
          <HolidayTypeSelect value={holidayType} onValueChange={setHolidayType} />
          
          <div className="grid gap-2">
            <Label>Select Dates</Label>
            <Calendar
              mode="multiple"
              selected={selectedDates}
              onSelect={handleSelectDate}
              className="rounded-md border"
              initialFocus
              disabled={isCheckingDates}
            />
          </div>
          
          <SelectedDatesDisplay dates={selectedDates} onRemoveDate={removeDate} />
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isCheckingDates || selectedDates.length === 0}
          >
            Add {selectedDates.length} Holiday{selectedDates.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
