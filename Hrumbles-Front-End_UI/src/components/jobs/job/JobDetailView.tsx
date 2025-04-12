
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { JobData, Candidate } from "@/lib/types";
import AddCandidateModal from "./AddCandidateModal";
import JobOverviewCard from "./cards/JobOverviewCard";
import SubmissionOverviewCard from "./cards/SubmissionOverviewCard";
import RecentActivityCard from "./cards/RecentActivityCard";
import CandidatesTabsSection from "./sections/CandidatesTabsSection";

interface JobDetailViewProps {
  job: JobData;
  candidates: Candidate[];
  onCandidateAdded: () => void;
}

const JobDetailView = ({ job, candidates, onCandidateAdded }: JobDetailViewProps) => {
  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);

  
  const handleOpenCandidateModal = () => {
    setIsCandidateModalOpen(true);
  };
  

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Job Overview Card */}
      <JobOverviewCard job={job} candidates={candidates} />

      {/* Submission Overview Card */}
      <SubmissionOverviewCard job={job} candidates={candidates} />

      {/* Recent Activity Card */}
      <RecentActivityCard 
        candidates={candidates} 
        onAddCandidate={handleOpenCandidateModal} 
      />

      {/* Candidates Tabs */}
      <CandidatesTabsSection 
        jobId={job.id} 
        jobdescription={job.description}
        candidates={candidates} 
        onAddCandidate={handleOpenCandidateModal} 
      />

     
    </div>
  );
};

export default JobDetailView;
