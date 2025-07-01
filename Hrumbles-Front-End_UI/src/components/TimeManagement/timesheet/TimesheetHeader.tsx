import React from 'react';
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TimesheetHeaderProps {
  employeeId: string;
  onAddTimesheet: () => void;
  employeeHasProjects?: boolean;
}

export const TimesheetHeader: React.FC<TimesheetHeaderProps> = ({
  employeeId,
  onAddTimesheet,
  employeeHasProjects
}) => {
  return (
    <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-primary">
          <FileText className="h-6 w-6" />
          My Timesheets
        </h1>
        <p className="text-muted-foreground">
          Manage and submit your timesheets
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        {employeeHasProjects && (
          <Button onClick={onAddTimesheet}>
            <Plus className="h-4 w-4 mr-2" />
            Add Timesheet
          </Button>
        )}
      </div>
    </div>
  );
};