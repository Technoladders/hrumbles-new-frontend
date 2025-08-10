// src/components/jobs/job/experience-skills/ExperienceSelector.tsx

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ExperienceSelectorProps {
  label: string;
  yearsValue: number;
  monthsValue: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  isMinimum?: boolean;
  minYear?: number;
  minMonth?: number;
}

const ExperienceSelector = ({
  label,
  yearsValue,
  monthsValue,
  onYearChange,
  onMonthChange,
  isMinimum = false,
  minYear = 0,
  minMonth = 0,
}: ExperienceSelectorProps) => {
  const yearsOptions = Array.from({ length: 31 }, (_, i) => i); // 0 to 30 years
  const monthsOptions = Array.from({ length: 12 }, (_, i) => i); // 0 to 11 months

  const handleYearChange = (value: string) => {
    const year = parseInt(value, 10);
    onYearChange(year);

    // If this is the max experience selector, ensure it's not less than min
    if (!isMinimum) {
      const minTotalMonths = minYear * 12 + minMonth;
      const newMaxTotalMonths = year * 12 + monthsValue;
      if (newMaxTotalMonths < minTotalMonths) {
        onMonthChange(minMonth); // Adjust month if year change makes it invalid
      }
    }
  };

  const handleMonthChange = (value: string) => {
    const month = parseInt(value, 10);
    // If this is the max experience selector, ensure it's not less than min
    if (!isMinimum) {
      const minTotalMonths = minYear * 12 + minMonth;
      const newMaxTotalMonths = yearsValue * 12 + month;
      if (newMaxTotalMonths < minTotalMonths) {
        // This case is unlikely if the year is handled correctly, but it's a good safeguard.
        // We do nothing, as the user should increase the year first.
        return;
      }
    }
    onMonthChange(month);
  };

  return (
    <div className="space-y-2">
      <Label>{label} <span className="text-red-500">*</span></Label>
      <div className="grid grid-cols-2 gap-4">
        <Select
          value={yearsValue.toString()}
          onValueChange={handleYearChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Years" />
          </SelectTrigger>
          <SelectContent>
            {yearsOptions.map((year) => (
              <SelectItem
                key={year}
                value={year.toString()}
                disabled={!isMinimum && year < minYear} // Disable years less than min
              >
                {year} {year === 1 ? 'Year' : 'Years'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={monthsValue.toString()}
          onValueChange={handleMonthChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Months" />
          </SelectTrigger>
          <SelectContent>
            {monthsOptions.map((month) => (
              <SelectItem
                key={month}
                value={month.toString()}
                // Disable months if the selected year is the minimum year
                disabled={!isMinimum && yearsValue === minYear && month < minMonth}
              >
                {month} {month === 1 ? 'Month' : 'Months'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default ExperienceSelector;