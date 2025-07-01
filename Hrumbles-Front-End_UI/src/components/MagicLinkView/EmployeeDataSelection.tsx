
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { FileCheck, UserCheck, Briefcase, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DataSharingOptions {
  personalInfo: boolean;
  contactInfo: boolean;
  documentsInfo: boolean;
  workInfo: boolean;
  // activityInfo: boolean;
  // assignedInfo: boolean;
  skillinfo: boolean;
}

interface EmployeeDataSelectionProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (options: DataSharingOptions) => void;
  defaultOptions?: Partial<DataSharingOptions>;
}

const EmployeeDataSelection: React.FC<EmployeeDataSelectionProps> = ({
  open,
  onClose,
  onConfirm,
  defaultOptions
}) => {
  const [options, setOptions] = React.useState<DataSharingOptions>({
    personalInfo: defaultOptions?.personalInfo ?? true,
    contactInfo: defaultOptions?.contactInfo ?? true,
    documentsInfo: defaultOptions?.documentsInfo ?? true,
    workInfo: defaultOptions?.workInfo ?? false,
    // activityInfo: defaultOptions?.activityInfo ?? false,
    // assignedInfo: defaultOptions?.assignedInfo ?? false,
    skillinfo: defaultOptions?.skillinfo ?? false,
  });

  const handleConfirm = () => {
    onConfirm(options);
    onClose();
  };

  const toggleOption = (option: keyof DataSharingOptions) => {
    setOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  const renderCheckboxItem = (
    id: keyof DataSharingOptions,
    label: string,
    description: string,
    icon: React.ReactNode
  ) => (
    <div className={cn(
      "flex items-start space-x-3 p-3 border rounded-lg",
      options[id] ? "bg-indigo-50 border-indigo-200" : "bg-white border-gray-200"
    )}>
      <Checkbox
        id={id}
        checked={options[id]}
        onCheckedChange={() => toggleOption(id)}
        className="mt-1"
      />
      <div className="flex-1">
        <div className="flex items-center">
          {icon}
          <label
            htmlFor={id}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ml-2"
          >
            {label}
          </label>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Data to Share</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-2">
          <p className="text-sm text-muted-foreground mb-2">
            Select which information you would like to include in the shared link:
          </p>
          
          {renderCheckboxItem(
            "personalInfo",
            "Personal Information",
            "Name, role, department, status, and other basic details",
            <UserCheck className="h-4 w-4 text-indigo-500" />
          )}
          
          {renderCheckboxItem(
            "contactInfo",
            "Contact Information",
            "Email, phone number, and location details",
            <UserCheck className="h-4 w-4 text-indigo-500" />
          )}
          
          {renderCheckboxItem(
            "documentsInfo",
            "Document Information",
            "Aadhar, PAN, UAN, and ESIC numbers and verification status",
            <FileText className="h-4 w-4 text-indigo-500" />
          )}
          
          {renderCheckboxItem(
            "skillinfo",
            "Skill Information",
            "Job Skill and Skill Ratings",
            <Briefcase className="h-4 w-4 text-indigo-500" />
          )}
          
          {/* {renderCheckboxItem(
            "assignedInfo",
            "Assignment Information",
            "Reporting manager, HR contact, and team details",
            <FileCheck className="h-4 w-4 text-indigo-500" />
          )}
          
          {renderCheckboxItem(
            "activityInfo",
            "Activity Information",
            "Recent activities and history log",
            <FileCheck className="h-4 w-4 text-indigo-500" />
          )} */}
        </div>

        <Separator />
        
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} className="bg-indigo-600 hover:bg-indigo-700">
            Generate Magic Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeDataSelection;
