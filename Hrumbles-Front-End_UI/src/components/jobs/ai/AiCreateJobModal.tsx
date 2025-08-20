import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { JobData } from "@/lib/types";
import { AiJobStepperForm } from "./AiJobStepperForm";
import { JobFormData } from "./hooks/useAiJobFormState";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (job: JobData) => void;
  initialAiData?: Partial<JobFormData> | null;
    editJob?: JobData | null;
}

export const AiCreateJobModal = ({ isOpen, onClose, onSave, initialAiData, editJob }: Props) => {

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Internal Job</DialogTitle>
          <DialogDescription>Fill in the details below. Fields marked with an asterisk (*) are required.</DialogDescription>
        </DialogHeader>
        <AiJobStepperForm
          onClose={onClose}
          onSave={onSave}
          initialAiData={initialAiData}
           editJob={editJob}
        />
      </DialogContent>
    </Dialog>
  );
};