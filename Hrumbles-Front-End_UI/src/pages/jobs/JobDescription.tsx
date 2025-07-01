
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getJobById } from "@/services/jobService";
import { getCandidatesByJobId } from "@/services/candidateService";

// Importing UI components
import { Separator } from "@/components/ui/separator";
import JobDetailsLeftCard from "@/components/jobs/job-description/JobDetailsLeftCard";
import JobDetailsRightCard from "@/components/jobs/job-description/JobDetailsRightCard";
import JobHeaderSection from "@/components/jobs/job-description/JobHeaderSection";
import LoadingState from "@/components/jobs/job-description/LoadingState";
import ErrorState from "@/components/jobs/job-description/ErrorState";
import JobEditDrawer from "@/components/jobs/job-description/JobEditDrawer";
import { useJobEditState } from "@/components/jobs/job-description/hooks/useJobEditState";
import { Candidate } from "@/lib/types";

const JobDescription = () => {
  const { id } = useParams<{ id: string }>();
  const { isDrawerOpen, openDrawer, closeDrawer, handleJobUpdate } = useJobEditState();
  
  const { 
    data: job, 
    isLoading: jobLoading, 
    error: jobError,
    refetch: refetchJob
  } = useQuery({
    queryKey: ['job-details', id],
    queryFn: () => getJobById(id || ""),
    enabled: !!id,
  });
  
  const { 
    data: candidatesData = [],
    refetch: refetchCandidates
  } = useQuery({
    queryKey: ['candidates-count', id],
    queryFn: () => getCandidatesByJobId(id || ""),
    enabled: !!id,
  });

  console.log("JJJJDDDDDDDDDD", job)

  // Convert CandidateData[] to Candidate[]
  const candidates: Candidate[] = candidatesData.map(candidate => ({
    id: parseInt(candidate.id) || 0, // Convert string id to number
    name: candidate.name,
    status: candidate.status,
    experience: candidate.experience,
    matchScore: candidate.matchScore,
    appliedDate: candidate.appliedDate,
    skills: candidate.skills
  }));

  // Set up real-time listeners for job and candidate changes
  useEffect(() => {
    if (!id) return;

    // Listen for job changes
    const jobChannel = supabase
      .channel('job-desc-changes')
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

    // Listen for candidate changes
    const candidatesChannel = supabase
      .channel('candidates-desc-changes')
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

    // Clean up subscription on unmount
    return () => {
      supabase.removeChannel(jobChannel);
      supabase.removeChannel(candidatesChannel);
    };
  }, [id, refetchJob, refetchCandidates]);

  // Loading state
  if (jobLoading) {
    return <LoadingState />;
  }
  
  // Error state
  if (jobError || !job) {
    return <ErrorState />;
  }

  return (
    <div className="space-y-6 py-2 animate-fade-in">
      {/* Job Header with Title and Actions */}
      <JobHeaderSection 
        job={job} 
        onEditJob={openDrawer} 
      />
      
      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Card - 2/3 width on large screens */}
        <div className="lg:col-span-2">
          <JobDetailsLeftCard 
            job={job} 
            candidates={candidates}
          />
        </div>

        {/* Right Card - 1/3 width on large screens */}
        <div className="lg:col-span-1">
          <JobDetailsRightCard job={job} />
        </div>
      </div>

      {/* Edit Job Drawer */}
      <JobEditDrawer 
        job={job}
        open={isDrawerOpen}
        onClose={closeDrawer}
        onUpdate={handleJobUpdate}
      />
    </div>
  );
};

export default JobDescription;
