import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, FileText, Eye, UserPlus, ChevronDown, Clock, Bookmark, Sparkles } from "lucide-react";
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
import AddCandidateDrawer, { CandidateFormData } from "@/components/jobs/job/candidate/AddCandidateDrawer";
import Modal from 'react-modal';
import AiCandidateFinalizeDrawer from "@/components/jobs/job/candidate/AiCandidateFinalizeDrawer";
import ResumeUploadModal from '@/components/ui/ResumeUploadModal'; 
import WishlistModal from '@/components/candidates/talent-pool/WishlistModal';

const JobView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // --- SIMPLIFIED STATE MANAGEMENT ---
  // For the manual "Add Candidate" drawer
  const [isAddCandidateDrawerOpen, setIsAddCandidateDrawerOpen] = useState(false);
 
  // For the AI "Resume Upload" modal
  const [isResumeUploadModalOpen, setIsResumeUploadModalOpen] = useState(false);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
 
  // --- SINGLE STATE FOR AI-TO-DRAWER FLOW ---
  // This state will hold the data. If it has data, the finalize drawer will open. If it's null, the drawer is closed.
  const [prefilledData, setPrefilledData] = useState<Partial<CandidateFormData> | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // --- DATA FETCHING ---
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
  
  const { 
    data: candidatesData = [],
    refetch: refetchCandidates
  } = useQuery({
    queryKey: ['job-candidates', id],
    queryFn: () => getCandidatesByJobId(id || ""),
    enabled: !!id,
  });

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

  // --- useEffect TO CHECK sessionStorage ---
  useEffect(() => {
    const dataFromAnalysisPage = sessionStorage.getItem('aiCandidateForFinalize');

    if (dataFromAnalysisPage) {
      try {
        const parsedData: Partial<CandidateFormData> = JSON.parse(dataFromAnalysisPage);
        // Directly set the data. This will trigger the drawer to open in the JSX.
        setPrefilledData(parsedData);
      } catch (e) {
        console.error("Failed to parse candidate data from session storage:", e);
        toast.error("Could not load candidate data from analysis page.");
      } finally {
        // IMPORTANT: Clear the data from storage so it doesn't trigger again on a page refresh
        sessionStorage.removeItem('aiCandidateForFinalize');
      }
    }
  }, []); // Run only on mount

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


    const handleFinalizeFromWishlist = (formData: Partial<CandidateFormData>) => {
    setIsWishlistModalOpen(false); // Close the modal
    setPrefilledData(formData);    // Set the data, which opens the AiCandidateFinalizeDrawer
    toast.info("Please review and complete the candidate's details to add them to this job.");
  };

  // --- HANDLER FUNCTIONS ---
  const handleManualCandidateAdded = () => {
    setIsAddCandidateDrawerOpen(false);
    refetchCandidates();
    toast.success("Candidate added successfully");
  };

  // This handler is for BOTH flows now (from modal or from redirect)
  const handleInitiateAddFromAnalysis = (formData: Partial<CandidateFormData>) => {
    setPrefilledData(formData);
    setIsResumeUploadModalOpen(false); // Ensure modal is closed
  };

  // This handler is called when the finalize drawer successfully saves OR is cancelled
  const handleFinalizeDrawerClose = () => {
    setPrefilledData(null); // Just clear the data to close the drawer
  };
 
  const handleFinalizeCandidateAdded = () => {
    handleFinalizeDrawerClose(); // Close the drawer
    refetchCandidates();
    toast.success("AI-scanned candidate has been added!");
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
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-xl font-semibold">{job.title}</h1>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2">

            <Button 
            variant="outline" 
            onClick={() => setIsWishlistModalOpen(true)} 
            className="flex items-center gap-2"
          >
            <Bookmark size={16} className="text-indigo-600" />
            <span>My Shortlist</span>
          </Button>

            {/* Main Dropdown for All Candidate Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-10 px-6 font-semibold text-white whitespace-nowrap bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full shadow-lg transform hover:scale-105 transition-transform duration-200 flex items-center gap-2">
                <Sparkles size={18} />
                <span>Analyse with AI</span>
                <ChevronDown className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>



            
            <DropdownMenuContent 
              align="end" 
              className="w-64 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 shadow-2xl rounded-xl p-2"
            >
              <DropdownMenuItem 
 onSelect={() => setIsResumeUploadModalOpen(true)}
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

          <Link to={`/jobs/${job.id}/description`}>
            <Button variant="outline" className="flex items-center gap-2">
              <FileText size={16} />
              <span className="hidden sm:inline">Job Description</span>
            </Button>
          </Link>

          <Button onClick={() => setIsAddCandidateDrawerOpen(true)} className="gap-2">
            <UserPlus size={16} />
            Add Candidate
          </Button>
        </div>
      </div>

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
      
      {isResumeUploadModalOpen && job && (
        <ResumeUploadModal
          isOpen={isResumeUploadModalOpen}
          onClose={() => setIsResumeUploadModalOpen(false)}
          onInitiateCandidateAdd={handleInitiateAddFromAnalysis}
          job={job}
        />
      )}

      {/* WishlistModal now gets the new prop */}
      <WishlistModal 
        isOpen={isWishlistModalOpen}
        onClose={() => setIsWishlistModalOpen(false)}
        jobId={id}
        onInitiateFinalize={handleFinalizeFromWishlist}
      />
      {/* 3. AI Finalize Drawer - Simplified Logic */}
      {/*
        This is the key change. The drawer's visibility is now directly controlled
        by whether `prefilledData` exists. No separate `isFinalizeDrawerOpen` state is needed.
      */}
      {prefilledData && (
        <AiCandidateFinalizeDrawer
          job={job}
          open={!!prefilledData} // Drawer is open if prefilledData is not null
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              handleFinalizeDrawerClose(); // If user closes it, clear the data
            }
          }}
          initialData={prefilledData}
          onCandidateAdded={handleFinalizeCandidateAdded}
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
              zIndex: 999,
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