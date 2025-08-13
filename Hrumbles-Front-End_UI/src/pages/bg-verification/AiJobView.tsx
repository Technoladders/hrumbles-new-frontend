// src/pages/jobs/ai/AiJobView.tsx

import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { getJobById } from '@/services/jobService';
import { getCandidatesByJobId } from '@/services/candidateService';
import { JobData, Candidate } from '@/lib/types';

import Loader from '@/components/ui/Loader';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { AiJobHeader } from './AiJobHeader';
import { AiJobDetailLayout } from './AiJobDetailLayout';

export const AiJobView = () => {
  const { id: jobId } = useParams<{ id: string }>();

  // Fetch Job Data
  const { data: job, isLoading: isJobLoading, error: jobError } = useQuery<JobData>({
    queryKey: ['job', jobId],
    queryFn: () => getJobById(jobId!),
    enabled: !!jobId,
  });

  // Fetch Candidates for this Job
  const { data: candidates = [], isLoading: areCandidatesLoading, refetch: refetchCandidates } = useQuery<Candidate[]>({
    queryKey: ['job-candidates', jobId],
    queryFn: () => getCandidatesByJobId(jobId!),
    enabled: !!jobId,
  });

  if (isJobLoading || areCandidatesLoading) {
    return <div className="flex justify-center items-center h-[80vh]"><Loader /></div>;
  }
  
  if (jobError || !job) {
    return (
      <div className="text-center p-10">
        <h2 className="text-xl font-bold">Job Not Found</h2>
        <Button asChild variant="link" className="mt-4"><Link to="/jobs"><ArrowLeft className="mr-2 h-4 w-4" />Back to Jobs</Link></Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <AiJobHeader job={job} />
      <AiJobDetailLayout job={job} candidates={candidates} onCandidateUpdate={refetchCandidates} />
    </div>
  );
};

export default AiJobView;
// 