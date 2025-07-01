import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { Project } from "@/types/project-types";
import { FormSectionHeader } from "./FormSectionHeader";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
  const [expandedReports, setExpandedReports] = React.useState<{ [key: string]: boolean }>({});

  const filteredProjects = useMemo(() => {
    const assignedProjectIds = hrProjectEmployees
      .filter((pe) => pe?.assign_employee === employeeId)
      .map((pe) => pe.project_id);
    return projects.filter((project) => assignedProjectIds.includes(project.id));
  }, [projects, hrProjectEmployees, employeeId]);

  // Calculate total allowed working hours from hrProjectEmployees
  const totalAllowedHours = useMemo(() => {
    return hrProjectEmployees
      .filter((pe) => pe.assign_employee === employeeId)
      .reduce((sum, pe) => sum + pe.working_hours, 0);
  }, [hrProjectEmployees, employeeId]);

  // Initialize projectEntries with all filtered projects if empty
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

    // Automatically open work summary if hours are positive, close if hours are 0
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

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date.toISOString().split('T')[0]}
            onChange={(e) => setDate(new Date(e.target.value))}
            className="h-8"
          />
        </div>
        <div className="w-35">
          <Label htmlFor="clockIn" className="text-xs">Clock In</Label>
          <Input
            id="clockIn"
            type="time"
            value={clockIn || ""}
            onChange={(e) => setClockIn(e.target.value || undefined)}
            className="h-8"
          />
        </div>
        <div className="w-35">
          <Label htmlFor="clockOut" className="text-xs">Clock Out</Label>
          <Input
            id="clockOut"
            type="time"
            value={clockOut || ""}
            onChange={(e) => setClockOut(e.target.value || undefined)}
            className="h-8"
          />
        </div>
      </div>

      <div className="flex justify-between items-center">
        <FormSectionHeader title="Project Allocation" required={true} />
        <div className="text-sm">
          Total Hours:{" "}
          <span
            className={totalProjectHours > totalAllowedHours ? "text-red-500 font-bold" : "font-medium"}
          >
            {totalProjectHours.toFixed(2)} / {totalAllowedHours.toFixed(2)}
          </span>
        </div>
      </div>

      {filteredProjects.map((project, index) => {
        const entry = projectEntries.find((e) => e.projectId === project.id) || {
          projectId: project.id,
          hours: 0,
          report: "",
          clientId: hrProjectEmployees.find((pe) => pe.project_id === project.id)?.client_id,
        };
        const isReportExpanded = expandedReports[project.id] || false;
        const projectEmployee = hrProjectEmployees.find((pe) => pe.project_id === project.id);
        const maxHours = projectEmployee ? projectEmployee.working_hours : 0;

        return (
          <div key={project.id} className="border rounded-md p-4 space-y-3">
            <div className="flex items-center gap-4">
              <h4 className="font-medium flex-1">
                {project.name || `Project ${index + 1}`}
                <span className="text-sm text-gray-500 ml-2">
                  (Allocated: {maxHours.toFixed(2)} hrs)
                </span>
              </h4>
              <div className="flex gap-2 items-center">
                <div className="w-24">
                  <Label htmlFor={`hours-${project.id}`} className="text-xs">Hours</Label>
                  <Input
                    id={`hours-${project.id}`}
                    type="number"
                    min="0"
                    step="0.25"
                    value={entry.hours === 0 ? "" : entry.hours}
                    onChange={(e) => handleHoursChange(project.id, e.target.value)}
                    placeholder="Hours"
                    className="h-8"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleReport(project.id)}
                  className="h-8 px-2"
                >
                  {isReportExpanded ? (
                    <Minus className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            {entry.hours > maxHours && (
              <p className="text-sm text-red-500">
                Hours ({entry.hours.toFixed(2)}) exceed allocated hours ({maxHours.toFixed(2)}) for this project.
              </p>
            )}
            {isReportExpanded && (
              <div>
                <Label htmlFor={`project-report-${project.id}`}>Work Summary</Label>
                <Textarea
                  id={`project-report-${project.id}`}
                  value={entry.report}
                  onChange={(e) => handleReportChange(project.id, e.target.value)}
                  placeholder="Describe what you worked on for this project"
                  className="mt-1 min-h-[80px]"
                />
              </div>
            )}
          </div>
        );
      })}

      {totalProjectHours > totalAllowedHours && (
        <p className="text-sm text-red-500">
          Total hours ({totalProjectHours.toFixed(2)}) exceed total allocated hours ({totalAllowedHours.toFixed(2)}). Please adjust your allocations.
        </p>
      )}
    </div>
  );
};