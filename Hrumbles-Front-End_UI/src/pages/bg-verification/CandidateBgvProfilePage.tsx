// src/pages/jobs/ai/CandidateBgvProfilePage.tsx

import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Candidate } from '@/lib/types';
import Loader from '@/components/ui/Loader';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { BgvCandidateInfoCard } from './BgvCandidateInfoCard';
import { BgvVerificationSection } from './BgvVerificationSection'; 
import { BgvTimelineCard } from './cards/BgvTimelineCard';

const CandidateBgvProfilePage = () => {
  const { candidateId } = useParams<{ candidateId: string }>();

  const { data: candidate, isLoading, error } = useQuery<Candidate>({
    queryKey: ['candidate', candidateId],
   queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_job_candidates')
        .select('*')
        .eq('id', candidateId!)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!candidateId,
  });

  if (isLoading) return <div className="flex justify-center items-center h-[80vh]"><Loader /></div>;
  if (error || !candidate) return (
    <div className="text-center p-10"><h2 className="text-xl font-bold">Candidate Not Found</h2><Button asChild variant="link" className="mt-4"><Link to="/jobs"><ArrowLeft className="mr-2 h-4 w-4" />Back to Jobs</Link></Button></div>
  );

  console.log("candidate", candidate)


  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon"><Link to="/jobs"><ArrowLeft /></Link></Button>
        <h1 className="text-2xl font-bold">Candidate Verification Profile</h1>
      </div>
      
      {/* --- NEW RESPONSIVE GRID LAYOUT --- */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Candidate Info Card takes up 3/4 of the space on large screens */}
        <div className="lg:col-span-3">
          <BgvCandidateInfoCard candidate={candidate} />
        </div>
        
        {/* Timeline Card takes up 1/4 of the space on large screens */}
        <div className="lg:col-span-2">
          <BgvTimelineCard candidateId={candidate.id} />
        </div>
      </div>
      
      {/* Verification Section still takes full width below the grid */}
      <BgvVerificationSection candidate={candidate} />
    </div>
  );
};

export default CandidateBgvProfilePage;