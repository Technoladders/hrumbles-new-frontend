import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from 'react-modal';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils"; // Add this import
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
  const [popoverOpen, setPopoverOpen] = useState(false); // Local state for popover open
  const [isAnalysisModalOpen, setAnalysisModalOpen] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [jobSearchQuery, setJobSearchQuery] = useState(""); // For filtering jobs
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

  // Filter jobs based on search query
  const filteredJobs = jobs.filter((job) =>
    job.title.toLowerCase().includes(jobSearchQuery.toLowerCase())
  );

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
    // navigate(`/jobs/${result.job_id}`);
    navigate(`/resume-analysis/${result.job_id}/${result.candidate_id}?talentId=${result.candidate_id}`);
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

  const customModalStyles = {
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // A slightly darker, more modern overlay
    zIndex: 50, // Must be higher than the sticky header's z-index (30)
  },
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    transform: 'translate(-50%, -50%)',
    maxWidth: '500px',
    width: '90%',
    border: 'none',
    borderRadius: '0.75rem', // 12px
    padding: '1.5rem', // 24px
    boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    zIndex: 51, // Must be higher than the overlay
    background: 'white',
  },
};

  return (
    <Modal isOpen={isOpen} onRequestClose={onClose} style={customModalStyles} ariaHideApp={false}>
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-semibold">Compare Candidate with Job</h2>
        <p className="text-sm text-gray-600">Select a job to analyse this candidate's resume against the job description.</p>
        
        {/* Searchable Job Selector */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={popoverOpen}
              className="w-full justify-between"
              onClick={() => setPopoverOpen(true)} // Force open on click
            >
              {selectedJobId
                ? jobs.find((job) => job.id === selectedJobId)?.title
                : "Select a job..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput
                placeholder="Search job by title..."
                value={jobSearchQuery}
                onValueChange={setJobSearchQuery}
              />
              <CommandEmpty>No job found.</CommandEmpty>
              <CommandList className="max-h-[calc(40vh-4rem)]">
                <CommandGroup>
                  {filteredJobs.map((job) => (
                    <CommandItem
                      key={job.id}
                      value={job.title.toLowerCase()}
                      onSelect={() => {
                        setSelectedJobId(job.id);
                        setJobSearchQuery(""); // Clear search on select
                        setPopoverOpen(false); // Close popover after select
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedJobId === job.id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {job.title}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleStartAnalysis} disabled={!selectedJobId}>Analyse</Button>
        </div>
      </div>
    </Modal>
  );
};

export default CompareWithJobDialog;