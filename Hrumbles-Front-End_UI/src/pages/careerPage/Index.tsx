import React, { useState, useEffect } from 'react';
import Header from '@/components/careerPage/Header';
import JobList from '@/components/careerPage/JobList';
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import '../../careerpage.css';

const Index = () => {
  const [searchFilters, setSearchFilters] = useState<{ searchTerm: string; location: string }>({
    searchTerm: '',
    location: ''
  });
  const [jobsData, setJobsData] = useState([]);
  const [orgName, setOrgName] = useState(''); // Optional: To store company name if returned
  const { toast } = useToast();

  useEffect(() => {
    // 1. Helper logic to extract subdomain
    const getSubdomain = () => {
      const hostname = window.location.hostname; // e.g., "technoladders.hrumbles.ai" or "demo.localhost"
      const parts = hostname.split('.');
      
      // Handle Localhost (e.g., demo.localhost)
      if (hostname.includes('localhost')) {
        return parts.length > 1 ? parts[0] : null;
      }
      
      // Handle Production (e.g., technoladders.hrumbles.ai)
      // Assuming structure is [subdomain].[domain].[tld]
      return parts.length > 2 ? parts[0] : null;
    };

    const fetchPublicJobs = async () => {
      const currentSubdomain = getSubdomain();

      console.log("Fetching jobs for subdomain:", currentSubdomain);

      // 2. Pass the subdomain to the Edge Function
      const { data, error } = await supabase.functions.invoke('get-public-jobs', {
        body: { subdomain: currentSubdomain } 
      });

      if (error) {
        console.error('Edge function error:', error);
        toast({ title: 'Error fetching jobs', description: error.message, variant: 'destructive' });
      } else {
        // Check if the backend returned a specific error regarding organization
        if (!data) {
           setJobsData([]);
           return;
        }

        // 3. Format the data
        // Assuming your Edge Function now filters by organization
        const formattedJobs = data.map((job: any) => ({
          id: job.id,
          title: job.title,
          // Use the organization name from the join if available, else generic
          company: job.hr_organizations?.name || 'Hrumbles.ai', 
          location: Array.isArray(job.location) ? job.location.join(', ') : job.location,
          type: job.job_type,
          salary: 'Competitive', // Or job.salary_range if public
          postedDate: new Date(job.created_at).toDateString(), // Changed from posted_date to created_at if needed
          description: job.description
        }));
        
        setJobsData(formattedJobs);
        
        // Optional: Set page title to Org Name if available
        if (data.length > 0 && data[0].hr_organizations?.name) {
            setOrgName(data[0].hr_organizations.name);
        }
      }
    };

    fetchPublicJobs();
  }, []); 

  return (
    <div className="min-h-screen bg-hrumbles-bg">
      <Header /> 
      {/* Optional: Pass orgName to Header if you want to change the Logo/Title dynamically */}
      
      <main className="pt-16 pb-12">
        {jobsData.length > 0 ? (
           <JobList jobs={jobsData} searchFilters={searchFilters} />
        ) : (
           <div className="text-center mt-20 text-gray-500">
             <p>No open positions found for this organization.</p>
           </div>
        )}
      </main>
      
      <footer className="py-4 border-t border-hrumbles/10 text-sm">
        <div className="p-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-3 md:mb-0">
              <p className="text-hrumbles-muted">&copy; {new Date().getFullYear()} {orgName || 'Hrumbles.ai'}. All rights reserved.</p>
            </div>
            
            <div className="flex space-x-4">
              <a href="#" className="text-hrumbles-muted hover:text-hrumbles-accent transition-colors">Privacy</a>
              <a href="#" className="text-hrumbles-muted hover:text-hrumbles-accent transition-colors">Terms</a>
              <a href="#" className="text-hrumbles-muted hover:text-hrumbles-accent transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;