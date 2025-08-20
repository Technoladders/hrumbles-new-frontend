import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Wand2, Edit } from "lucide-react";
import { JdAnalysisView } from "./JdAnalysisView";
import { JobFormData } from "./hooks/useAiJobFormState";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onModeSelect: (mode: 'ai' | 'manual', data?: Partial<JobFormData>) => void;
}

export const CreateJobChoiceModal = ({ isOpen, onClose, onModeSelect }: Props) => {
  const [view, setView] = useState<'choice' | 'ai_paste'>('choice');

  const handleAnalysisComplete = (data: Partial<JobFormData>) => {
    onModeSelect('ai', data);
  };

  const handleCloseAndReset = () => {
    setView('choice');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseAndReset}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create a New Job</DialogTitle>
          <DialogDescription>
            {view === 'choice' ? "How would you like to start?" : "Paste the job description for AI analysis."}
          </DialogDescription>
        </DialogHeader>

        {view === 'choice' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6">
            <Button variant="outline" className="h-36 flex flex-col gap-3" onClick={() => setView('ai_paste')}>
              <Wand2 className="h-10 w-10 text-purple-500" />
              <span className="font-semibold text-base">Create with JD</span>
            </Button>
            <Button variant="outline" className="h-36 flex flex-col gap-3" onClick={() => onModeSelect('manual')}>
              <Edit className="h-10 w-10 text-blue-500" />
              <span className="font-semibold text-base">Enter Manually</span>
            </Button>
          </div>
        )}

        {view === 'ai_paste' && (
          <JdAnalysisView onAnalysisComplete={handleAnalysisComplete} onBack={() => setView('choice')} />
        )}
      </DialogContent>
    </Dialog>
  );
};