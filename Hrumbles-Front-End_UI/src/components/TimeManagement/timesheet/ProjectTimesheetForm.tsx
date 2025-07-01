
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash } from "lucide-react";
import { Project } from '@/types/project-types';
import { useProjectData } from '@/hooks/useProjectData';

interface ProjectTimesheetFormProps {
  projectEntries: {projectId: string; hours: number; report: string}[];
  setProjectEntries: React.Dispatch<React.SetStateAction<{projectId: string; hours: number; report: string}[]>>;
  totalWorkingHours: number;
}

export const ProjectTimesheetForm: React.FC<ProjectTimesheetFormProps> = ({
  projectEntries,
  setProjectEntries,
  totalWorkingHours
}) => {
  const { projects, loading, refetchData } = useProjectData();
  
  // Calculate total hours allocated to projects
  const totalAllocatedHours = projectEntries.reduce((sum, entry) => sum + entry.hours, 0);
  
  useEffect(() => {
    // Fetch the latest project data when the component mounts
    refetchData();
  }, []);
  
  const handleAddProject = () => {
    setProjectEntries([...projectEntries, { projectId: '', hours: 0, report: '' }]);
  };
  
  const handleRemoveProject = (index: number) => {
    const newEntries = [...projectEntries];
    newEntries.splice(index, 1);
    setProjectEntries(newEntries);
  };
  
  const handleProjectChange = (index: number, field: string, value: string | number) => {
    const newEntries = [...projectEntries];
    newEntries[index] = { ...newEntries[index], [field]: value };
    setProjectEntries(newEntries);
  };
  
  // Filter out projects that have already been selected
  const getAvailableProjects = (currentIndex: number) => {
    const selectedProjectIds = projectEntries
      .map((entry, i) => i !== currentIndex ? entry.projectId : null)
      .filter(Boolean);
    
    return projects.filter(project => !selectedProjectIds.includes(project.id));
  };

  useEffect(() => {
    // Initialize with a single empty project entry if there are none yet
    if (projectEntries.length === 0) {
      setProjectEntries([{ projectId: '', hours: 0, report: '' }]);
    }
  }, []);

  if (loading) {
    return <div className="py-4 text-center text-sm text-gray-500">Loading projects...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Label className="text-base font-medium">Project Allocation</Label>
        <div className="text-sm">
          Total Hours: 
          <span 
            className={totalAllocatedHours > totalWorkingHours ? "text-red-500 ml-1 font-medium" : "ml-1 font-medium"}
          >
            {totalAllocatedHours} / {totalWorkingHours}
          </span>
        </div>
      </div>
      
      {projectEntries.map((entry, index) => (
        <div key={index} className="border rounded-md p-4 space-y-3">
          <div className="flex justify-between">
            <h4 className="font-medium">Project Entry #{index + 1}</h4>
            {projectEntries.length > 1 && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleRemoveProject(index)}
                className="h-8 px-2 text-red-500"
              >
                <Trash className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`project-${index}`}>Project</Label>
              <Select 
                value={entry.projectId}
                onValueChange={(value) => handleProjectChange(index, 'projectId', value)}
              >
                <SelectTrigger id={`project-${index}`}>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableProjects(index).map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} ({project.client})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor={`hours-${index}`}>Hours</Label>
              <Input
                id={`hours-${index}`}
                type="number"
                min="0"
                step="0.5"
                max={totalWorkingHours}
                value={entry.hours || ""}
                onChange={(e) => handleProjectChange(index, 'hours', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor={`report-${index}`}>Project Report</Label>
            <Textarea
              id={`report-${index}`}
              value={entry.report}
              onChange={(e) => handleProjectChange(index, 'report', e.target.value)}
              placeholder="Describe your work on this project"
              className="min-h-[80px]"
            />
          </div>
        </div>
      ))}
      
      <Button 
        variant="outline" 
        onClick={handleAddProject}
        disabled={projects.length === 0 || projectEntries.length >= projects.length || projectEntries.some(e => !e.projectId)}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Project
      </Button>
      
      {totalAllocatedHours > totalWorkingHours && (
        <p className="text-sm text-red-500">Total allocated time exceeds the working hours. Please adjust your allocations.</p>
      )}
    </div>
  );
};
