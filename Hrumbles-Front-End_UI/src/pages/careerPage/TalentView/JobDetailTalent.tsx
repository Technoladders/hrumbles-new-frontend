import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Briefcase, Clock, DollarSign,
  BookOpen, Zap, Users, ChevronRight, Bookmark, Share2
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import QuickApplyModal from './QuickApplyModal';
import './talent-detail-theme.css';

interface ExperienceRange {
  min?: { years?: number; months?: number };
  max?: { years?: number; months?: number };
}

interface JobDetail {
  id: string;
  title: string;
  location: string | string[];
  job_type: string;
  posted_date: string;
  description: string;
  budget: number | null;
  budget_type: string | null;
  skills: string[] | string | null;
  experience: string | ExperienceRange | null;
  organization_id: string;
}

const JobDetailTalent: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>('');

  useEffect(() => {
    if (!jobId) return;
    const fetchJob = async () => {
      setLoading(true);
      try {
        const { data, error: fnErr } = await supabase.functions.invoke('get-public-job-by-id', {
          body: { jobId },
        });
        if (fnErr) throw new Error(fnErr.message);
        if (data?.error) throw new Error(data.error);
        setJob(data);

        console.log('jobdetail', data);

        if (data?.organization_id) {
          const { data: org } = await supabase
            .from('hr_organization_profiles')
            .select('name, logo_url')
            .eq('id', data.organization_id)
            .single();
          if (org) {
            setOrgName(org.name || '');
            setOrgLogoUrl(org.logo_url || null);
          }
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [jobId]);

  // ── Helpers ──────────────────────────────────────────────────

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return `${diff} days ago`;
    if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatBudget = (budget: number | null, type: string | null): string | null => {
    if (!budget) return null;
    const formatted = new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', maximumFractionDigits: 0,
    }).format(budget);
    return type ? `${formatted} / ${type}` : formatted;
  };

  /**
   * experience can come back as:
   *   - a plain string:  "6-9 years"
   *   - an object:  { min: { years: 6, months: 0 }, max: { years: 9, months: 0 } }
   * Always returns a safe string for rendering.
   */
  const formatExperience = (exp: string | ExperienceRange | null): string => {
    if (!exp) return '';
    if (typeof exp === 'string') return exp;
    const minYrs = exp.min?.years ?? 0;
    const maxYrs = exp.max?.years ?? 0;
    if (minYrs === maxYrs) return `${minYrs} year${minYrs !== 1 ? 's' : ''}`;
    if (!maxYrs) return `${minYrs}+ years`;
    return `${minYrs} – ${maxYrs} years`;
  };

  /**
   * location can be a plain string or an array of strings.
   */
  const formatLocation = (loc: string | string[] | null): string => {
    if (!loc) return '';
    if (Array.isArray(loc)) return loc.join(', ');
    return loc;
  };

  /**
   * skills can be an array or a comma-separated string.
   */
  const parseSkills = (raw: string[] | string | null): string[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  };

  // ── Derived display values ───────────────────────────────────
  const skills       = job ? parseSkills(job.skills) : [];
  const locationStr  = job ? formatLocation(job.location) : '';
  const experienceStr= job ? formatExperience(job.experience) : '';
  const budgetStr    = job ? formatBudget(job.budget, job.budget_type) : null;

  // ── Loading / Error ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="talent-page-wrapper">
        <div className="jd-loading-state">
          <div className="jd-loading-spinner" />
          <p>Loading job details…</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="talent-page-wrapper">
        <div className="jd-error-state">
          <h2>Job not found</h2>
          <p>{error || 'This listing may have been removed.'}</p>
          <button onClick={() => navigate('/careers')} className="jd-back-btn">
            <ArrowLeft size={16} /> Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="talent-page-wrapper">

      {/* ── Top Bar ── */}
      <div className="jd-topbar">
        <div className="jd-topbar-inner">
          <button className="jd-back-btn" onClick={() => navigate('/careers')}>
            <ArrowLeft size={15} />
            <span>All Jobs</span>
          </button>
          <div className="jd-topbar-actions">
            {/* <button className="jd-icon-btn" title="Save job">
              <Bookmark size={16} />
            </button> */}
            <button
              className="jd-icon-btn"
              title="Share job"
              onClick={() => navigator.share?.({ title: job.title, url: window.location.href })}
            >
              <Share2 size={16} />
            </button>
            <button className="jd-apply-pill" onClick={() => setIsModalOpen(true)}>
              Apply Now <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Hero ── */}
      <div className="jd-hero">
        <div className="jd-hero-inner">
          {orgLogoUrl
            ? <img src={orgLogoUrl} alt={orgName} className="jd-hero-logo" />
            : <div className="jd-hero-logo-placeholder">{(orgName || job.title).charAt(0)}</div>
          }
          <div className="jd-hero-info">
            <h1 className="jd-hero-title">{job.title}</h1>
            {orgName && <p className="jd-hero-company">{orgName}</p>}
            <div className="jd-hero-chips">
              {locationStr && (
                <span className="jd-chip jd-chip--location">
                  <MapPin size={12} /> {locationStr}
                </span>
              )}
              {job.job_type && (
                <span className="jd-chip jd-chip--type">
                  <Briefcase size={12} /> {job.job_type}
                </span>
              )}
              {job.posted_date && (
                <span className="jd-chip jd-chip--date">
                  <Clock size={12} /> {formatDate(job.posted_date)}
                </span>
              )}
             
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div className="jd-body">

        {/* LEFT SIDEBAR */}
        <aside className="jd-sidebar">

          {/* Quick Apply CTA */}
          <div className="jd-sidebar-cta">
            <p className="jd-sidebar-cta-label">Ready to apply?</p>
            <button className="jd-apply-full-btn" onClick={() => setIsModalOpen(true)}>
              Quick Apply
              <span className="jd-apply-btn-orb">
                <span className="jd-apply-btn-orb-inner">
                  <Zap size={13} />
                </span>
              </span>
            </button>
          </div>

          {/* Experience */}
          {experienceStr && (
            <div className="jd-sidebar-card">
              <div className="jd-sidebar-card-header">
                <Users size={15} />
                <span>Experience</span>
              </div>
              <p className="jd-sidebar-card-value">{experienceStr}</p>
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div className="jd-sidebar-card">
              <div className="jd-sidebar-card-header">
                <BookOpen size={15} />
                <span>Required Skills</span>
              </div>
              <div className="jd-skills-list">
                {skills.map((skill, i) => (
                  <span key={i} className="jd-skill-tag">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {/* Job Details mini-list */}
          <div className="jd-sidebar-card">
            <div className="jd-sidebar-card-header">
              <Briefcase size={15} />
              <span>Job Details</span>
            </div>
            <ul className="jd-details-list">
              {job.job_type && (
                <li>
                  <span className="jd-details-key">Type</span>
                  <span className="jd-details-val">{job.job_type}</span>
                </li>
              )}
              {locationStr && (
                <li>
                  <span className="jd-details-key">Location</span>
                  <span className="jd-details-val">{locationStr}</span>
                </li>
              )}
              {/* {budgetStr && (
                <li>
                  <span className="jd-details-key">Salary</span>
                  <span className="jd-details-val">{budgetStr}</span>
                </li>
              )} */}
              {job.posted_date && (
                <li>
                  <span className="jd-details-key">Posted</span>
                  <span className="jd-details-val">{formatDate(job.posted_date)}</span>
                </li>
              )}
            </ul>
          </div>

        </aside>

        {/* RIGHT: Description */}
        <main className="jd-main">
          <div className="jd-desc-card">
            <h2 className="jd-desc-title">Job Description</h2>
            <div className="jd-desc-body">
              {job.description || 'No description provided.'}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="jd-bottom-cta">
            <div>
              <p className="jd-bottom-cta-title">Interested in this role?</p>
              <p className="jd-bottom-cta-sub">Apply now — takes less than 2 minutes with Quick Apply.</p>
            </div>
            <button className="jd-apply-full-btn jd-apply-full-btn--cta" onClick={() => setIsModalOpen(true)}>
              Quick Apply
              <span className="jd-apply-btn-orb">
                <span className="jd-apply-btn-orb-inner">
                  <Zap size={13} />
                </span>
              </span>
            </button>
          </div>
        </main>
      </div>

      {/* Quick Apply Modal */}
      {job && (
        <QuickApplyModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          job={{
            id: job.id,
            title: job.title,
            company: orgName,
            logoUrl: orgLogoUrl || undefined,
          }}
          organizationId={job.organization_id}
        />
      )}
    </div>
  );
};

export default JobDetailTalent;