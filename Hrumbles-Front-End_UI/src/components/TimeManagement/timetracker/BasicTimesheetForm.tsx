
import { Input } from "@/components/ui/input";

interface BasicTimesheetFormProps {
  title: string;
  setTitle: (title: string) => void;
  notes: string;
  setNotes: (notes: string) => void;
  totalWorkingHours: number;
  handleTotalWorkingHoursChange: (value: string) => void;
  disabled?: boolean;
}

export function BasicTimesheetForm({
  title,
  setTitle,
  notes,
  setNotes,
  totalWorkingHours,
  handleTotalWorkingHoursChange,
  disabled = false
}: BasicTimesheetFormProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Title</label>
        <Input
          placeholder="Enter timesheet title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Work Report</label>
        <textarea 
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="What are you working on?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={disabled}
          rows={3}
        />
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Total Working Hours</label>
        <Input
          type="number"
          min="0.5"
          step="0.5"
          placeholder="Hours"
          value={totalWorkingHours}
          onChange={(e) => handleTotalWorkingHoursChange(e.target.value)}
          disabled={disabled}
          className="w-full"
        />
      </div>
    </div>
  );
}
