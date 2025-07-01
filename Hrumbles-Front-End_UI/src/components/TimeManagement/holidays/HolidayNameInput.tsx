
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface HolidayNameInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function HolidayNameInput({ value, onChange }: HolidayNameInputProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="holiday-name">Holiday Name</Label>
      <Input
        id="holiday-name"
        placeholder="Enter holiday name"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      />
    </div>
  );
}
