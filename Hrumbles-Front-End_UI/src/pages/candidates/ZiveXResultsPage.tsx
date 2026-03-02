// src/pages/candidates/ZiveXResultsPage.tsx
// REDESIGNED: Modern compact results page — all logic preserved

import { FC, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import CandidateSearchFilters from '@/components/candidates/zive-x/CandidateSearchFilters';
import CandidateSearchResults from '@/components/candidates/zive-x/CandidateSearchResults';
import Loader from '@/components/ui/Loader';
import { SearchFilters, CandidateSearchResult, SearchTag } from '@/types/candidateSearch';
import { ArrowLeft, Search, SlidersHorizontal, Users } from 'lucide-react';
import { useState } from 'react';

// ─── Helpers ────────────────────────────────────────────────────────────────

const stripQuotes = (v: string) => v.replace(/^"|"$/g, '').trim();
const wrapForFTS = (value: string): string => {
  const clean = stripQuotes(value);
  if (clean.includes(' ') && !clean.startsWith('"')) return `"${clean}"`;
  return clean;
};

// ─── Component ──────────────────────────────────────────────────────────────

const ZiveXResultsPage: FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const filters: SearchFilters = useMemo(() => {
    const getTags = (key: string): SearchTag[] => {
      const mandatory = searchParams.get(`mandatory_${key}`)?.split(',') || [];
      const optional = searchParams.get(`optional_${key}`)?.split(',') || [];
      return [
        ...mandatory.filter(Boolean).map(v => ({ value: stripQuotes(v), mandatory: true })),
        ...optional.filter(Boolean).map(v => ({ value: stripQuotes(v), mandatory: false })),
      ];
    };

    const jdText = searchParams.get('jd_text') ? decodeURIComponent(searchParams.get('jd_text')!) : undefined;
    const jdJobTitle = searchParams.get('jd_job_title') || undefined;
    const jdSelectedJobId = searchParams.get('jd_selected_job_id') || undefined;
    const jdGeneratedKeywords = searchParams.get('jd_generated_keywords')?.split('|||').filter(Boolean) || undefined;
    const jdIsBooleanMode = searchParams.get('jd_is_boolean_mode') === 'true';

    return {
      keywords: getTags('keywords'), skills: getTags('skills'), educations: getTags('educations'),
      locations: getTags('locations'), industries: getTags('industries'), companies: getTags('companies'),
      name: getTags('name'), email: getTags('email'),
      current_company: searchParams.get('current_company') || '',
      current_designation: searchParams.get('current_designation') || '',
      min_exp: searchParams.get('min_exp') ? parseInt(searchParams.get('min_exp')!) : null,
      max_exp: searchParams.get('max_exp') ? parseInt(searchParams.get('max_exp')!) : null,
      min_current_salary: searchParams.get('min_current_salary') ? parseFloat(searchParams.get('min_current_salary')!) : null,
      max_current_salary: searchParams.get('max_current_salary') ? parseFloat(searchParams.get('max_current_salary')!) : null,
      min_expected_salary: searchParams.get('min_expected_salary') ? parseFloat(searchParams.get('min_expected_salary')!) : null,
      max_expected_salary: searchParams.get('max_expected_salary') ? parseFloat(searchParams.get('max_expected_salary')!) : null,
      notice_periods: searchParams.get('notice_periods')?.split(',') || [],
      date_posted: searchParams.get('date_posted') || 'all_time',
      jd_text: jdText, jd_job_title: jdJobTitle, jd_selected_job_id: jdSelectedJobId,
      jd_generated_keywords: jdGeneratedKeywords, jd_is_boolean_mode: jdIsBooleanMode,
    };
  }, [searchParams]);

  const highlightTerms = useMemo(() => {
    const terms: string[] = [];
    const addTagGroup = (key: string) => {
      const mandatory = searchParams.get(`mandatory_${key}`)?.split(',') || [];
      const optional = searchParams.get(`optional_${key}`)?.split(',') || [];
      [...mandatory, ...optional].filter(Boolean).forEach(v => terms.push(stripQuotes(v)));
    };
    ['keywords', 'skills', 'companies', 'educations', 'locations'].forEach(addTagGroup);
    const cc = searchParams.get('current_company'); if (cc) terms.push(cc);
    const cd = searchParams.get('current_designation'); if (cd) terms.push(cd);
    return [...new Set(terms.filter(Boolean))];
  }, [searchParams]);

  const { data: searchResults = [], isLoading } = useQuery<CandidateSearchResult[]>({
    queryKey: ['candidateSearchResults', organizationId, filters],
    queryFn: async () => {
      const processTagsForRPC = (tags: SearchTag[] = []) => ({
        mandatory: tags.filter(t => t.mandatory).map(t => t.value),
        optional: tags.filter(t => !t.mandatory).map(t => t.value),
      });
      const keywords = processTagsForRPC(filters.keywords);
      const skills = processTagsForRPC(filters.skills);
      const companies = processTagsForRPC(filters.companies);
      const educations = processTagsForRPC(filters.educations);
      const locations = processTagsForRPC(filters.locations);
      const industries = processTagsForRPC(filters.industries);

      const { data, error } = await supabase.rpc('search_unified_candidates_v31', {
        p_mandatory_keywords: keywords.mandatory, p_optional_keywords: keywords.optional,
        p_mandatory_skills: skills.mandatory, p_optional_skills: skills.optional,
        p_mandatory_companies: companies.mandatory, p_optional_companies: companies.optional,
        p_mandatory_educations: educations.mandatory, p_optional_educations: educations.optional,
        p_mandatory_locations: locations.mandatory, p_optional_locations: locations.optional,
        p_name: filters.name?.[0]?.value || null, p_email: filters.email?.[0]?.value || null,
        p_current_company: filters.current_company || null, p_current_designation: filters.current_designation || null,
        p_min_exp: filters.min_exp, p_max_exp: filters.max_exp,
        p_min_current_salary: filters.min_current_salary, p_max_current_salary: filters.max_current_salary,
        p_min_expected_salary: filters.min_expected_salary, p_max_expected_salary: filters.max_expected_salary,
        p_notice_periods: filters.notice_periods,
        p_industries: [...industries.mandatory, ...industries.optional],
        p_date_filter: filters.date_posted, p_organization_id: organizationId,
      });
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const handleSearch = (newFilters: SearchFilters) => {
    const params = new URLSearchParams();
    const processTags = (key: string, tags: SearchTag[] = [], ftsField = false) => {
      const encode = (v: string) => ftsField ? wrapForFTS(v) : stripQuotes(v);
      const mandatory = tags.filter(t => t.mandatory).map(t => encode(t.value));
      const optional = tags.filter(t => !t.mandatory).map(t => encode(t.value));
      if (mandatory.length) params.append(`mandatory_${key}`, mandatory.join(','));
      if (optional.length) params.append(`optional_${key}`, optional.join(','));
    };
    processTags('keywords', newFilters.keywords, true);
    processTags('locations', newFilters.locations, true);
    processTags('skills', newFilters.skills, false);
    processTags('companies', newFilters.companies, false);
    processTags('educations', newFilters.educations, false);
    processTags('industries', newFilters.industries, false);
    processTags('name', newFilters.name, false);
    processTags('email', newFilters.email, false);
    if (newFilters.current_company) params.append('current_company', newFilters.current_company);
    if (newFilters.current_designation) params.append('current_designation', newFilters.current_designation);
    if (newFilters.min_exp) params.append('min_exp', newFilters.min_exp.toString());
    if (newFilters.max_exp) params.append('max_exp', newFilters.max_exp.toString());
    if (newFilters.min_current_salary) params.append('min_current_salary', newFilters.min_current_salary.toString());
    if (newFilters.max_current_salary) params.append('max_current_salary', newFilters.max_current_salary.toString());
    if (newFilters.min_expected_salary) params.append('min_expected_salary', newFilters.min_expected_salary.toString());
    if (newFilters.max_expected_salary) params.append('max_expected_salary', newFilters.max_expected_salary.toString());
    if (newFilters.notice_periods?.length) params.append('notice_periods', newFilters.notice_periods.join(','));
    if (newFilters.date_posted && newFilters.date_posted !== 'all_time') params.append('date_posted', newFilters.date_posted);
    if (newFilters.jd_text) params.append('jd_text', encodeURIComponent(newFilters.jd_text));
    if (newFilters.jd_job_title) params.append('jd_job_title', newFilters.jd_job_title);
    if (newFilters.jd_selected_job_id) params.append('jd_selected_job_id', newFilters.jd_selected_job_id);
    if (newFilters.jd_generated_keywords?.length) params.append('jd_generated_keywords', newFilters.jd_generated_keywords.join('|||'));
    if (newFilters.jd_is_boolean_mode !== undefined) params.append('jd_is_boolean_mode', newFilters.jd_is_boolean_mode.toString());
    navigate(`/zive-x-search/results?${params.toString()}`, { replace: true });
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.keywords?.length) count++;
    if (filters.skills?.length) count++;
    if (filters.locations?.length) count++;
    if (filters.companies?.length) count++;
    if (filters.educations?.length) count++;
    if (filters.current_company) count++;
    if (filters.current_designation) count++;
    if (filters.min_exp || filters.max_exp) count++;
    if (filters.notice_periods?.length) count++;
    return count;
  }, [filters]);

  return (
    <>
      <style>{`
        /* ── RESULTS PAGE ROOT ── */
        .zxr-page {
          min-height: 100vh;
          background: #F4F5F7;
          font-family: 'Inter', system-ui, sans-serif;
          --brand: #6C2BD9;
          --brand-light: #EDE9FE;
          --border: #E5E7EB;
          --text-primary: #111827;
          --text-secondary: #6B7280;
          --radius: 10px;
          --transition: 150ms cubic-bezier(0.4,0,0.2,1);
        }

        /* ── TOP BAR ── */
        .zxr-topbar {
          height: 52px;
          background: white;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          position: sticky;
          top: 0;
          z-index: 30;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }

        .zxr-topbar-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .zxr-back-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition);
          color: #6B7280;
          flex-shrink: 0;
        }
        .zxr-back-btn:hover {
          border-color: #C4B5FD;
          color: var(--brand);
          background: var(--brand-light);
        }

        .zxr-topbar-info {}
        .zxr-topbar-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
          line-height: 1.2;
        }
        .zxr-topbar-sub {
          font-size: 11px;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .zxr-topbar-sub .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
          animation: zxr-pulse 2s infinite;
        }
        @keyframes zxr-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .zxr-filter-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          border: 1.5px solid var(--border);
          background: white;
          cursor: pointer;
          font-size: 12.5px;
          font-weight: 600;
          color: #374151;
          transition: all var(--transition);
        }
        .zxr-filter-btn:hover { border-color: #C4B5FD; color: var(--brand); background: var(--brand-light); }
        .zxr-filter-btn.active { border-color: var(--brand); color: var(--brand); background: var(--brand-light); }
        .zxr-filter-badge {
          font-size: 9.5px;
          font-weight: 700;
          padding: 1px 5px;
          border-radius: 99px;
          background: var(--brand);
          color: white;
          line-height: 1.4;
        }

        /* ── LAYOUT ── */
        .zxr-layout {
          display: flex;
          max-width: 1920px;
          margin: 0 auto;
          min-height: calc(100vh - 52px);
        }

        /* ── SIDEBAR ── */
        .zxr-sidebar {
          width: 300px;
          flex-shrink: 0;
          border-right: 1px solid var(--border);
          background: white;
          overflow-y: auto;
          max-height: calc(100vh - 52px);
          position: sticky;
          top: 52px;
          transition: width 0.25s ease, opacity 0.25s ease;
        }
        .zxr-sidebar.collapsed {
          width: 0;
          overflow: hidden;
          border-right: none;
          opacity: 0;
        }
        .zxr-sidebar::-webkit-scrollbar { width: 4px; }
        .zxr-sidebar::-webkit-scrollbar-track { background: transparent; }
        .zxr-sidebar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 4px; }
        .zxr-sidebar::-webkit-scrollbar-thumb:hover { background: #D1D5DB; }

        /* ── MAIN RESULTS AREA ── */
        .zxr-main {
          flex: 1;
          min-width: 0;
          padding: 16px 20px;
          overflow: hidden;
        }

        /* ── LOADING STATE ── */
        .zxr-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 320px;
          background: white;
          border-radius: var(--radius);
          border: 1px solid var(--border);
          gap: 12px;
          color: var(--text-secondary);
          font-size: 13.5px;
        }
        .zxr-loading-ring {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 3px solid var(--brand-light);
          border-top-color: var(--brand);
          animation: zxr-spin 0.8s linear infinite;
        }
        @keyframes zxr-spin { to { transform: rotate(360deg); } }

        /* ── RESULTS HEADER ── */
        .zxr-results-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .zxr-results-count {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .zxr-results-count .badge {
          background: var(--brand-light);
          color: var(--brand);
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 99px;
        }

        @media (max-width: 1024px) { .zxr-sidebar { width: 260px; } }
        @media (max-width: 768px) {
          .zxr-sidebar {
            position: fixed; top: 52px; left: 0; bottom: 0; z-index: 40;
            width: 100%; max-width: 320px; box-shadow: 4px 0 20px rgba(0,0,0,0.1);
          }
          .zxr-sidebar.collapsed { width: 0; transform: translateX(-100%); }
        }
      `}</style>

      <div className="zxr-page">
        {/* ── TOP BAR ── */}
        <div className="zxr-topbar">
          <div className="zxr-topbar-left">
            <button className="zxr-back-btn" onClick={() => navigate(-1)} title="Go Back">
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <div className="zxr-topbar-info">
              <div className="zxr-topbar-title">Candidate Search</div>
              <div className="zxr-topbar-sub">
                {isLoading ? (
                  <><div className="zxr-loading-ring" style={{width:8,height:8,borderWidth:1.5}} /><span>Searching...</span></>
                ) : (
                  <><div className="dot" /><span>{searchResults.length} candidates found</span></>
                )}
              </div>
            </div>
          </div>
          <button
            className={`zxr-filter-btn ${sidebarOpen ? 'active' : ''}`}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && <span className="zxr-filter-badge">{activeFilterCount}</span>}
          </button>
        </div>

        {/* ── LAYOUT ── */}
        <div className="zxr-layout">
          {/* Sidebar */}
          <aside className={`zxr-sidebar ${!sidebarOpen ? 'collapsed' : ''}`}>
            <CandidateSearchFilters
              onSearch={handleSearch}
              isSearching={isLoading}
              initialFilters={filters}
              organizationId={organizationId}
              hideHero={true}
            />
          </aside>

          {/* Main */}
          <main className="zxr-main">
            {!isLoading && (
              <div className="zxr-results-header">
                <div className="zxr-results-count">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span>Results</span>
                  <span className="badge">{searchResults.length}</span>
                </div>
              </div>
            )}
            {isLoading ? (
              <div className="zxr-loading">
                <div className="zxr-loading-ring" />
                <span>Finding best candidates...</span>
              </div>
            ) : (
              <CandidateSearchResults results={searchResults} highlightTerms={highlightTerms} />
            )}
          </main>
        </div>
      </div>
    </>
  );
};

export default ZiveXResultsPage;