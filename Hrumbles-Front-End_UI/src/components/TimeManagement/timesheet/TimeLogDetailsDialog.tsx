import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TimeLogDetails } from './dialog/TimeLogDetails';
import { TimeLog } from "@/types/time-tracker-types";
import { Project } from '@/types/project-types';

interface TimeLogDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeLog: TimeLog;
  allProjects?: Project[];
  getProjectName?: (projectId: string | null) => string;
  onRegularizationRequest?: () => void;
}

export const TimeLogDetailsDialog: React.FC<TimeLogDetailsDialogProps> = ({
  open,
  onOpenChange,
  timeLog,
  allProjects,
  getProjectName,
  onRegularizationRequest
}) => {
  // Function to get project name from its ID
  const getProjectNameInternal = (projectId: string | null) => {
    // Use provided getProjectName function if available
    if (getProjectName) {
      return getProjectName(projectId);
    }
    
    // Otherwise use the default implementation
    if (!projectId || !allProjects) return "Unknown Project";
    const project = allProjects.find(p => p.id === projectId);
    return project ? project.name : "Unknown Project";
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Time Log Details</DialogTitle>
        </DialogHeader>
        <TimeLogDetails 
          timeLog={timeLog} 
          getProjectName={getProjectNameInternal}
          onRegularizationRequest={onRegularizationRequest}
        />
      </DialogContent>
    </Dialog>
  );
};
