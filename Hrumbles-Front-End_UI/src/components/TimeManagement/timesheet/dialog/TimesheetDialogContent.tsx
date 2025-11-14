import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProjectAllocationForm } from './ProjectAllocationForm';
import { StandardTimesheetForm } from '../StandardTimesheetForm';
import { DetailedTimesheetEntry } from '@/types/time-tracker-types';
import { useProjectData } from '@/hooks/TimeManagement/useProjectData';

interface TimesheetDialogContentProps {
  // ========================================
  // NEW: Add Dialog control props
  // ========================================
  open: boolean;
  onOpenChange: (open: boolean) => void;
  
  // Existing props
  date: Date;
  setDate: (date: Date) => void;
  detailedEntries: DetailedTimesheetEntry[];
  setDetailedEntries: React.Dispatch<React.SetStateAction<DetailedTimesheetEntry[]>>;
  projectEntries: { projectId: string; clockIn?: string; clockOut?: string; hours: number; report: string }[];
  setProjectEntries: React.Dispatch<React.SetStateAction<{ projectId: string; clockIn?: string; clockOut?: string; hours: number; report: string }[]>>;
  employeeHasProjects: boolean;
  isSubmitting: boolean;
  handleClose: () => void;
  handleSubmit: (title: string, workReport: string) => void;
  employeeId: string;
  hrProjectEmployees: any[];
  clockIn: string | undefined;
  setClockIn: React.Dispatch<React.SetStateAction<string | undefined>>;
  clockOut: string | undefined;
  setClockOut: React.Dispatch<React.SetStateAction<string | undefined>>;
}

export const TimesheetDialogContent: React.FC<TimesheetDialogContentProps> = ({
  // Destructure Dialog props
  open,
  onOpenChange,
  
  // Existing props
  date,
  setDate,
  detailedEntries,
  setDetailedEntries,
  projectEntries,
  setProjectEntries,
  employeeHasProjects,
  isSubmitting,
  handleClose,
  handleSubmit,
  employeeId,
  hrProjectEmployees,
  clockIn,
  setClockIn,
  clockOut,
  setClockOut,
}) => {
  const { projects, loading } = useProjectData();
  const [projectReports, setProjectReports] = useState<{ [key: string]: string }>({});
  const [title, setTitle] = useState("");
  const [workReport, setWorkReport] = useState("");

  console.log("employeehasproject", employeeHasProjects)
  

  const updateProjectTimeAllocation = (projectId: string, hours: number) => {
    // This logic is handled in ProjectAllocationForm
  };

  const updateProjectReport = (projectId: string, report: string) => {
    setProjectReports((prev) => ({
      ...prev,
      [projectId]: report,
    }));
  };

  // Fixed infinite loop issue
  useEffect(() => {
    if (employeeHasProjects && Object.keys(projectReports).length > 0) {
      const updatedEntries = projectEntries.map((entry) => ({
        ...entry,
        report: projectReports[entry.projectId] || entry.report || "",
      }));
      
      // Only update if something actually changed
      const hasChanges = updatedEntries.some((entry, index) => 
        entry.report !== projectEntries[index]?.report
      );
      
      if (hasChanges) {
        setProjectEntries(updatedEntries);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectReports, employeeHasProjects]);

  // ========================================
  // NEW: Wrap everything in Dialog component
  // ========================================
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Timesheet</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new timesheet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {employeeHasProjects ? (
            <ProjectAllocationForm
              date={date}
              setDate={setDate}
              projectEntries={projectEntries}
              setProjectEntries={setProjectEntries}
              projects={projects}
              updateProjectTimeAllocation={updateProjectTimeAllocation}
              updateProjectReport={updateProjectReport}
              employeeId={employeeId}
              hrProjectEmployees={hrProjectEmployees}
              clockIn={clockIn}
              setClockIn={setClockIn}
              clockOut={clockOut}        
              setClockOut={setClockOut}
            />
          ) : (
            <StandardTimesheetForm
              detailedEntries={detailedEntries}
              setDetailedEntries={setDetailedEntries}
              totalWorkingHours={8}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={() => handleSubmit(title, workReport)}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Timesheet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};