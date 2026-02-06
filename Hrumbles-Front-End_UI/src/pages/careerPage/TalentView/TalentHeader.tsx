// TalentCareerPage.tsx  ← main file
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import TalentHeader from './TalentHeader';
import TalentSearch from './TalentSearch';
import TalentJobCard from './TalentJobCard';
import TalentJobDetail from './TalentJobDetail';
import { Filter, ChevronDown, Star, ArrowLeft } from 'lucide-react';
import './talent-theme.css';

type Job = {
  id: string;
  title: string;
  company: string;
  logoUrl?: string;
  location: string;
  description: string;
  postedDate: string;
  type?: string;
  // add more fields later (experience, skills, salary hint, etc.)
};

const TalentCareerPage = () => {
  const [jobs, setJobs]         = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob]   = useState<Job | null>(null);
  const [companyInfo, setCompanyInfo]   = useState({ name: '', logoUrl: '' });
  const [filters, setFilters]           = useState({
    searchTerm: '',
    location:   '',
    datePosted: 'any',
    remote:     false,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const listRef = useRef<HTMLDivElement>(null);

  // ────────────────────────────────────────────────
  //  Fetch jobs (your existing logic – slightly cleaned)
  // ────────────────────────────────────────────────
  useEffect(() => {
    const getSubdomain = () => {
      const parts = window.location.hostname.split('.');
      return parts.length > 2 ? parts[0] : 'technoladders'; // fallback
    };

    const fetchJobs = async () => {
      try {
        const subdomain = getSubdomain();
        const { data, error } = await supabase.functions.invoke('get-public-jobs-new', {
          body: { subdomain },
        });

        if (error) throw error;

        const formatted: Job[] = data.map((raw: any) => {
          const profile = raw.hr_organizations?.hr_organization_profile?.[0] || {};
          return {
            id:          raw.id,
            title:       raw.title,
            company:     raw.hr_organizations?.name || 'Company',
            logoUrl:     profile.logo_url,
            location:    Array.isArray(raw.location) ? raw.location.join(', ') : raw.location || '',
            description: raw.description || '',
            postedDate:  new Date(raw.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            type:        raw.job_type || 'Full-time',
          };
        });

        setJobs(formatted);
        setFilteredJobs(formatted);
        if (formatted.length > 0) {
          setSelectedJob(formatted[0]);           // auto-select first
          setCompanyInfo({
            name:    raw[0].hr_organizations?.name || 'Careers',
            logoUrl: profile.logo_url || '',
          });
        }
      } catch (err: any) {
        toast({ title: 'Error loading jobs', description: err.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  // Filter effect
  useEffect(() => {
    let result = [...jobs];

    const term = filters.searchTerm.toLowerCase().trim();
    if (term) {
      result = result.filter(j =>
        j.title.toLowerCase().includes(term) ||
        j.company.toLowerCase().includes(term)
      );
    }

    if (filters.location.trim()) {
      const loc = filters.location.toLowerCase().trim();
      result = result.filter(j => j.location.toLowerCase().includes(loc));
    }

    if (filters.remote) {
      result = result.filter(j => j.location.toLowerCase().includes('remote'));
    }

    setFilteredJobs(result);
    // Optional: reset selection if current one is filtered out
    if (selectedJob && !result.some(j => j.id === selectedJob.id)) {
      setSelectedJob(result[0] || null);
    }
  }, [filters, jobs, selectedJob]);

  const isMobile = window.innerWidth < 1024;

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden talent-bg">
      {/* ────── Fixed Header ────── */}
      <TalentHeader companyName={companyInfo.name} logoUrl={companyInfo.logoUrl} />

      {/* ────── Search + Filter Bar (also fixed) ────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shrink-0">
        <div className="talent-container">
          <TalentSearch
            searchTerm={filters.searchTerm}
            location={filters.location}
            onSearchChange={(field, value) =>
              setFilters(prev => ({ ...prev, [field]: value }))
            }
          />

          <div className="flex items-center gap-3 py-3 px-4 md:px-0 overflow-x-auto">
            <button className="talent-filter-btn flex items-center gap-1 whitespace-nowrap">
              Date posted <ChevronDown size={14} />
            </button>
            <button
              className={`talent-filter-btn ${filters.remote ? 'active' : ''}`}
              onClick={() => setFilters(p => ({ ...p, remote: !p.remote }))}
            >
              Remote
            </button>
            <button className="talent-filter-btn flex items-center gap-1 text-talent-purple whitespace-nowrap">
              <Star size={14} /> Quick Apply
            </button>
            <span className="ml-auto text-sm text-gray-500 hidden md:block">
              {filteredJobs.length} jobs found
            </span>
          </div>
        </div>
      </div>

      {/* ────── Main content ────── */}
      <div className="flex-1 flex overflow-hidden">
      {/* Left – Job List */}
      <div
        className={`
          w-full lg:w-5/12 lg:max-w-[480px] lg:border-r lg:border-gray-200
          ${isMobile && selectedJob ? 'hidden' : 'block'}
          overflow-y-auto custom-scrollbar bg-white
        `}
      >
          {loading ? (
            <div className="py-20 text-center text-gray-500">Loading jobs...</div>
          ) : filteredJobs.length === 0 ? (
            <div className="p-8 bg-white rounded-lg text-center border">
              No matching jobs found.
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4 px-1">
                <h2 className="font-bold text-lg">
                  {filters.searchTerm ? `Results for "${filters.searchTerm}"` : 'Job Openings'}
                </h2>
                <span className="text-xs text-gray-500 md:hidden">
                  {filteredJobs.length} found
                </span>
              </div>

              {filteredJobs.map(job => (
                <TalentJobCard
                  key={job.id}
                  job={job}
                  isSelected={selectedJob?.id === job.id}
                  onClick={() => {
                    setSelectedJob(job);
                    if (isMobile) {
                      window.scrollTo({ top: 0, behavior: 'instant' });
                    }
                  }}
                />
              ))}
            </>
          )}
        </div>

        {/* RIGHT – Job Detail */}
        <div
        className={`
          w-full lg:w-7/12 lg:flex-1
          ${isMobile && !selectedJob ? 'hidden' : 'block'}
          overflow-y-auto custom-scrollbar bg-gray-50
        `}
      >
        {isMobile && selectedJob && (
          <div className="sticky top-0 z-10 bg-white border-b p-3 flex items-center">
            <button
              onClick={() => setSelectedJob(null)}
              className="flex items-center gap-2 text-talent-purple font-medium"
            >
              <ArrowLeft size={20} /> Back to list
            </button>
          </div>
        )}

        {selectedJob ? (
          <TalentJobDetail job={selectedJob} onClose={() => setSelectedJob(null)} />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            Select a job to view details
          </div>
        )}
      </div>
    </div>

      {/* Simple footer */}
      <footer className="bg-white border-t py-8 text-center text-sm text-gray-500 mt-auto">
        <p>© 2026 {companyInfo.name || 'Company'} Careers</p>
      </footer>
    </div>
  );
};

export default TalentCareerPage;
// final