
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Project } from "@/types/project-types";

interface ProjectTimeFormProps {
  projects: Project[];
  projectTime: {[key: string]: number};
  updateProjectTime: (projectId: string, hours: number) => void;
  projectReports: {[key: string]: string};
  updateProjectReport: (projectId: string, report: string) => void;
  disabled: boolean;
  totalAllocatedTime: number;
}

export function ProjectTimeForm({
  projects,
  projectTime,
  updateProjectTime,
  projectReports,
  updateProjectReport,
  disabled,
  totalAllocatedTime
}: ProjectTimeFormProps) {
  const [projectEntries, setProjectEntries] = useState<{
    projectId: string;
    hours: number;
    report: string;
  }[]>([{ projectId: "", hours: 0, report: "" }]);

  const handleAddProject = () => {
    setProjectEntries([...projectEntries, { projectId: "", hours: 0, report: "" }]);
  };

  const handleRemoveProject = (index: number) => {
    const newEntries = [...projectEntries];
    const removedEntry = newEntries[index];
    
    // Update the total allocated time and remove project data
    if (removedEntry.projectId) {
      updateProjectTime(removedEntry.projectId, 0);
      updateProjectReport(removedEntry.projectId, "");
    }
    
    newEntries.splice(index, 1);
    setProjectEntries(newEntries);
  };

  const handleProjectChange = (index: number, projectId: string) => {
    const newEntries = [...projectEntries];
    
    // If there was a previous project selected, reset its time and report
    if (newEntries[index].projectId) {
      updateProjectTime(newEntries[index].projectId, 0);
      updateProjectReport(newEntries[index].projectId, "");
    }
    
    newEntries[index].projectId = projectId;
    setProjectEntries(newEntries);
    
    // Update the time for the new project
    updateProjectTime(projectId, newEntries[index].hours);
  };

  const handleReportChange = (index: number, report: string) => {
    const newEntries = [...projectEntries];
    newEntries[index].report = report;
    setProjectEntries(newEntries);
    
    // Update project report if a project is selected
    if (newEntries[index].projectId) {
      updateProjectReport(newEntries[index].projectId, report);
    }
  };

  const handleHoursChange = (index: number, hours: string) => {
    const numericHours = parseFloat(hours) || 0;
    const newEntries = [...projectEntries];
    newEntries[index].hours = numericHours;
    setProjectEntries(newEntries);
    
    // Update the total allocated time
    if (newEntries[index].projectId) {
      updateProjectTime(newEntries[index].projectId, numericHours);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">Project Time Allocation</h3>
        <div className="text-sm">
          Total Allocated: <span className={totalAllocatedTime > 8 ? "text-red-500 font-bold" : "font-medium"}>{totalAllocatedTime}</span> hours
          {totalAllocatedTime > 8 && <span className="text-red-500 ml-1">(exceeds limit)</span>}
        </div>
      </div>

      {projectEntries.map((entry, index) => (
        <div key={index} className="space-y-3 p-3 border rounded-md">
          <div className="flex justify-between">
            <h4 className="text-sm font-medium">Project {index + 1}</h4>
            {index > 0 && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleRemoveProject(index)}
                disabled={disabled}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            )}
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Project</label>
            <Select 
              value={entry.projectId} 
              onValueChange={(value) => handleProjectChange(index, value)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name} - {project.client}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Project Report</label>
            <textarea 
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="What did you work on for this project?"
              value={entry.report}
              onChange={(e) => handleReportChange(index, e.target.value)}
              disabled={disabled || !entry.projectId}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Hours Spent</label>
            <Input
              type="number"
              min="0"
              step="0.5"
              placeholder="Hours"
              value={entry.hours || ""}
              onChange={(e) => handleHoursChange(index, e.target.value)}
              disabled={disabled || !entry.projectId}
              className="w-full"
            />
          </div>
        </div>
      ))}

      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleAddProject}
        disabled={disabled || projectEntries.some(entry => !entry.projectId)}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Another Project
      </Button>
      
      {totalAllocatedTime > 8 && (
        <p className="text-sm text-red-500">Total allocated time exceeds the 8-hour workday limit. Please adjust your hours.</p>
      )}
    </div>
  );
}

