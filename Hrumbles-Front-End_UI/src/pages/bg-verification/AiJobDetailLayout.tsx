import { JobData, Candidate } from "@/lib/types";
import { AiJobOverviewCard } from "./cards/AiJobOverviewCard";
import { AiVerificationChartCard } from "./cards/AiVerificationChartCard";
import { AiRecentActivityCard } from "./cards/AiRecentActivityCard";
import { AiCandidatesList } from '@/components/jobs/ai/AiCandidatesList';


interface Props {
  job: JobData;
  candidates: Candidate[];
  onCandidateUpdate: () => void;
}

export const AiJobDetailLayout = ({ job, candidates, onCandidateUpdate }: Props) => {
  console.log('candidates', candidates)
  console.log('jobsbsb', job)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <AiJobOverviewCard job={job} candidateCount={candidates.length} />
      <AiVerificationChartCard job={job} />
      <AiRecentActivityCard candidateIds={candidates.map((c) => c.id)} />
      <div className="md:col-span-3">
        <AiCandidatesList
          job={job}
          candidates={candidates}
          onCandidateUpdate={onCandidateUpdate}
        />
      </div>
    </div>
  );
};