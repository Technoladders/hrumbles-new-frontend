
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DetailedEntry {
  title: string;
  hours: number;
  description: string;
}

interface DetailedTimesheetEntriesProps {
  entries: DetailedEntry[];
  totalWorkingHours: number;
  onEntriesChange: (entries: DetailedEntry[]) => void;
}

export function DetailedTimesheetEntries({
  entries,
  totalWorkingHours,
  onEntriesChange
}: DetailedTimesheetEntriesProps) {
  const [error, setError] = useState<string | null>(null);

  const addEntry = () => {
    onEntriesChange([...entries, { title: "", hours: 0, description: "" }]);
  };

  const removeEntry = (index: number) => {
    onEntriesChange(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: keyof DetailedEntry, value: string | number) => {
    const newEntries = [...entries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    
    const totalDetailedHours = newEntries.reduce((sum, entry) => sum + Number(entry.hours), 0);
    
    if (totalDetailedHours > totalWorkingHours) {
      setError(`Total detailed hours (${totalDetailedHours}h) cannot exceed total working hours (${totalWorkingHours}h)`);
    } else {
      setError(null);
    }
    
    onEntriesChange(newEntries);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Detailed Time Entries</h3>
        <Button 
          onClick={addEntry} 
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Add Entry
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {entries.map((entry, index) => (
          <div key={index} className="p-4 border rounded-lg space-y-4 bg-muted/5">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Entry {index + 1}</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeEntry(index)}
                className="text-destructive hover:text-destructive/90"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4">
              <div>
                <Label htmlFor={`title-${index}`}>Title</Label>
                <Input
                  id={`title-${index}`}
                  value={entry.title}
                  onChange={(e) => updateEntry(index, "title", e.target.value)}
                  placeholder="What did you work on?"
                />
              </div>

              <div>
                <Label htmlFor={`hours-${index}`}>Hours</Label>
                <Input
                  id={`hours-${index}`}
                  type="number"
                  min="0"
                  step="0.5"
                  value={entry.hours}
                  onChange={(e) => updateEntry(index, "hours", parseFloat(e.target.value) || 0)}
                />
              </div>

              <div>
                <Label htmlFor={`description-${index}`}>Description</Label>
                <Textarea
                  id={`description-${index}`}
                  value={entry.description}
                  onChange={(e) => updateEntry(index, "description", e.target.value)}
                  placeholder="Describe the work done..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
