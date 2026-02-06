import React, { useState, useEffect, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { Filter, ChevronDown, Star, ArrowLeft, Menu, Search, MapPin, Heart, Clock, Briefcase, Share2, Check, Bell } from 'lucide-react';
import QuickApplyModal from './QuickApplyModal';
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
};

const ITEMS_PER_PAGE = 10;

const TalentCareerPage = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [companyInfo, setCompanyInfo] = useState({ name: '', logoUrl: '', organizationId: '' });
  const [filters, setFilters] = useState({
    searchTerm: '',
    location: '',
    datePosted: 'any',
    remote: false,
  });
  const [loading, setLoading] = useState(true);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [showQuickApply, setShowQuickApply] = useState(false);
  const { toast } = useToast();
  

  const jobListRef = useRef<HTMLDivElement>(null);

  // Fetch jobs
  useEffect(() => {
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

    const fetchJobs = async () => {
      try {
        const subdomain = getSubdomain();
        const { data, error } = await supabase.functions.invoke('get-public-jobs-new', {
          body: { subdomain },
        });

        if (error) throw error;

        const formatted: Job[] = data.map((raw: any) => {
          const profile =
  raw.hr_organizations?.hr_organization_profile
    ? Array.isArray(raw.hr_organizations.hr_organization_profile)
      ? raw.hr_organizations.hr_organization_profile[0] || {}
      : raw.hr_organizations.hr_organization_profile
    : {};

          return {
            id: raw.id,
            title: raw.title,
            company: raw.hr_organizations?.name || 'Company',
            logoUrl: profile.logo_url,
            location: Array.isArray(raw.location) ? raw.location.join(', ') : raw.location || '',
            description: raw.description || '',
            postedDate: new Date(raw.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            type: raw.job_type || 'Full-time',
          };
        });

        setJobs(formatted);
        setFilteredJobs(formatted);
        if (formatted.length > 0) {
          setSelectedJob(formatted[0]);
          setCompanyInfo({
            name: data[0]?.hr_organizations?.name || 'Careers',
            logoUrl: formatted[0]?.logoUrl || '',
            organizationId: data[0]?.organization_id || '', // Store organizationId
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

  // Filter jobs
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
    setCurrentPage(1);
    if (selectedJob && !result.some(j => j.id === selectedJob.id)) {
      setSelectedJob(result[0] || null);
    }
  }, [filters, jobs, selectedJob]);

  // Calculate pagination values
  const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentPageJobs = filteredJobs.slice(startIndex, endIndex);

  // ──────────────────────────────────────────────────────────────
  // Pagination handlers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Optional: scroll to top of job list
      jobListRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const goToNext = () => goToPage(currentPage + 1);
  const goToPrev = () => goToPage(currentPage - 1);

  const isMobile = window.innerWidth < 1024;

  const handleJobClick = (job: Job) => {
    setSelectedJob(job);
    if (isMobile) {
      setShowMobileDetail(true);
    }
  };

  const handleBackToList = () => {
    setShowMobileDetail(false);
  };

    console.log('selectedJob', selectedJob);
  console.log('companyInfo', companyInfo);

  return (
    <div className="talent-page-wrapper">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* FIXED HEADER */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <header className="talent-header">
        <div className="talent-header-container">
          <div className="talent-header-left">
            {companyInfo.logoUrl ? (
              <img src={companyInfo.logoUrl} alt={companyInfo.name} className="talent-header-logo" />
            ) : (
              <div className="talent-header-logo-placeholder">
                {companyInfo.name.charAt(0)}
              </div>
            )}
            {/* <div className="talent-header-title">
              <span className="talent-header-brand">{companyInfo.name}</span>
              <span className="talent-header-subtitle">Careers</span>
            </div> */}
          </div>
          {/* <div className="talent-header-right">
            <button className="talent-header-signin">Sign in</button>
            <button className="talent-header-menu">
              <Menu size={24} />
            </button>
          </div> */}
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SEARCH SECTION (FIXED) */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="talent-search-section">
        <div className="talent-search-container">
          <div className="talent-search-inputs">
            <div className="talent-search-input-wrapper">
              <Search className="talent-search-icon" size={20} />
              <input
                type="text"
                placeholder="Job title, keywords, or company"
                className="talent-search-input"
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
              />
            </div>

            <div className="talent-search-input-wrapper">
              <MapPin className="talent-search-icon" size={20} />
              <input
                type="text"
                placeholder="City, state, or 'Remote'"
                className="talent-search-input"
                value={filters.location}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
              />
            </div>

              <button
            
            className="mt-2 flex items-center gap-3 pl-1.5 pr-6 py-1 rounded-full text-white font-bold bg-[#7731E8] hover:bg-[#6528cc] shadow-[0_4px_15px_rgba(119,49,232,0.4)] hover:shadow-[0_6px_20px_rgba(119,49,232,0.6)] transform hover:scale-105 transition-all duration-300 group h-10"
          >
            {/* The "Card" Inside (White 3D Bubble) */}
            <div className="relative flex items-center justify-center w-7 h-7 mr-1">
              {/* 1. Glow behind the white card */}
              <div className="absolute inset-0 bg-white blur-md scale-110 opacity-50 animate-pulse"></div>
              
              {/* 2. The White 3D Sphere Container */}
              <div className="relative w-full h-full rounded-full flex items-center justify-center z-10 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1),0_4px_6px_rgba(0,0,0,0.2)]"
                   style={{ background: 'radial-gradient(circle at 30% 30%, #ffffff, #f1f5f9)' }}
              >
                {/* 3. The Purple Gradient Plus Icon */}
                <svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  fill="none"
  className="w-5 h-5"
  style={{ filter: 'drop-shadow(0 2px 2px rgba(119,49,232,0.3))' }}
>
  <defs>
    <linearGradient id="purpleIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#9d5cff" />
      <stop offset="100%" stopColor="#5b21b6" />
    </linearGradient>
  </defs>

 
  <circle
    cx="11"
    cy="11"
    r="6"
    stroke="url(#purpleIconGrad)"
    strokeWidth="2.5"
  />

  <line
    x1="16"
    y1="16"
    x2="21"
    y2="21"
    stroke="url(#purpleIconGrad)"
    strokeWidth="3"
    strokeLinecap="round"
  />
</svg>

              </div>
            </div>
            
            {/* Button Text */}
            <span className="tracking-wide text-sm relative z-10">Find Job</span>
          </button>
          </div>

          {/* Filter Pills */}
          {/* <div className="talent-filter-pills">
            <button className="talent-pill">
              Date posted <ChevronDown size={14} />
            </button>
            <button className="talent-pill">25 km ×</button>
            <button
              className={`talent-pill ${filters.remote ? 'talent-pill-active' : ''}`}
              onClick={() => setFilters(p => ({ ...p, remote: !p.remote }))}
            >
              Remote
            </button>
            <button className="talent-pill talent-pill-accent">
              <Star size={14} /> Quick Apply
            </button>
            <button className="talent-pill">Company</button>
          </div> */}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT AREA */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="talent-main-content">
        {/* Mobile back button when detail view is shown */}
        {isMobile && showMobileDetail && (
          <div className="talent-mobile-back">
            <button onClick={handleBackToList} className="talent-back-btn">
              <ArrowLeft size={20} /> Back to list
            </button>
          </div>
        )}

        {/* LEFT COLUMN - Job List (70%) */}
        <div className={`talent-job-list ${isMobile && showMobileDetail ? 'talent-hidden-mobile' : ''}`} ref={jobListRef}>
          <div className="talent-job-list-header">
            <h2 className="talent-job-list-title">
              {filters.searchTerm 
                ? `Developer And Designer Jobs in ${filters.location || 'Coimbatore'}`
                : 'Job Openings'}
            </h2>
            <span className="talent-job-count">{filteredJobs.length} jobs found</span>
          </div>

          {/* Job Alert Banner */}
    

          {/* Last Updated Info */}
          {/* <div className="talent-last-updated">
            Last updated: 15 hours ago
          </div> */}

          {/* Job Cards */}
          {loading ? (
            <div className="talent-loading">Loading jobs...</div>
          ) : filteredJobs.length === 0 ? (
            <div className="talent-no-results">No matching jobs found.</div>
          ) : (
            <div className="talent-job-cards">
              {currentPageJobs.map((job, idx) => (
                <div
                  key={job.id}
                  className={`talent-job-card ${selectedJob?.id === job.id ? 'talent-job-card-selected' : ''}`}
                  onClick={() => handleJobClick(job)}
                >
                  {idx === 1 && <div className="talent-promoted-badge">Promoted</div>}
                  
                  <div className="talent-job-card-content">
                    <div className="talent-job-card-left">
                      {job.logoUrl ? (
                        <img src={job.logoUrl} alt={job.company} className="talent-company-logo" />
                      ) : (
                        <div className="talent-company-logo-placeholder">
                          {job.company.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="talent-job-card-middle">
                      <h3 className="talent-job-title">{job.title}</h3>
                      <div className="talent-company-name">{job.company}</div>
                      <div className="talent-job-location">{job.location}</div>
                      <p className="talent-job-snippet">
                        {job.description.substring(0, 150)}...
                        {' '}<span className="talent-show-more">Show more</span>
                      </p>
                      <div className="talent-job-meta">
                        Last updated: {job.postedDate}
                      </div>
                    </div>

                    <div className="talent-job-card-right">
                      <button className="talent-save-btn">
                        <Heart size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
{!loading && filteredJobs.length > 0 && (
    <div className="talent-pagination">
      <button
        className="talent-pagination-btn"
        onClick={goToPrev}
        disabled={currentPage === 1}
      >
        ← Prev
      </button>

      {/* Show page numbers – simple version */}
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
        <button
          key={page}
          className={`talent-pagination-btn ${currentPage === page ? 'talent-pagination-active' : ''}`}
          onClick={() => goToPage(page)}
        >
          {page}
        </button>
      ))}

      <button
        className="talent-pagination-btn"
        onClick={goToNext}
        disabled={currentPage === totalPages}
      >
        Next →
      </button>
    </div>
  )}
        </div>

        {/* RIGHT COLUMN - Job Detail (30%) - STICKY */}
        <div className={`talent-job-detail ${isMobile && !showMobileDetail ? 'talent-hidden-mobile' : ''}`}>
          {selectedJob ? (
            <div className="talent-detail-card">
              {/* Header with logo */}
              <div className="talent-detail-header">
                {selectedJob.logoUrl ? (
                  <img src={selectedJob.logoUrl} alt={selectedJob.company} className="talent-detail-logo" />
                ) : (
                  <div className="talent-detail-logo-placeholder">
                    {selectedJob.company.charAt(0)}
                  </div>
                )}
              </div>

              {/* Title & Company */}
              <h1 className="talent-detail-title">{selectedJob.title}</h1>
              <div className="talent-detail-company">{selectedJob.company}</div>
              <div className="talent-detail-location">{selectedJob.location}</div>
              <div className="talent-detail-posted">{selectedJob.postedDate}</div>

              {/* Apply Button */}
              <div className="talent-detail-actions">
                {/* <button 
                  className="talent-apply-btn"
                  onClick={() => setShowQuickApply(true)}
                >
                  <Check size={18} /> Quick Apply
                </button> */}
                                          <button
           onClick={() => setShowQuickApply(true)}
            className="w-full flex items-center justify-center gap-3 pl-1.5 pr-6 py-1 rounded-full text-white font-bold bg-[#7731E8] hover:bg-[#6528cc] shadow-[0_4px_15px_rgba(119,49,232,0.4)] hover:shadow-[0_6px_20px_rgba(119,49,232,0.6)] transform hover:scale-105 transition-all duration-300 group h-18"
          >
            {/* The "Card" Inside (White 3D Bubble) */}
            <div className="relative flex items-center justify-center w-7 h-7 mr-1">
              {/* 1. Glow behind the white card */}
              <div className="absolute inset-0 bg-white blur-md scale-110 opacity-50 animate-pulse"></div>
              
              {/* 2. The White 3D Sphere Container */}
              <div className="relative w-full h-full rounded-full flex items-center justify-center z-10 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.1),0_4px_6px_rgba(0,0,0,0.2)]"
                   style={{ background: 'radial-gradient(circle at 30% 30%, #ffffff, #f1f5f9)' }}
              >
                {/* 3. The Purple Gradient Plus Icon */}
                <svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  fill="none"
  className="w-5 h-5"
  style={{ filter: 'drop-shadow(0 2px 2px rgba(119,49,232,0.3))' }}
>
  <defs>
    <linearGradient id="purpleIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#9d5cff" />
      <stop offset="100%" stopColor="#5b21b6" />
    </linearGradient>
  </defs>

  <path
    d="M5 13l4 4L19 7"
    stroke="url(#purpleIconGrad)"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
</svg>

              </div>
            </div>
            
            {/* Button Text */}
            <span className="tracking-wide text-sm relative z-10">Quick Apply</span>
          </button>
                {/* <button className="talent-icon-btn">
                  <Heart size={20} />
                </button> */}

              </div>

              {/* Job Type & Location Info */}
              <div className="talent-detail-info-grid">
                <div className="talent-info-box">
                  <div className="talent-info-label">
                    <Briefcase size={16} /> Job type
                  </div>
                  <div className="talent-info-value">{selectedJob.type || 'Full-time'}</div>
                </div>
                <div className="talent-info-box">
                  <div className="talent-info-label">
                    <MapPin size={16} /> Location
                  </div>
                  <div className="talent-info-value">{selectedJob.location}</div>
                </div>
              </div>

              {/* Job Description */}
              <div className="talent-detail-section">
                <h3 className="talent-section-title">Job description</h3>
                <div className="talent-section-content">
                  {selectedJob.description}
                </div>
              </div>

              {/* Qualifications */}
              {/* <div className="talent-detail-section">
                <h3 className="talent-section-title">Qualifications:</h3>
                <div className="talent-section-label">Educational qualification:</div>
                <div className="talent-section-content">B.E;</div>

                <div className="talent-section-label">Experience:</div>
                <div className="talent-section-content">3 to 4 years of experience</div>

                <div className="talent-section-label">Mandatory/requires Skills:</div>
                <div className="talent-section-content">
                  Java Basic knowledge of object-oriented programming and application logic
                </div>
              </div> */}

              {/* Related Jobs Footer */}
              {/* <div className="talent-detail-footer">
                <button className="talent-related-jobs-btn">
                  View related jobs →
                </button>
              </div> */}
            </div>
          ) : (
            <div className="talent-detail-empty">
              Select a job to view details
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* FOOTER */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <footer className="talent-footer">
        {/* <div className="talent-footer-content">
          <div className="talent-footer-column">
            <h4 className="talent-footer-title">For job seekers</h4>
            <ul className="talent-footer-links">
              <li>Search jobs</li>
              <li>Search salary</li>
              <li>Tax calculator</li>
              <li>Salary converter</li>
            </ul>
          </div>
          <div className="talent-footer-column">
            <h4 className="talent-footer-title">For employers</h4>
            <ul className="talent-footer-links">
              <li>Enterprise</li>
              <li>ATS</li>
              <li>Publisher programs</li>
            </ul>
          </div>
          <div className="talent-footer-column">
            <h4 className="talent-footer-title">{companyInfo.name || 'Talent.com'}</h4>
            <ul className="talent-footer-links">
              <li>More countries</li>
              <li>Terms of Service</li>
              <li>Privacy Policy</li>
              <li>Cookie Policy</li>
            </ul>
          </div>
        </div> */}
       <div className="talent-footer-copyright">
  <img
    src="xrilic/Xrilic Recruit.svg"
    alt={companyInfo.name}
    className="footer-logo"
  />
  © 2026 {companyInfo.name || 'Company'} Careers
</div>

      </footer>

      {/* Quick Apply Modal */}
      {selectedJob && (
        <QuickApplyModal
          isOpen={showQuickApply}
          onClose={() => setShowQuickApply(false)}
          job={{
            id: selectedJob.id,
            title: selectedJob.title,
            company: selectedJob.company,
            logoUrl: selectedJob.logoUrl,
          }}
          organizationId={companyInfo.organizationId}
        />
      )}
    </div>
  );
};

export default TalentCareerPage;