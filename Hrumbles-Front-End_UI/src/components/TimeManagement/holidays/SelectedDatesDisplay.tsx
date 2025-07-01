
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { format } from "date-fns";

interface SelectedDatesDisplayProps {
  dates: Date[];
  onRemoveDate: (index: number) => void;
}

export function SelectedDatesDisplay({ dates, onRemoveDate }: SelectedDatesDisplayProps) {
  if (dates.length === 0) return null;

  return (
    <div className="grid gap-2">
      <Label>Selected Dates ({dates.length})</Label>
      <div className="flex flex-wrap gap-2">
        {dates.map((date, index) => (
          <Badge key={date.toISOString()} className="flex items-center gap-1">
            {format(date, "MMM d, yyyy")}
            <button
              type="button"
              onClick={() => onRemoveDate(index)}
              className="h-4 w-4 rounded-full text-primary-foreground hover:bg-primary/80"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
