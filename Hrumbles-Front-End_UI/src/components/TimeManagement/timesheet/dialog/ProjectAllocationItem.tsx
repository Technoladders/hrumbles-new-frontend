
import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { Project } from "@/types/project-types";

interface ProjectAllocationItemProps {
  index: number;
  project: { projectId: string; hours: number };
  allProjects: Project[];
  selectedProjectIds: string[];
  onRemove: () => void;
  onProjectChange: (projectId: string) => void;
  onHoursChange: (hours: string) => void;
}

export const ProjectAllocationItem: React.FC<ProjectAllocationItemProps> = ({
  index,
  project,
  allProjects,
  selectedProjectIds,
  onRemove,
  onProjectChange,
  onHoursChange,
}) => {
  const availableProjects = allProjects.filter(
    p => p.id === project.projectId || !selectedProjectIds.includes(p.id)
  );

  return (
    <div className="grid grid-cols-[1fr,100px,40px] gap-2 items-center">
      <Select
        value={project.projectId}
        onValueChange={onProjectChange}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select project" />
        </SelectTrigger>
        <SelectContent>
          {availableProjects.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Input
        type="number"
        min="0"
        step="0.5"
        value={project.hours || ''}
        onChange={(e) => onHoursChange(e.target.value)}
        placeholder="Hours"
      />
      
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-10 w-10"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};
