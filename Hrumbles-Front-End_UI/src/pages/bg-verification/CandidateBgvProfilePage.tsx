import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Candidate, Job } from '@/lib/types';
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
import { AllResultsDisplay } from './results/AllResultsDisplay'; // Import AllResultsDisplay
import { useBgvVerifications } from '@/hooks/bg-verification/useBgvVerifications'; 

const CandidateBgvProfilePage = () => {
  const { candidateId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();
   const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('experience'); // Default to bg-verification

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

  const { state: bgvState } = useBgvVerifications(candidate!);



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

   // --- NEW LOGIC to determine available tabs and find UAN history ---
 const { hasAnyResults, verifiedUanHistory } = useMemo(() => {
    if (!bgvState.results || Object.keys(bgvState.results).length === 0) {
      return { hasAnyResults: false, verifiedUanHistory: null };
    }
    const hasResults = Object.values(bgvState.results).some(arr => arr && arr.length > 0);
    const glHistory = bgvState.results['uan_full_history_gl'];
    const tsHistory = bgvState.results['uan_full_history'];
    let history = null;
    if (glHistory?.[0]?.data?.data?.employment_data) {
        history = glHistory[0].data.data.employment_data;
    } else if (tsHistory?.[0]?.data?.msg) {
        history = tsHistory[0].data.msg;
    }
    return { hasAnyResults: hasResults, verifiedUanHistory: history };
  }, [bgvState.results]);

  // --- NEW: Effect to fetch and update missing career experience ---
  useEffect(() => {
    const fetchAndSetExperience = async () => {
      if (!candidate?.resume_url) return;

      const toastId = toast.loading("Candidate experience is missing. Parsing from resume...");
      try {
        const { data: parsedData, error: parseError } = await supabase.functions.invoke('bgv-exp-parse', {
          body: { fileUrl: candidate.resume_url },
        });

        if (parseError) throw parseError;

        if (parsedData?.work_experience) {
          const { error: updateError } = await supabase
            .from('hr_job_candidates')
            .update({ career_experience: parsedData.work_experience })
            .eq('id', candidate.id);
          
          if (updateError) throw updateError;
          
          toast.success("Successfully populated candidate experience.", { id: toastId });
          queryClient.invalidateQueries({ queryKey: ['candidate', candidate.id] });
        } else {
          throw new Error("Parsed data did not contain work experience.");
        }
      } catch (error: any) {
        toast.error("Failed to parse resume for experience.", { id: toastId, description: error.message });
      }
    };

    // Trigger if UAN history exists but the candidate's experience in the DB is empty
    if (verifiedUanHistory && (!candidate?.career_experience || candidate.career_experience.length === 0)) {
      fetchAndSetExperience();
    }
  }, [verifiedUanHistory, candidate, queryClient]);


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
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}><ArrowLeft /></Button>
        <h1 className="text-2xl font-bold">{job ? job.title : 'Candidate Profile'}</h1>
      </div>

     <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <div className="lg:col-span-3 flex flex-col gap-6">
          <BgvCandidateInfoCard candidate={candidate} />
          <Tabs defaultValue="experience" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="experience">Experience</TabsTrigger>
              {hasAnyResults && <TabsTrigger value="all-results">All Results</TabsTrigger>}
              {candidate.resume_url && <TabsTrigger value="resume">Resume</TabsTrigger>}
            </TabsList>
            <TabsContent value="experience" className="mt-4">
              <CandidateExperienceCard candidate={candidate} uanHistory={verifiedUanHistory} />
            </TabsContent>
            {hasAnyResults && (
              <TabsContent value="all-results" className="mt-4">
                <AllResultsDisplay candidate={candidate} results={bgvState.results} onBack={() => setActiveTab('experience')} />
              </TabsContent>
            )}
            {candidate.resume_url && (
              <TabsContent value="resume" className="mt-4">
                <CardContent>
                  <ResumePreviewSection resumeUrl={candidate.resume_url} />
                </CardContent>
              </TabsContent>
            )}
          </Tabs>
        </div>
        <div className="lg:col-span-2 flex flex-col gap-6">
          <BgvVerificationSection candidate={candidate} />
          <BgvTimelineCard candidateId={candidate.id} />
        </div>
      </div>
    </div>
  );
};

export default CandidateBgvProfilePage;