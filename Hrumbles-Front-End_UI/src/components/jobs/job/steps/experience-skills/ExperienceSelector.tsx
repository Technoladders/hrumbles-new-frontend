
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ExperienceSelectorProps {
  label: string;
  yearsValue: number;
  monthsValue: number;
  onYearChange: (value: number) => void;
  onMonthChange: (value: number) => void;
  minYear?: number;
  minMonth?: number;
  isMinimum?: boolean;
}

const ExperienceSelector = ({
  label,
  yearsValue,
  monthsValue,
  onYearChange,
  onMonthChange,
  minYear = 0,
  minMonth = 0,
  isMinimum = false,
}: ExperienceSelectorProps) => {
  // Generate years array for dropdowns (0-20 years)
  const years = Array.from({ length: 21 }, (_, i) => i);
  const months = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="space-y-4">
      <Label>{label} <span className="text-red-500">*</span></Label>
      <div className="flex gap-4">
        <div className="w-1/2">
          <Select
            value={yearsValue.toString()}
            onValueChange={(value) => onYearChange(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Years" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem
                  key={`${isMinimum ? 'min' : 'max'}-year-${year}`}
                  value={year.toString()}
                  disabled={!isMinimum && year < minYear}
                >
                  {year} {year === 1 ? "Year" : "Years"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-1/2">
          <Select
            value={monthsValue.toString()}
            onValueChange={(value) => onMonthChange(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Months" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem
                  key={`${isMinimum ? 'min' : 'max'}-month-${month}`}
                  value={month.toString()}
                  disabled={!isMinimum && yearsValue === minYear && month < minMonth}
                >
                  {month} {month === 1 ? "Month" : "Months"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default ExperienceSelector;
