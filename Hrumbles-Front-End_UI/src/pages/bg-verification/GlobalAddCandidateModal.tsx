// src/pages/jobs/ai/GlobalAddCandidateModal.tsx

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AiResumeUpload } from './AiResumeUpload';
import { AiCandidateReviewForm } from './AiCandidateReviewForm';
import { AddCandidateJobSelectModal } from './AddCandidateJobSelectModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import { useSelector } from 'react-redux';

const BUCKET_NAME = 'candidate_resumes'; // Use the correct bucket
const FOLDER_NAME = 'bgv-resumes';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalAddCandidateModal = ({ isOpen, onClose }: Props) => {
  const [step, setStep] = useState<'upload' | 'review' | 'selectJob'>('upload');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [reviewedData, setReviewedData] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const user = useSelector((state: any) => state.auth.user);
  const organizationId = useSelector((state: any) => state.auth.organization_id);

  const handleAnalysisComplete = (data: any, file: File) => {
    setReviewedData(data);
    setResumeFile(file);
    setStep('review');
  };

  const handleReviewComplete = (data: any) => {
    setReviewedData(data);
    setStep('selectJob');
  };

  const handleFinalSave = async (jobId: string) => {
    if (!resumeFile || !reviewedData) {
      return toast.error("Critical data missing. Please start over.");
    }
    setIsSaving(true);
    try {
      const sanitizedFileName = resumeFile.name.replace(/[\[\]\+\s]+/g, '_');
      const uniqueFileName = `${uuidv4()}-${sanitizedFileName}`;
      const filePath = `${FOLDER_NAME}/${uniqueFileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, resumeFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(uploadData.path);

      await supabase.rpc('add_candidate_to_job', {
        p_job_id: jobId,
        p_organization_id: organizationId,
        p_user_id: user.id,
        p_candidate_data: reviewedData,
        p_resume_url: urlData.publicUrl,
        p_resume_text: reviewedData.resumeText,
      });

      toast.success(`Candidate ${reviewedData.candidate_name} saved and assigned successfully!`);
      handleClose(); // This will call the parent's onClose and reset state
    } catch (err: any) {
      toast.error("Failed to save candidate", { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setStep('upload');
    setResumeFile(null);
    setReviewedData(null);
    onClose();
  };

  // --- RENDER LOGIC MOVED INSIDE THE MAIN RETURN ---
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        {step === 'upload' && (
          <AiResumeUpload onAnalysisComplete={handleAnalysisComplete} />
        )}
        {step === 'review' && (
          <AiCandidateReviewForm
            jobData={reviewedData}
            onReviewComplete={handleReviewComplete}
            onBack={() => setStep('upload')}
          />
        )}
        {step === 'selectJob' && (
          <AddCandidateJobSelectModal
            onJobSelected={handleFinalSave}
            onClose={handleClose}
            onBack={() => setStep('review')}
            isSaving={isSaving}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};