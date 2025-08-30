
import { useState, useEffect } from "react";
import { Button } from "@/components/jobs/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/jobs/ui/dialog";
import { Briefcase, Users } from "lucide-react";
import { toast } from "sonner";
import { JobStepperForm } from "./job/JobStepperForm";
import { JobData } from "@/lib/types";
import { useSelector } from "react-redux";

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  editJob?: JobData | null;
  onSave?: (job: JobData) => void;
}

// MODIFICATION: Define a constant for the iTech organization ID for better readability
const ITECH_ORGANIZATION_ID = [
  "1961d419-1272-4371-8dc7-63a4ec71be83",
  "4d57d118-d3a2-493c-8c3f-2cf1f3113fe9",
];

export const CreateJobModal = ({ isOpen, onClose, editJob = null, onSave }: CreateJobModalProps) => {
  const [jobType, setJobType] = useState<"Internal" | "External" | null>(null);
  const [showStepper, setShowStepper] = useState(false);

    const organizationId = useSelector((state: any) => state.auth.organization_id);
  
  // Reset state when modal opens/closes or when switching between create and edit modes
   useEffect(() => {
    if (isOpen) {
      if (editJob) {
        // This is the existing logic for editing a job, which is correct.
        setJobType(editJob.jobType || "Internal");
        setShowStepper(true);
      } else if (Array.isArray(ITECH_ORGANIZATION_ID) && ITECH_ORGANIZATION_ID.includes(organizationId)) {
        // NEW LOGIC: If creating a new job for the specific iTech organization,
        // bypass the selection screen and go directly to the internal job form.
        setJobType("Internal");
        setShowStepper(true);
      } else {
        // For all other organizations, reset to show the selection screen.
        handleReset();
      }
    } else if (!isOpen) {
      // When the modal closes, reset everything. This is correct.
      handleReset();
    }
  }, [isOpen, editJob, organizationId]);
  
  const handleReset = () => {
    setJobType(null);
    setShowStepper(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };
  
  const handleJobTypeSelect = (type: "Internal" | "External") => {
    setJobType(type);
    setShowStepper(true);
  };

  const handleSaveJob = (job: JobData) => {
    if (onSave) {
      onSave(job);
    }
  };

   return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent 
        className={`${showStepper ? 'sm:max-w-4xl max-h-[90vh] overflow-y-auto' : 'sm:max-w-md'}`}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="sticky top-0 z-10 bg-background pb-4">
          <DialogTitle className="text-xl">
            {/* This title logic will now correctly show "Internal Job" for iTech users */}
            {!showStepper ? (editJob ? "Edit Job" : "Create New Job") : 
              `${jobType} Job`
            }
          </DialogTitle>
          <DialogDescription>
             {/* This description logic will also update correctly */}
            {!showStepper ? `Select the type of job you want to ${editJob ? 'edit' : 'create'}` : 
              `Fill in the required information to ${editJob ? 'update' : 'create a new'} job`
            }
          </DialogDescription>
        </DialogHeader>
        
        {/* MODIFICATION: This block is now automatically skipped for iTech users in create mode due to the useEffect logic */}
        {!jobType && !editJob && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6">
            <Button
              variant="cardButton"
              className={`group flex flex-col items-center justify-center h-40 p-6 border-2 transition-all hover:border-gray-300`}
              onClick={() => handleJobTypeSelect("Internal")}
            >
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Briefcase className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-medium text-center">Internal</h3>
              <p className="text-xs text-gray-500 group-hover:text-white mt-1 text-center whitespace-normal max-w-full">
                Create positions for your organization
              </p>
            </Button>
            
            <Button
              variant="cardButton"
              className={`group flex flex-col items-center justify-center h-40 p-6 border-2 transition-all hover:border-gray-300`}
              onClick={() => handleJobTypeSelect("External")}
            >
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-medium text-center">External</h3>
              <p className="text-xs text-gray-500 group-hover:text-white mt-1 text-center whitespace-normal max-w-full">
                Create positions for clients
              </p>
            </Button>
          </div>
        )}
        
        {showStepper && (
          <div className="overflow-y-auto max-h-[calc(90vh-150px)]">
            <JobStepperForm 
              jobType={jobType as "Internal" | "External"}
              onClose={handleClose}
              editJob={editJob}
              onSave={handleSaveJob}
            />
          </div>
        )}
        
        {!showStepper && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {jobType && (
              <Button variant="outline" onClick={handleReset}>
                Back
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
