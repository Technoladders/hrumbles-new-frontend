
import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface TimesheetFormFieldsProps {
  date: Date;
  setDate: (date: Date) => void;
  title: string;
  setTitle: (title: string) => void;
  totalWorkingHours: number;
  setTotalWorkingHours: (hours: number) => void;
  workReport: string;
  setWorkReport: (report: string) => void;
}

export const TimesheetFormFields: React.FC<TimesheetFormFieldsProps> = ({
  date,
  setDate,
  title,
  setTitle,
  totalWorkingHours,
  setTotalWorkingHours,
  workReport,
  setWorkReport
}) => {
  return (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date.toISOString().split('T')[0]}
            onChange={(e) => setDate(new Date(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="totalHours">Total Working Hours</Label>
          <Input
            id="totalHours"
            type="number"
            min="0"
            max="24"
            step="0.5"
            value={totalWorkingHours}
            onChange={(e) => setTotalWorkingHours(parseFloat(e.target.value))}
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="title">Timesheet Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter a title for this timesheet"
        />
      </div>
      
      <div>
        <Label htmlFor="workReport">Work Summary</Label>
        <Textarea
          id="workReport"
          value={workReport}
          onChange={(e) => setWorkReport(e.target.value)}
          placeholder="Describe your work"
          className="min-h-[80px]"
        />
      </div>
    </div>
  );
};
