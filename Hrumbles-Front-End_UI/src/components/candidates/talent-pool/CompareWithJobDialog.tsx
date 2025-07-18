import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from 'react-modal';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ResumeAnalysisModal from '@/components/jobs/ResumeAnalysisModal'; 

interface CompareWithJobDialogProps {
  isOpen: boolean;
  onClose: () => void;
  candidateId: string;
}

interface Job {
  id: string;
  title: string;
}

const CompareWithJobDialog = ({ isOpen, onClose, candidateId }: CompareWithJobDialogProps) => {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isAnalysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const navigate = useNavigate();

  // Fetch all jobs for the dropdown
  const { data: jobs = [] } = useQuery({
    queryKey: ['allJobs'],
    queryFn: async (): Promise<Job[]> => {
      const { data, error } = await supabase.from('hr_jobs').select('id, title');
      if (error) throw error;
      return data;
    },
  });

  // Fetch the candidate's full resume text when the dialog opens
  useEffect(() => {
    if (isOpen && candidateId) {
      const fetchResumeText = async () => {
        const { data, error } = await supabase
          .from('hr_talent_pool')
          .select('resume_text')
          .eq('id', candidateId)
          .single();

        if (error || !data) {
          toast.error("Could not fetch candidate's resume.");
        } else {
          setResumeText(data.resume_text);
        }
      };
      fetchResumeText();
    }
  }, [isOpen, candidateId]);

  const handleStartAnalysis = () => {
    if (!selectedJobId) {
      toast.error('Please select a job to compare against.');
      return;
    }
    if (!resumeText) {
      toast.error('Candidate resume data is missing.');
      return;
    }
    setAnalysisModalOpen(true);
  };
  
  const handleAnalysisComplete = (result: any) => {
    setAnalysisModalOpen(false);
    onClose();
    toast.success(`Analysis complete for ${result.candidate_name}.`);
    // Navigate to the job view to see the new candidate in the list
    navigate(`/jobs/${result.job_id}`);
  };

  if (isAnalysisModalOpen && selectedJobId) {
    // We reuse your existing powerful modal. We just need to feed it the right initial data.
    return (
      <ResumeAnalysisModal
        jobId={selectedJobId}
        onClose={() => setAnalysisModalOpen(false)}
        setError={(msg) => toast.error(msg)}
        onAnalysisComplete={handleAnalysisComplete}
        // Pre-fill the modal with the candidate's resume and ID
        initialData={{
          resume_text: resumeText,
          candidate_id: candidateId // Pass the existing ID to link the analysis
        }}
      />
    );
  }

  return (
    <Modal isOpen={isOpen} onRequestClose={onClose} style={{ content: { maxWidth: '500px', margin: 'auto' } }}>
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-semibold">Compare Candidate with Job</h2>
        <p className="text-sm text-gray-600">Select a job to analyse this candidate's resume against the job description.</p>
        
        <Select onValueChange={setSelectedJobId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a job..." />
          </SelectTrigger>
          <SelectContent>
            {jobs.map((job) => (
              <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleStartAnalysis} disabled={!selectedJobId}>Analyse</Button>
        </div>
      </div>
    </Modal>
  );
};

export default CompareWithJobDialog;