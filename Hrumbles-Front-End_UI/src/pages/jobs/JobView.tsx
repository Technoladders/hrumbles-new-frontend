import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, FileText, MoreVertical, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { getJobById } from "@/services/jobService";
import { getCandidatesByJobId } from "@/services/candidateService";
import JobDetailView from "@/components/jobs/job/JobDetailView";
import { Candidate } from "@/lib/types";
import AddCandidateDrawer from "@/components/jobs/job/candidate/AddCandidateDrawer";
import ResumeAnalysisModal from "@/components/jobs/ResumeAnalysisModal";
import Modal from 'react-modal';

const JobView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch job data
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
  
  // Fetch candidates
  const { 
    data: candidatesData = [],
    refetch: refetchCandidates
  } = useQuery({
    queryKey: ['job-candidates', id],
    queryFn: () => getCandidatesByJobId(id || ""),
    enabled: !!id,
  });

  // Fetch history data
  const { 
    data: historyData = [],
    isLoading: historyLoading
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

  console.log("historydata", historyData)

  // Convert CandidateData to Candidate type
  const candidates: Candidate[] = candidatesData.map(candidate => ({
    id: candidate.id,
    name: candidate.name,
    status: candidate.status,
    experience: candidate.experience,
    matchScore: candidate.matchScore,
    appliedDate: candidate.appliedDate,
    skills: candidate.skills || []
  }));

  // Listen for real-time changes to job data
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel('job-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hr_jobs',
          filter: `id=eq.${id}`
        },
        () => {
          refetchJob();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, refetchJob]);

  // Listen for real-time changes to job candidates
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel('candidate-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hr_job_candidates',
          filter: `job_id=eq.${id}`
        },
        () => {
          refetchCandidates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, refetchCandidates]);

  const handleCandidateAdded = () => {
    refetchCandidates();
    toast.success("Candidate added successfully");
  };

  const handleAnalysisComplete = (result: {
    job_id: string;
    candidate_id: string;
    candidate_name: string;
    overall_score: number;
  }) => {
    refetchCandidates();
    toast.success("Resume analysis completed");
    setIsResumeModalOpen(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
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
        <Link to="/jobs">
          <Button className="flex items-center gap-2">
            <ArrowLeft size={16} />
            Back to Jobs
          </Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Link to="/jobs" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-semibold">{job.title}</h1>
        </div>
        
        <div className="flex gap-2">
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="default" >
                <MoreVertical size={16} /> Analyse Resume
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsModalOpen(true)}>
                Paste Resume
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsHistoryModalOpen(true)}>
                View History
              </DropdownMenuItem>
              <DropdownMenuItem>Add Resume</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link to={`/jobs/${job.id}/description`}>
            <Button variant="outline" className="flex items-center gap-2">
              <FileText size={16} />
              <span className="hidden sm:inline">Job Description</span>
              <span className="sm:hidden">JD</span>
            </Button>
          </Link>
          <AddCandidateDrawer job={job} onCandidateAdded={handleCandidateAdded} />
        </div>
      </div>

      <JobDetailView 
        job={job} 
        candidates={candidates} 
        onCandidateAdded={handleCandidateAdded} 
      />
      {isModalOpen && (
        <ResumeAnalysisModal
          jobId={id}
          onClose={() => setIsModalOpen(false)}
          setError={setError}
          // onAnalysisComplete={handleAnalysisComplete}
          initialData={{}}
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
              overflowY: 'auto'
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
                {historyData.map((item, index) => (
                  <div key={item.candidate_id} className="relative">
                    {/* Timeline Line */}
                    {index !== historyData.length - 1 && (
                      <div className="absolute left-3 top-8 w-0.5 h-full bg-gray-200 -z-10" />
                    )}
                    
                    <div className="flex items-start gap-4">
                      {/* Timeline Dot */}
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-white" />
                      </div>

                      {/* Content */}
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
                              onClick={() => navigate(`/resume-analysis/${item.candidate_id}`)}
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

// job resume View
