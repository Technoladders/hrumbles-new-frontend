import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Calendar as CalendarIcon, Clock } from "lucide-react";
import { Project } from "@/types/project-types";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// Interface definitions remain unchanged
interface ProjectEntry {
  projectId: string;
  hours: number;
  report: string;
  clientId?: string;
}

interface HrProjectEmployee {
  assign_employee: string;
  client_id: string;
  id: string;
  project_id: string;
  working_hours: number;
}

interface ProjectAllocationFormProps {
  date: Date;
  setDate: (date: Date) => void;
  projectEntries: ProjectEntry[];
  setProjectEntries: React.Dispatch<React.SetStateAction<ProjectEntry[]>>;
  projects: Project[];
  updateProjectTimeAllocation?: (projectId: string, hours: number) => void;
  updateProjectReport?: (projectId: string, report: string) => void;
  employeeId: string;
  hrProjectEmployees: HrProjectEmployee[];
  clockIn?: string;
  setClockIn: (clockIn: string | undefined) => void;
  clockOut?: string;
  setClockOut: (clockOut: string | undefined) => void;
}

// All logic and functions remain unchanged
export const ProjectAllocationForm = ({
  date,
  setDate,
  projectEntries,
  setProjectEntries,
  projects,
  updateProjectTimeAllocation,
  updateProjectReport,
  employeeId,
  hrProjectEmployees,
  clockIn,
  setClockIn,
  clockOut,
  setClockOut,
}: ProjectAllocationFormProps) => {
  const [expandedReports, setExpandedReports] = useState<{ [key: string]: boolean }>({});

  const filteredProjects = useMemo(() => {
    const assignedProjectIds = hrProjectEmployees
      .filter((pe) => pe?.assign_employee === employeeId)
      .map((pe) => pe.project_id);
    return projects.filter((project) => assignedProjectIds.includes(project.id));
  }, [projects, hrProjectEmployees, employeeId]);

  const totalAllowedHours = useMemo(() => {
    return hrProjectEmployees
      .filter((pe) => pe.assign_employee === employeeId)
      .reduce((sum, pe) => sum + pe.working_hours, 0);
  }, [hrProjectEmployees, employeeId]);

  React.useEffect(() => {
    if (projectEntries.length === 0 && filteredProjects.length > 0) {
      const initialEntries = filteredProjects.map((project) => ({
        projectId: project.id,
        hours: 0,
        report: "",
        clientId: hrProjectEmployees.find((pe) => pe.project_id === project.id)?.client_id,
      }));
      setProjectEntries(initialEntries);
    }
  }, [filteredProjects, projectEntries.length, setProjectEntries, hrProjectEmployees]);

  const handleHoursChange = (projectId: string, hours: string) => {
    const numericHours = hours === "" ? 0 : parseFloat(hours) || 0;
    const projectEmployee = hrProjectEmployees.find((pe) => pe.project_id === projectId);
    const maxHours = projectEmployee ? projectEmployee.working_hours : Infinity;
    const validatedHours = Math.min(numericHours, maxHours);

    const newEntries = projectEntries.map((entry) =>
      entry.projectId === projectId ? { ...entry, hours: validatedHours } : entry
    );
    setProjectEntries(newEntries);

    setExpandedReports((prev) => ({
      ...prev,
      [projectId]: validatedHours > 0,
    }));

    if (updateProjectTimeAllocation) {
      updateProjectTimeAllocation(projectId, validatedHours);
    }
  };

  const handleReportChange = (projectId: string, report: string) => {
    const newEntries = projectEntries.map((entry) =>
      entry.projectId === projectId ? { ...entry, report } : entry
    );
    setProjectEntries(newEntries);

    if (updateProjectReport) {
      updateProjectReport(projectId, report);
    }
  };

  const toggleReport = (projectId: string) => {
    setExpandedReports((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  };

  const totalProjectHours = projectEntries.reduce((sum, entry) => sum + entry.hours, 0);

  // ==================================================================
  // START OF UI CHANGES: The JSX below is updated for the new design.
  // ==================================================================
  return (
    <div className="space-y-6">
      {/* Date and Time Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Date Input */}
        <div className="w-full md:w-auto flex-grow">
          <Label htmlFor="date">Date</Label>
          <div className="relative">
            <Input
              id="date"
              type="date"
              value={date.toISOString().split('T')[0]}
              onChange={(e) => setDate(new Date(e.target.value))}
              className="pl-10"
            />
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Clock In/Out Inputs */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <Label htmlFor="clockIn">Clock In</Label>
            <Input
              id="clockIn"
              type="time"
              value={clockIn || ""}
              onChange={(e) => setClockIn(e.target.value || undefined)}
              className="pl-10"
            />
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          <div className="relative">
            <Label htmlFor="clockOut">Clock Out</Label>
            <Input
              id="clockOut"
              type="time"
              value={clockOut || ""}
              onChange={(e) => setClockOut(e.target.value || undefined)}
              className="pl-10"
            />
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Project Allocation Header */}
      <div className="flex justify-between items-center mt-4 pt-4 border-t">
        <h3 className="font-semibold text-lg">
          Project Allocation <span className="text-red-500">*</span>
        </h3>
        <div className="text-right">
          <span className="text-sm text-muted-foreground">Total Hours: </span>
          <span
            className={`font-bold text-lg ${totalProjectHours > totalAllowedHours ? "text-red-500" : ""}`}
          >
            {totalProjectHours.toFixed(2)} / {totalAllowedHours.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Project Cards */}
      <div className="space-y-3">
        {filteredProjects.map((project) => {
          const entry = projectEntries.find((e) => e.projectId === project.id) || {
            hours: 0,
            report: "",
          };
          const isReportExpanded = expandedReports[project.id] || false;
          const projectEmployee = hrProjectEmployees.find((pe) => pe.project_id === project.id);
          const maxHours = projectEmployee ? projectEmployee.working_hours : 0;

          return (
            <div key={project.id} className="bg-white border rounded-lg p-4 transition-all">
              <div className="flex items-center justify-between gap-4">
                {/* Project Name and Allocation */}
                <div className="flex-1">
                  <h4 className="font-semibold text-base">
                    {project.name}
                    <span className="text-sm text-gray-500 font-normal ml-2">
                      (Allocated: {maxHours.toFixed(2)} hrs)
                    </span>
                  </h4>
                </div>

                {/* Hours Input and Toggle Button */}
                <div className="flex items-center gap-2">
                  <div className="w-28">
                    <Label htmlFor={`hours-${project.id}`} className="sr-only">Hours</Label>
                    <Input
                      id={`hours-${project.id}`}
                      type="number"
                      min="0"
                      step="0.25"
                      value={entry.hours === 0 ? "" : entry.hours}
                      onChange={(e) => handleHoursChange(project.id, e.target.value)}
                      placeholder="Hours"
                    />
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => toggleReport(project.id)}
                    className="flex-shrink-0"
                  >
                    {isReportExpanded ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Validation Message */}
              {entry.hours > maxHours && (
                <p className="text-sm text-red-500 mt-2">
                  Exceeds allocated hours ({maxHours.toFixed(2)}).
                </p>
              )}

              {/* Collapsible Work Summary */}
              {isReportExpanded && (
                <div className="mt-4">
                  <Label htmlFor={`project-report-${project.id}`} className="font-medium">Work Summary</Label>
                  <Textarea
                    id={`project-report-${project.id}`}
                    value={entry.report}
                    onChange={(e) => handleReportChange(project.id, e.target.value)}
                    placeholder={`Describe your work on ${project.name}...`}
                    className="mt-2 min-h-[80px] resize-none"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

       {/* Global Validation Message */}
      {totalProjectHours > totalAllowedHours && (
        <p className="text-sm text-red-500 text-center pt-2">
          Total hours exceed the total allocated hours. Please adjust your allocations.
        </p>
      )}
    </div>
  );
};