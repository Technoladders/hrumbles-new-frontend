// src/pages/jobs/ai/AiJobDetailLayout.tsx

import { JobData, Candidate } from '@/lib/types';
import { AiJobOverviewCard } from './cards/AiJobOverviewCard';
import { AiVerificationChartCard } from './cards/AiVerificationChartCard';
import { AiRecentActivityCard } from './cards/AiRecentActivityCard';
import { AiCandidatesList } from '@/components/jobs/ai/AiCandidatesList';

interface Props {
  job: JobData;
  candidates: Candidate[];
  onCandidateUpdate: () => void;
}

export const AiJobDetailLayout = ({ job, candidates, onCandidateUpdate }: Props) => {
  const candidateIds = candidates.map(c => c.id);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <AiJobOverviewCard job={job} candidateCount={candidates.length} />
      <AiVerificationChartCard jobId={job.id} />
      <AiRecentActivityCard candidateIds={candidateIds} />
      
      <div className="lg:col-span-3">
        <AiCandidatesList 
          job={job} 
          candidates={candidates} 
          onCandidateUpdate={onCandidateUpdate} 
        />
      </div>
    </div>
  );
};