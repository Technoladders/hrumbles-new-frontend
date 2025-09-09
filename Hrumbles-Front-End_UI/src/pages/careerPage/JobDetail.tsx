import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Briefcase, Clock, ArrowLeft } from 'lucide-react';
import Header from '@/components/careerPage/Header';
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";

interface Job {
  id: string;
  title: string;
  location: string[];
  job_type: string;
  posted_date: string;
  description: string;
  salary: string;
  organization_id: string; // <-- Add this field
}

const JobDetail = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

useEffect(() => {
    const fetchJob = async () => {
      if (!jobId) return;
      setLoading(true);

      // --- CHANGE: Invoke the Edge Function instead of direct DB access ---
      const { data, error } = await supabase.functions.invoke('get-public-job-by-id', {
        body: { jobId },
      });
      
      if (error) {
        toast({
          title: 'Error fetching job details',
          description: error.message,
          variant: 'destructive',
        });
        setJob(null);
      } else {
        setJob(data);
      }
      setLoading(false);
    };

    fetchJob();
  }, [jobId, toast]);

    const handleApply = () => {
    if (!job) return;
    // Pass organization_id in the navigation state to the application page
    navigate(`/job/${job.id}/apply`, {
      state: { organizationId: job.organization_id } 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg font-semibold">Loading job details...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-hrumbles-bg">
        <Header />
        <div className="container pt-32 text-center">
          <h1 className="text-2xl font-bold">Job not found</h1>
          <Button onClick={() => navigate('/careers')} className="mt-4" variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  console.log("Jobs Apllication", job)
  return (
    <div className="min-h-screen bg-hrumbles-bg">
      <Header />
      <div className="container pt-32 pb-20">
        <Button onClick={() => navigate('/careers')} variant="outline" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Jobs
        </Button>
        
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <div className="bg-hrumbles-accent/10 text-hrumbles-accent font-medium px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  <Briefcase size={14} /> <span>{job.job_type}</span>
                </div>
                <div className="text-hrumbles-muted text-sm flex items-center gap-1">
                  <Calendar size={14} /> <span>{new Date(job.posted_date).toLocaleDateString()}</span>
                </div>
              </div>
              
              <h1 className="text-3xl font-bold text-hrumbles mb-3">{job.title}</h1>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-1 text-hrumbles-muted">
                  <MapPin size={16} /> <span>{Array.isArray(job.location) ? job.location.join(', ') : job.location}</span>
                </div>
                <div className="flex items-center gap-1 text-hrumbles font-medium">
                  <Clock size={16} className="text-hrumbles-accent" /> 
                  {/* <span>{job.salary}</span> */}
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handleApply}
              className="mt-6 lg:mt-0 bg-hrumbles-accent hover:bg-hrumbles-accent/90"
            >
              Apply Now
            </Button>
          </div>
          
          <div className="border-t border-gray-100 pt-6">
            <h2 className="text-xl font-semibold mb-4">Job Description</h2>
            <p className="text-hrumbles-muted whitespace-pre-line">{job.description}</p>
            
            <div className="mt-10">
              <h2 className="text-xl font-semibold mb-4">How to Apply</h2>
              <p className="text-hrumbles-muted mb-6">
                Ready to join our team? Click the button below to submit your application.
                We review all applications carefully and will contact qualified candidates for interviews.
              </p>
              
              <Button 
                onClick={handleApply}
                className="bg-hrumbles-accent hover:bg-hrumbles-accent/90"
              >
                Apply for this Position
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetail;