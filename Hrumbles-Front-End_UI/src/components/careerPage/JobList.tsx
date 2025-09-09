import React, { useState, useEffect } from 'react';
import JobCard from './JobCard';
import { Input } from '@/components/careerPage/ui/input';
import { Search, MapPin, Briefcase } from 'lucide-react';
import { ScrollArea } from '@/components/careerPage/ui/scroll-area';
import { Card } from '@/components/careerPage/ui/card';
import '../../careerpage.css'

interface JobListProps {
  jobs: any[];
  searchFilters: {
    searchTerm: string;
    location: string;
  };
}

const JobList: React.FC<JobListProps> = ({ jobs, searchFilters }) => {
  const [filteredJobs, setFilteredJobs] = useState(jobs);
  const [localFilters, setLocalFilters] = useState({
    searchTerm: searchFilters.searchTerm || '',
    location: searchFilters.location || '',
    jobType: 'all',
    sortBy: 'newest',
  });

  // Update local filters when props change
  useEffect(() => {
    setLocalFilters(prev => ({
      ...prev,
      searchTerm: searchFilters.searchTerm || prev.searchTerm,
      location: searchFilters.location || prev.location,
    }));
  }, [searchFilters]);

  // Apply filters when local filters change
  useEffect(() => {
    let results = [...jobs];
    
    if (localFilters.searchTerm) {
      const searchTermLower = localFilters.searchTerm.toLowerCase();
      results = results.filter(job => 
        job.title.toLowerCase().includes(searchTermLower) || 
        job.description.toLowerCase().includes(searchTermLower) ||
        job.company.toLowerCase().includes(searchTermLower)
      );
    }
    
    if (localFilters.location) {
      const locationLower = localFilters.location.toLowerCase();
      results = results.filter(job => 
        job.location.toLowerCase().includes(locationLower)
      );
    }
    
    // Apply job type filter
    if (localFilters.jobType !== 'all') {
      results = results.filter(job => 
        job.type.toLowerCase() === localFilters.jobType.toLowerCase()
      );
    }
    
    // Apply sorting
    if (localFilters.sortBy === 'newest') {
      // For demo purposes, we're using the postedDate string
      results = [...results].sort((a, b) => {
        if (a.postedDate.includes('day') && b.postedDate.includes('week')) return -1;
        if (a.postedDate.includes('week') && b.postedDate.includes('day')) return 1;
        
        const aNum = parseInt(a.postedDate.split(' ')[0], 10);
        const bNum = parseInt(b.postedDate.split(' ')[0], 10);
        
        return aNum - bNum;
      });
    } else if (localFilters.sortBy === 'salary') {
      // Simplistic salary sorting for demo purposes
      results = [...results].sort((a, b) => {
        const aSalary = parseFloat(a.salary.replace(/[^0-9.]/g, ''));
        const bSalary = parseFloat(b.salary.replace(/[^0-9.]/g, ''));
        return bSalary - aSalary;
      });
    }
    
    setFilteredJobs(results);
  }, [jobs, localFilters]);

  const handleFilterChange = (name: string, value: string) => {
    setLocalFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <section className=" p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-hrumbles mb-2">Job Openings</h1>
        <p className="text-hrumbles-muted max-w-2xl mx-auto text-sm">
          Explore our current opportunities and find the perfect role for your skills and aspirations.
        </p>
      </div>
      
      <Card className="mb-6 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="relative md:col-span-5">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input 
              placeholder="Search by title or keyword" 
              className="pl-9 h-9 text-sm"
              value={localFilters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
            />
          </div>
          <div className="relative md:col-span-4">
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input 
              placeholder="Location" 
              className="pl-9 h-9 text-sm"
              value={localFilters.location}
              onChange={(e) => handleFilterChange('location', e.target.value)}
            />
          </div>
          <div className="relative md:col-span-3">
            <Briefcase className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <select 
              className="w-full h-9 pl-9 pr-4 rounded-md border border-input bg-background text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={localFilters.jobType}
              onChange={(e) => handleFilterChange('jobType', e.target.value)}
            >
              <option value="all">All Job Types</option>
              <option value="Full-time">Full-time</option>
              <option value="Contract">Contract</option>
              <option value="Internship">Internship</option>
            </select>
          </div>
        </div>
      </Card>
      
      <div>
        {filteredJobs.length > 0 ? (
          <ScrollArea className="h-auto pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredJobs.map(job => (
                <JobCard 
                  key={job.id} 
                  job={job}
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8 bg-white rounded-lg shadow-sm">
            <h3 className="text-lg font-medium mb-2">No matching jobs found</h3>
            <p className="text-hrumbles-muted text-sm">
              Try adjusting your search filters
            </p>
            <button 
              className="mt-3 px-4 py-1.5 text-sm border border-hrumbles rounded hover:bg-gray-50 transition-colors"
              onClick={() => {
                setLocalFilters({
                  searchTerm: '',
                  location: '',
                  jobType: 'all',
                  sortBy: 'newest'
                });
              }}
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default JobList;
