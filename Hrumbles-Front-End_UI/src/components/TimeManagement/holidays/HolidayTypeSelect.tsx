
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HolidayTypeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function HolidayTypeSelect({ value, onValueChange }: HolidayTypeSelectProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="holiday-type">Holiday Type</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id="holiday-type">
          <SelectValue placeholder="Select type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="National">National</SelectItem>
          <SelectItem value="Regional">Regional</SelectItem>
          <SelectItem value="Company">Company</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
