// src/components/jobs/job/steps/experience-skills/ExperienceSelector.tsx

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

const ExperienceSelector = ({ label, yearsValue, monthsValue, onYearChange, onMonthChange }: ExperienceSelectorProps) => {
  const years = Array.from({ length: 31 }, (_, i) => i); // 0-30 years
  const months = Array.from({ length: 12 }, (_, i) => i); // 0-11 months

  return (
    <div className="space-y-2">
      <Label>{label} <span className="text-red-500">*</span></Label>
      <div className="grid grid-cols-2 gap-2">
        <Select value={String(yearsValue || 0)} onValueChange={(val) => onYearChange(Number(val))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map(y => <SelectItem key={y} value={String(y)}>{y} Years</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(monthsValue || 0)} onValueChange={(val) => onMonthChange(Number(val))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map(m => <SelectItem key={m} value={String(m)}>{m} Months</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default ExperienceSelector;