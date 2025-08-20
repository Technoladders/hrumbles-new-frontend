// src/pages/jobs/ai/GlobalAddCandidateModal.tsx

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AiResumeUpload } from './AiResumeUpload';
import { AiCandidateReviewForm } from './AiCandidateReviewForm';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalAddCandidateModal = ({ isOpen, onClose }: Props) => {
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [parsedData, setParsedData] = useState<any | null>(null);
    const [resumeFile, setResumeFile] = useState<File | null>(null); 

  const handleAnalysisComplete = (data: any, file: File) => {
    // We don't need the file anymore at this stage as it's not being uploaded yet.
    // The resume text is inside the 'data' object.
    setParsedData(data);
    setResumeFile(file);
    setStep('review');
  };

  const handleCloseAndReset = () => {
    setStep('upload');
    setParsedData(null);
    setResumeFile(null);
    onClose(); // This calls the parent's onClose which should trigger a refetch
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseAndReset}>
      <DialogContent className="sm:max-w-2xl">
        {step === 'upload' && (
          <AiResumeUpload onAnalysisComplete={handleAnalysisComplete} />
        )}
        {step === 'review' && parsedData && (
          <AiCandidateReviewForm
            jobData={parsedData}
             resumeFile={resumeFile}
            onSaveComplete={handleCloseAndReset}
            onBack={() => setStep('upload')}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};