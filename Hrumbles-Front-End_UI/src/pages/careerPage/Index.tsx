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
  const fetchPublicJobs = async () => {
    // Invoke the secure Edge Function instead of direct table access
    const { data, error } = await supabase.functions.invoke('get-public-jobs');

    if (error) {
      toast({ title: 'Error fetching jobs', description: error.message, variant: 'destructive' });
    } else {
      // The data from the function is already the final list of jobs
      const formattedJobs = data.map(job => ({
        id: job.id,
        title: job.title,
        company: 'Hrumbles.ai', // Or your company name
        location: Array.isArray(job.location) ? job.location.join(', ') : job.location,
        type: job.job_type,
        salary: 'Competitive',
        postedDate: new Date(job.posted_date).toDateString(),
        description: job.description
      }));
      setJobsData(formattedJobs);
    }
  };

  fetchPublicJobs();
}, []); // The dependency array is now empty
  
  

  return (
    <div className="min-h-screen bg-hrumbles-bg">
      <Header />
      <main className="pt-16 pb-12">
        <JobList jobs={jobsData} searchFilters={searchFilters} />
      </main>
      
      <footer className="py-4 border-t border-hrumbles/10 text-sm">
        <div className="p-4">
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
