import React, { useState, useEffect } from 'react';
import Header from '@/components/careerPage/Header';
import JobList from '@/components/careerPage/JobList';
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import '../../careerpage.css'

const Index = () => {
  const [searchFilters, setSearchFilters] = useState<{ searchTerm: string; location: string }>({
    searchTerm: '',
    location: ''
  });
  const [jobsData, setJobsData] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSharedJobs = async () => {
      const { data: sharedJobs, error: sharedError } = await supabase
        .from('shared_jobs')
        .select('job_id');
  
      if (sharedError) {
        toast({ title: 'Error fetching shared jobs', description: sharedError.message, variant: 'destructive' });
        return;
      }
  
      if (!sharedJobs.length) {
        setJobsData([]); // No shared jobs available
        return;
      }
  
      // Extract job IDs from shared_jobs
      const jobIds = sharedJobs.map(job => job.job_id);
  
      // Fetch only jobs that were shared
      const { data, error } = await supabase
        .from('hr_jobs')
        .select('*')
        .in('id', jobIds);
  
      if (error) {
        toast({ title: 'Error fetching job details', description: error.message, variant: 'destructive' });
      } else {
        const formattedJobs = data.map(job => ({
          id: job.id,
          title: job.title,
          company: 'Hrumbles.ai',
          location: job.location.join(', '),
          type: job.job_type,
          salary: 'Competitive',
          postedDate: new Date(job.posted_date).toDateString(),
          description: job.description
        }));
        setJobsData(formattedJobs);
      }
    };
  
    fetchSharedJobs();
  }, []);
  

  return (
    <div className="min-h-screen bg-hrumbles-bg">
      <Header />
      <main className="pt-16 pb-12">
        <JobList jobs={jobsData} searchFilters={searchFilters} />
      </main>
      
      <footer className="py-4 border-t border-hrumbles/10 text-sm">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-3 md:mb-0">
              <p className="text-hrumbles-muted">&copy; 2023 Hrumbles.ai. All rights reserved.</p>
            </div>
            
            <div className="flex space-x-4">
              <a href="#" className="text-hrumbles-muted hover:text-hrumbles-accent transition-colors">
                Privacy
              </a>
              <a href="#" className="text-hrumbles-muted hover:text-hrumbles-accent transition-colors">
                Terms
              </a>
              <a href="#" className="text-hrumbles-muted hover:text-hrumbles-accent transition-colors">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
