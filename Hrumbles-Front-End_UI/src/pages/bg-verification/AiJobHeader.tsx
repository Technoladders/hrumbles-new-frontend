import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { JobData } from '@/lib/types';
import { AiAddCandidateModal } from './AiAddCandidateModal';

interface Props {
  job: JobData;
}

export const AiJobHeader = ({ job }: Props) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/jobs"><ArrowLeft /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{job.title}</h1>
            <p className="text-sm text-gray-500">{job.jobId}</p>
          </div>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Candidate
        </Button>
      </div>
      <AiAddCandidateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        jobId={job.id}
      />
    </>
  );
};