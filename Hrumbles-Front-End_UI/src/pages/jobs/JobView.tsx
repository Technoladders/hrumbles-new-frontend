import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, FileText, Eye, UserPlus, ChevronDown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { getJobById } from "@/services/jobService";
import { getCandidatesByJobId } from "@/services/candidateService";
import JobDetailView from "@/components/jobs/job/JobDetailView";
import { Candidate } from "@/lib/types";
import AddCandidateDrawer from "@/components/jobs/job/candidate/AddCandidateDrawer";
import Modal from 'react-modal';

// --- FIX: This import path has been corrected to match your file structure ---
import AddCandidateModal from '@/components/candidates/talent-pool/AddCandidateModal'; 
import ResumeUploadModal from '@/components/ui/ResumeUploadModal'; 

const JobView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // --- STATE MANAGEMENT ---
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isAddCandidateDrawerOpen, setIsAddCandidateDrawerOpen] = useState(false);
  
  // State to control the newly integrated AddCandidateModal
  const [isAddTalentPoolModalOpen, setIsAddTalentPoolModalOpen] = useState(false);
  
  const [error, setError] = useState<string | null>(null);

  // --- DATA FETCHING (tanstack/react-query) ---
  // Fetch job details
  const { 
    data: job, 
    isLoading: jobLoading, 
    error: jobError,
    refetch: refetchJob
  } = useQuery({
    queryKey: ['job', id],
    queryFn: () => getJobById(id || ""),
    enabled: !!id,
  });
  
  // Fetch candidates associated with this job
  const { 
    data: candidatesData = [],
    refetch: refetchCandidates
  } = useQuery({
    queryKey: ['job-candidates', id],
    queryFn: () => getCandidatesByJobId(id || ""),
    enabled: !!id,
  });

  // Fetch analysis history data for the history modal
  const { 
    data: historyData = [],
    isLoading: historyLoading,
    refetch: refetchHistory
  } = useQuery({
    queryKey: ['job-history', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resume_analysis')
        .select(`
          candidate_id,
          candidate_name,
          overall_score,
          updated_at,
          created_by,
          hr_employees!resume_analysis_created_by_fkey (
            first_name,
            last_name
          )
        `)
        .eq('job_id', id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // --- DATA TRANSFORMATION ---
  const candidates: Candidate[] = candidatesData.map(candidate => ({
    id: candidate.id,
    name: candidate.name,
    status: candidate.status,
    experience: candidate.experience,
    matchScore: candidate.matchScore,
    appliedDate: candidate.appliedDate,
    skills: candidate.skills || []
  }));

  // --- REAL-TIME SUBSCRIPTIONS (useEffect) ---
  useEffect(() => {
    if (!id) return;
    const channel = supabase.channel('job-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'hr_jobs', filter: `id=eq.${id}` }, () => { refetchJob(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, refetchJob]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase.channel('candidate-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'hr_job_candidates', filter: `job_id=eq.${id}` }, () => { refetchCandidates(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, refetchCandidates]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase.channel('resume-analysis-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'resume_analysis', filter: `job_id=eq.${id}` }, () => { refetchHistory(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, refetchHistory]);

  // --- HANDLER FUNCTIONS ---
  // Handles closing the new modal and refreshing data
  const handleTalentPoolCandidateAdded = () => {
    setIsAddTalentPoolModalOpen(false);
    refetchCandidates();
    toast.success("Candidate processed and added to Talent Pool!");
  };

  // Handles closing the manual drawer and refreshing data
  const handleManualCandidateAdded = () => {
    setIsAddCandidateDrawerOpen(false);
    refetchCandidates();
    toast.success("Candidate added successfully");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };
  
  // --- RENDER LOGIC ---
  if (jobLoading) {
    return (
      <div className="flex justify-center items-center h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (jobError || !job) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <h2 className="text-2xl font-bold mb-4">Job not found</h2>
        <p className="text-gray-500 mb-6">The job you're looking for doesn't exist or has been removed.</p>
        <Button className="flex items-center gap-2" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
          Back to Jobs
        </Button>
      </div>
    );
  }
  
   return (
    <div className="space-y-6 py-4">
      <div className="flex items-center justify-between mb-4">
        {/* Header: Back Button and Job Title */}
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-xl font-semibold">{job.title}</h1>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Link to={`/jobs/${job.id}/description`}>
            <Button variant="outline" className="flex items-center gap-2">
              <FileText size={16} />
              <span className="hidden sm:inline">Job Description</span>
            </Button>
          </Link>

          {/* Main Dropdown for All Candidate Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default">
                Add Candidate
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent 
              align="end" 
              className="w-64 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl p-2"
            >
              <DropdownMenuItem 
                onSelect={() => setIsAddCandidateDrawerOpen(true)}
                className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors focus:bg-slate-100 dark:focus:bg-slate-800"
              >
                <UserPlus className="h-5 w-5 mt-1 text-purple-500" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">Add Manually</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Enter candidate details one by one.</p>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />

              <DropdownMenuItem 
  onSelect={() => setIsAddTalentPoolModalOpen(true)}
  // --- THIS IS THE FIX ---
  // This disables the button if the job is loading or has no skills
  disabled={jobLoading || !job} 
  className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors focus:bg-slate-100 dark:focus:bg-slate-800"
>
  <FileText className="h-5 w-5 mt-1 text-blue-500" />
  <div>
    <p className="font-semibold text-slate-800 dark:text-slate-100">Analyse Resume</p>
    <p className="text-xs text-slate-500 dark:text-slate-400">Paste or upload resumes for AI parsing.</p>
  </div>
</DropdownMenuItem>
              
              <DropdownMenuItem 
                onSelect={() => setIsHistoryModalOpen(true)}
                className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors focus:bg-slate-100 dark:focus:bg-slate-800"
              >
                <Clock className="h-5 w-5 mt-1 text-green-500" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">View Analysis History</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">See past resume analysis scores.</p>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content: Job Details and Candidate List */}
      <JobDetailView 
        job={job} 
        candidates={candidates} 
        onCandidateAdded={handleManualCandidateAdded} 
      />
      
      {/* --- MODALS & DRAWERS --- */}

      <AddCandidateDrawer 
        job={job} 
        onCandidateAdded={handleManualCandidateAdded}
        open={isAddCandidateDrawerOpen}
        onOpenChange={setIsAddCandidateDrawerOpen}
      />
      
       {isAddTalentPoolModalOpen && job && (
  <ResumeUploadModal
    isOpen={isAddTalentPoolModalOpen}
    onClose={() => setIsAddTalentPoolModalOpen(false)}
    onCandidateAdded={handleTalentPoolCandidateAdded}
    job={job} // <-- THIS IS THE CRUCIAL FIX
  />
)}
      

      {isHistoryModalOpen && (
        <Modal 
          isOpen={true} 
          onRequestClose={() => setIsHistoryModalOpen(false)}
          style={{ 
            content: { 
              maxWidth: '600px', 
              margin: 'auto',
              maxHeight: '80vh',
              overflowY: 'auto',
              zIndex: 1000,
            },
            overlay: {
        zIndex: 999, // Overlay just below content
      } 
          }}
        >
          <div className="p-4">
            <h2 className="text-xl font-semibold mb-4">Candidate Analysis History</h2>
            
            {historyLoading ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : historyData.length === 0 ? (
              <p className="text-gray-500 text-center">No analysis history available</p>
            ) : (
              <div className="space-y-6">
                {historyData.map((item: any, index: number) => (
                  <div key={item.candidate_id} className="relative">
                    {index !== historyData.length - 1 && (
                      <div className="absolute left-3 top-8 w-0.5 h-full bg-gray-200 -z-10" />
                    )}
                    
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-white" />
                      </div>

                      <div className="flex-1 pb-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {item.candidate_name || 'Unknown Candidate'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatDate(item.updated_at)}
                            </p>
                            <p className="text-sm text-gray-500">
                              Added by {item.hr_employees?.first_name} {item.hr_employees?.last_name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              Score: {item.overall_score}%
                            </span>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigate(`/resume-analysis/${id}/${item.candidate_id}`)}
                              className="text-purple-600 hover:text-purple-800"
                            >
                              <Eye size={16} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <Button 
              className="mt-4" 
              onClick={() => setIsHistoryModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default JobView;