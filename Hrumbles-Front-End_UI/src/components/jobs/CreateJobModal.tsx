// CreateJobModal.tsx

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/jobs/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/jobs/ui/dialog";
import { Briefcase, Building, UserCheck, ArrowLeft, Users, ChevronRight } from "lucide-react";
import { JobStepperForm } from "./job/JobStepperForm";
import { JobData } from "@/lib/types";
import { useSelector } from "react-redux";

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  editJob?: JobData | null;
  onSave?: (job: JobData) => void;
}

type ViewState = 'SELECT_JOB_TYPE' | 'SELECT_INTERNAL_TYPE' | 'SHOW_STEPPER';

const ITECH_ORGANIZATION_ID = [
  "1961d419-1272-4371-8dc7-63a4ec71be83",
  "4d57d118-d3a2-493c-8c3f-2cf1f3113fe9",
];

export const CreateJobModal = ({ isOpen, onClose, editJob = null, onSave }: CreateJobModalProps) => {
  const [view, setView] = useState<ViewState>('SELECT_JOB_TYPE');
  const [jobType, setJobType] = useState<"Internal" | "External" | null>(null);
  const [internalType, setInternalType] = useState<"Inhouse" | "Client Side" | null>(null);

  const organizationId = useSelector((state: any) => state.auth.organization_id);

  const fullReset = useCallback(() => {
    setView('SELECT_JOB_TYPE');
    setJobType(null);
    setInternalType(null);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (editJob) {
        setJobType(editJob.jobType || "Internal");
        if (editJob.jobType === "Internal") {
          setInternalType(
          (editJob.submissionType === "Client" || editJob.submissionType === "Client Side")
            ? "Client Side"
            : "Inhouse"
        );
        }
        setView('SHOW_STEPPER');
      } else if (Array.isArray(ITECH_ORGANIZATION_ID) && ITECH_ORGANIZATION_ID.includes(organizationId)) {
        setJobType("Internal");
        setInternalType("Inhouse");
        setView('SHOW_STEPPER');
      } else {
        fullReset();
      }
    } else {
      fullReset();
    }
  }, [isOpen, editJob, organizationId, fullReset]);

  const handleJobTypeSelect = (type: "Internal" | "External") => {
    setJobType(type);
    setView(type === 'Internal' ? 'SELECT_INTERNAL_TYPE' : 'SHOW_STEPPER');
  };

  const handleInternalTypeSelect = (type: "Inhouse" | "Client Side") => {
    setInternalType(type);
    setView('SHOW_STEPPER');
  };

  const handleBack = () => {
    if (view === 'SELECT_INTERNAL_TYPE') {
      setView('SELECT_JOB_TYPE');
      setJobType(null);
    }
  };

  const handleBackFromStepper = () => {
    setView(jobType === 'Internal' ? 'SELECT_INTERNAL_TYPE' : 'SELECT_JOB_TYPE');
  };
  
  const handleSaveJob = (job: JobData) => {
    if (onSave) onSave(job);
  };

  const SelectionCard = ({ label, description, icon, onClick }: { label: string; description: string; icon: React.ReactNode; onClick: () => void; }) => (
    <button onClick={onClick} className="group flex flex-col items-center justify-center border rounded-xl text-center transition-all duration-300 w-96 p-8 min-h-[180px] hover:border-gray-400 hover:shadow-lg">
      {icon}
      <h3 className="font-semibold text-xl mt-4">{label}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </button>
  );

    const HeaderButton = ({ label, icon }: { label: string; icon: React.ReactNode; }) => (
    <div className="flex items-center justify-center p-3 border-2 rounded-lg text-center bg-blue-50/50 border-blue-500 w-48">
      {icon}
      <span className="font-medium">{label}</span>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
    console.log(
      "%c[DEBUG] Radix onOpenChange → new state:",
      "color: magenta; font-weight: bold",
      open
    );
    if (!open) {
      console.log("%c[DEBUG] Radix trying to CLOSE the modal", "color: red; font-weight: bold");
      onClose();
    }
  }}>
      <DialogContent className="sm:max-w-6xl w-11/12 max-h-[90vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="sticky top-0 z-10 bg-background pt-6 pb-4 text-center">
          <DialogTitle className="text-2xl text-purple-600 font-bold">{editJob ? "Edit Job" : "Create New Job"}</DialogTitle>
          <DialogDescription>Fill in the required information to create a new job</DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto px-6 pb-6">
          {/* View 1: Initial Selection */}
          <div className={`transition-all duration-500 ease-in-out overflow-hidden ${view === 'SELECT_JOB_TYPE' ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="flex justify-center gap-8 py-8">
              <SelectionCard label="Internal" description="A position in your organization" icon={<Briefcase className="h-10 w-10 text-blue-600" />} onClick={() => handleJobTypeSelect('Internal')} />
              <SelectionCard label="External" description="A position for one of your clients" icon={<Users className="h-10 w-10 text-green-600" />} onClick={() => handleJobTypeSelect('External')} />
            </div>
          </div>

          {/* View 2: Internal Sub-selection */}
          <div className={`transition-all duration-500 ease-in-out overflow-hidden ${view === 'SELECT_INTERNAL_TYPE' ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="flex items-center justify-center p-4 border-2 border-blue-500 rounded-lg w-72 bg-blue-50/50">
                <Briefcase className="h-8 w-8 text-blue-600" />
                <h3 className="font-semibold text-xl ml-4">Internal</h3>
              </div>
              <div className="flex items-center justify-center gap-4 text-gray-400">
                <div className="w-24 h-px bg-gray-300" />
                <span>SELECT TYPE</span>
                <div className="w-24 h-px bg-gray-300" />
              </div>
              <p className="text-center text-gray-600 text-lg font-medium mb-6">Is this an in-house position or for a client?</p>
              <div className="flex justify-center items-center gap-12">
                <button onClick={() => handleInternalTypeSelect('Inhouse')} className="group flex flex-col items-center justify-center border rounded-xl text-center transition-all duration-300 w-96 p-8 min-h-[180px] hover:border-gray-400 hover:shadow-lg">
                  <Building className="h-10 w-10 text-indigo-600" />
                  <h3 className="font-semibold text-xl mt-4">Inhouse</h3>
                  <p className="text-sm text-gray-500 mt-1">A position within your own company.</p>
                </button>
                <div className="h-16 w-px bg-gray-300" />
                <button onClick={() => handleInternalTypeSelect('Client Side')} className="group flex flex-col items-center justify-center border rounded-xl text-center transition-all duration-300 w-96 p-8 min-h-[180px] hover:border-gray-400 hover:shadow-lg">
                  <UserCheck className="h-10 w-10 text-teal-600" />
                  <h3 className="font-semibold text-xl mt-4">Client Side</h3>
                  <p className="text-sm text-gray-500 mt-1">An internal resource assigned to a client project.</p>
                </button>
              </div>
            </div>
            <div className="flex justify-start pt-4">
              <Button variant="outline" onClick={handleBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
            </div>
          </div>

          {/* View 3: Stepper Form */}
          <div className={`transition-all duration-500 ease-in-out ${view === 'SHOW_STEPPER' ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
            {view === 'SHOW_STEPPER' && (
            <div key="v3" className="animate-slide-up">
              {!editJob && (
                <div className="flex items-center justify-center gap-4 mb-6">
                  {jobType === 'Internal' ? (
                    <>
                      <HeaderButton label="Internal" icon={<Briefcase className="mr-3 h-5 w-5 text-blue-600" />} />
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                      <HeaderButton label={internalType!} icon={internalType === 'Inhouse' ? <Building className="mr-3 h-5 w-5 text-indigo-600" /> : <UserCheck className="mr-3 h-5 w-5 text-teal-600" />} />
                    </>
                  ) : (
                    <HeaderButton label="External" icon={<Users className="mr-3 h-5 w-5 text-green-600" />} />
                  )}
                </div>
              )}
              <JobStepperForm
                jobType={jobType as "Internal" | "External"}
                internalType={internalType}
                onBack={editJob ? onClose : handleBackFromStepper}
                editJob={editJob}
                onSave={handleSaveJob}
              />
            </div>
          )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};