
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface HolidayHeaderProps {
  onAddHolidayClick: () => void;
}

export const HolidayHeader = ({ onAddHolidayClick }: HolidayHeaderProps) => {
  return (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Official Holidays</h1>
        <p className="text-muted-foreground">
          Manage company holidays and special days
        </p>
      </div>
      <Button className="gap-2" onClick={onAddHolidayClick}>
        <Plus className="h-4 w-4" />
        Add Holiday
      </Button>
    </div>
  );
};
