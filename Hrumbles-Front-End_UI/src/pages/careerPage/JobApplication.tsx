
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Header from '@/components/careerPage/Header';
import { useToast } from '@/hooks/use-toast';
import ApplicationForm from '@/components/careerPage/ApplicationForm';
import { supabase } from "@/integrations/supabase/client";
import '../../careerpage.css'

interface JobInfo {
  id: string;
  title: string;
  company: string;
}

const JobApplication = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
    const location = useLocation(); // <-- Get location object
  const { organizationId } = location.state || {};
 const [job, setJob] = useState<JobInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [previousApplications, setPreviousApplications] = useState<string[]>([]);

     useEffect(() => {
    const fetchJobDetails = async () => {
      if (!jobId) return;
      setLoading(true);

      // --- CHANGE: Invoke the secure Edge Function instead of a direct query ---
      const { data, error } = await supabase.functions.invoke('get-public-job-by-id', {
        body: { jobId },
      });
      
      if (error) {
        toast({ title: 'Error fetching job details', description: error.message, variant: 'destructive' });
        setJob(null); // Ensure job is null on error
      } else {
        // We only need a subset of the job data for this page's display
        setJob({
          id: data.id,
          title: data.title,
          company: 'Hrumbles.ai', // Or your company name
        });
      }
      setLoading(false);
    };
    
    fetchJobDetails();
  }, [jobId, toast]);
  
    const handleSubmitSuccess = () => {
      navigate(`/job/${jobId}`);
    };



  console.log("Jobs Apllication", job)

  const handleDuplicateApplication = (email: string) => {
    toast({
      title: "Application Already Exists",
      description: `An application with email ${email} has already been submitted for this position.`,
      variant: "destructive"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="container pt-32 text-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <div className="container pt-32 text-center">
          <h1 className="text-2xl font-bold">Job not found</h1>
          <Button 
            onClick={() => navigate('/careers')} 
            className="mt-4"
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <div className="container max-w-5xl mx-auto pt-28 pb-20">
        <div className="flex items-center mb-8">
          <Button 
            onClick={() => navigate(`/job/${jobId}`)} 
            variant="outline" 
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Job
          </Button>
        </div>
        
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Apply for {job.title}</h1>
          <p className="text-slate-500">Complete the application form below to apply for this position at {job.company}</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
          <ApplicationForm 
            jobTitle={job.title}
            onSubmitSuccess={handleSubmitSuccess}
            onCancel={() => navigate(`/job/${jobId}`)}
            previousApplications={previousApplications}
            onDuplicateApplication={handleDuplicateApplication}
            organizationId={organizationId}
          />
        </div>
      </div>
    </div>
  );
};

export default JobApplication;
