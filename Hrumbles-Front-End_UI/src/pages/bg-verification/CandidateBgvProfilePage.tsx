import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Candidate, ResumeAnalysis } from '@/lib/types';
import Loader from '@/components/ui/Loader';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CardContent } from '@/components/ui/card';
import { BgvCandidateInfoCard } from './BgvCandidateInfoCard';
import { BgvVerificationSection } from './BgvVerificationSection';
import { BgvTimelineCard } from './cards/BgvTimelineCard';
import CandidateExperienceCard from './cards/CandidateExperienceCard'; 
import { ResumeAnalysisSection } from '@/components/MagicLinkView/ResumeAnalysisSection';
import { ResumePreviewSection } from '@/components/MagicLinkView/ResumePreviewSection';

const CandidateBgvProfilePage = () => {
  const { candidateId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('bg-verification'); // Default to bg-verification

  const { data: candidate, isLoading: isCandidateLoading, error: candidateError } = useQuery<Candidate>({
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

  const { data: job, isLoading: isJobLoading } = useQuery<Job>({
    queryKey: ['job', candidate?.job_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_jobs')
        .select('title') // We only need the title for efficiency
        .eq('id', candidate!.job_id)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    // The `enabled` flag is crucial. It ensures this query waits for `candidate.job_id`.
    enabled: !!candidate?.job_id,
  });

  const { data: resumeAnalysis, isLoading: isResumeAnalysisLoading } = useQuery<ResumeAnalysis | null>({
    queryKey: ['resume-analysis', candidateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('candidate_resume_analysis')
        .select('*')
        .eq('candidate_id', candidateId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data || null;
    },
    enabled: !!candidateId,
  });

  // Set default tab based on resumeAnalysis presence
   useEffect(() => {
    // Only proceed if the candidate object actually exists.
    if (candidate) {
      // If there's no resume_url, default to the 'resume' tab, otherwise stick to verification.
      // This is safer and covers more cases.
      if (!candidate.resume_url) {
        setActiveTab('resume');
      } else {
        setActiveTab('bg-verification');
      }
    }
  }, [candidate]); // The dependency is now just the candidate object itself.

  // The loading check now correctly protects all subsequent code from running with undefined data.
  if (isCandidateLoading || (candidate?.job_id && isJobLoading)) {
    return <div className="flex justify-center items-center h-[80vh]"><Loader /></div>;
  }

  if (candidateError || !candidate) {
    return (
      <div className="text-center p-10">
        <h2 className="text-xl font-bold">Candidate Not Found</h2>
        <Button asChild variant="link" className="mt-4">
          <Link to="/jobs"><ArrowLeft className="mr-2 h-4 w-4" />Back to Jobs</Link>
        </Button>
      </div>
    );
  }

  // This logic is now safe because it runs after the loading and error guards.
  const availableTabs = [
    'bg-verification',
    candidate.resume_url && 'resume',
  ].filter(Boolean) as string[];


  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft />
        </Button>
         <h1 className="text-2xl font-bold">
          {job ? `${job.title}` : 'Candidate Profile'}
        </h1>
      </div>

      {/* Grid layout for Info Card and Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <BgvCandidateInfoCard candidate={candidate} />
        </div>
       <div className="lg:col-span-2">
          <CandidateExperienceCard candidate={candidate} /> {/* Replaced BgvTimelineCard */}
        </div>
      </div>

      {/* Tabbed interface below Info Card and Timeline */}
      <Tabs defaultValue="bg-verification" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-2 mb-6 overflow-x-auto">
          {availableTabs.map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="flex-1 min-w-[100px] text-xs sm:text-sm sm:min-w-[120px]"
            >
              {tab === 'bg-verification' && 'Background Verification'}
              {tab === 'resume' && 'Resume'}
            </TabsTrigger>
          ))}
        </TabsList>
<TabsContent value="bg-verification">
          <CardContent>
            <BgvVerificationSection candidate={candidate} />
          </CardContent>
        </TabsContent>

        <TabsContent value="resume">
          <CardContent>
            <ResumePreviewSection resumeUrl={candidate.resume_url || '#'} />
          </CardContent>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CandidateBgvProfilePage;