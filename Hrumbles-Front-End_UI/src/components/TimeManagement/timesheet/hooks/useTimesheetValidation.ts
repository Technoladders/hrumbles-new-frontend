import { toast } from "@/hooks/use-toast";
import { DetailedTimesheetEntry } from "@/types/time-tracker-types";

interface ValidationProps {
  employeeHasProjects: boolean;
  projectEntries: { projectId: string; hours: number; report: string }[];
  detailedEntries: DetailedTimesheetEntry[];
}

export const useTimesheetValidation = () => {
  const validateForm = ({
    employeeHasProjects,
    projectEntries,
    detailedEntries,
  }: ValidationProps): boolean => {
    if (employeeHasProjects) {
      const validProjectEntries = projectEntries.filter(p => p.projectId);

      if (validProjectEntries.length === 0) {
        toast({
          title: "Missing information",
          description: "Please add at least one project",
          variant: "destructive"
        });
        return false;
      }

      

      // Removed 8-hour validation for project entries
    } else if (detailedEntries.length > 0) {
      // Removed 8-hour validation for detailed entries
    }

    return true;
  };

  return { validateForm };
};
