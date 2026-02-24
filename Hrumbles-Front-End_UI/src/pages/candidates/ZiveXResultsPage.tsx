// src/pages/candidates/ZiveXResultsPage.tsx
// REDESIGNED: Clean, modern results page with compact sidebar

import { FC, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import CandidateSearchFilters from '@/components/candidates/zive-x/CandidateSearchFilters';
import CandidateSearchResults from '@/components/candidates/zive-x/CandidateSearchResults';
import Loader from '@/components/ui/Loader';
import { SearchFilters, CandidateSearchResult, SearchTag } from '@/types/candidateSearch';
import { ArrowLeft, Search, SlidersHorizontal } from 'lucide-react';
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
      keywords: getTags('keywords'),
      skills: getTags('skills'),
      educations: getTags('educations'),
      locations: getTags('locations'),
      industries: getTags('industries'),
      companies: getTags('companies'),
      name: getTags('name'),
      email: getTags('email'),
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
      jd_text: jdText,
      jd_job_title: jdJobTitle,
      jd_selected_job_id: jdSelectedJobId,
      jd_generated_keywords: jdGeneratedKeywords,
      jd_is_boolean_mode: jdIsBooleanMode,
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
    const cc = searchParams.get('current_company');
    if (cc) terms.push(cc);
    const cd = searchParams.get('current_designation');
    if (cd) terms.push(cd);
    return [...new Set(terms.filter(Boolean))];
  }, [searchParams]);

  // ── RPC search query ─────────────────────────────────────────────────────
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

      const { data, error } = await supabase.rpc('search_unified_candidates_v30', {
        p_mandatory_keywords: keywords.mandatory, p_optional_keywords: keywords.optional,
        p_mandatory_skills: skills.mandatory, p_optional_skills: skills.optional,
        p_mandatory_companies: companies.mandatory, p_optional_companies: companies.optional,
        p_mandatory_educations: educations.mandatory, p_optional_educations: educations.optional,
        p_mandatory_locations: locations.mandatory, p_optional_locations: locations.optional,
        p_name: filters.name?.[0]?.value || null,
        p_email: filters.email?.[0]?.value || null,
        p_current_company: filters.current_company || null,
        p_current_designation: filters.current_designation || null,
        p_min_exp: filters.min_exp,
        p_max_exp: filters.max_exp,
        p_min_current_salary: filters.min_current_salary,
        p_max_current_salary: filters.max_current_salary,
        p_min_expected_salary: filters.min_expected_salary,
        p_max_expected_salary: filters.max_expected_salary,
        p_notice_periods: filters.notice_periods,
        p_industries: [...industries.mandatory, ...industries.optional],
        p_date_filter: filters.date_posted,
        p_organization_id: organizationId,
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

  // ── Active filter count ──────────────────────────────────────────────────
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
        .zx-results-page {
          min-height: 100vh;
          background: #F8F9FB;
        }
        .zx-results-topbar {
          background: white;
          border-bottom: 1px solid #E5E7EB;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 30;
        }
        .zx-topbar-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .zx-back-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid #E5E7EB;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          color: #6B7280;
        }
        .zx-back-btn:hover {
          border-color: #DDD6FE;
          color: #6C2BD9;
          background: #F5F0FF;
        }
        .zx-topbar-title {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
        }
        .zx-topbar-subtitle {
          font-size: 12px;
          color: #9CA3AF;
          margin-top: -2px;
        }
        .zx-filter-toggle {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid #E5E7EB;
          background: white;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          transition: all 0.15s;
        }
        .zx-filter-toggle:hover {
          border-color: #DDD6FE;
          color: #6C2BD9;
        }
        .zx-filter-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 10px;
          background: #6C2BD9;
          color: white;
          line-height: 1;
        }
        .zx-results-layout {
          display: flex;
          max-width: 1920px;
          margin: 0 auto;
          min-height: calc(100vh - 60px);
        }
        .zx-sidebar {
          width: 420px;
          flex-shrink: 0;
          border-right: 1px solid #E5E7EB;
          background: white;
          overflow-y: auto;
          max-height: calc(100vh - 60px);
          position: sticky;
          top: 60px;
          transition: all 0.25s ease;
        }
        .zx-sidebar.collapsed {
          width: 0;
          overflow: hidden;
          border-right: none;
        }
        .zx-main {
          flex: 1;
          padding: 20px 24px;
          min-width: 0;
        }
        .zx-loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 300px;
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 10px;
        }

        @media (max-width: 1024px) {
          .zx-sidebar { width: 360px; }
        }
        @media (max-width: 768px) {
          .zx-sidebar {
            position: fixed;
            top: 60px;
            left: 0;
            bottom: 0;
            z-index: 40;
            width: 100%;
            max-width: 400px;
            box-shadow: 4px 0 20px rgba(0,0,0,0.1);
          }
          .zx-sidebar.collapsed {
            transform: translateX(-100%);
          }
        }
      `}</style>

      <div className="zx-results-page">
        {/* Top Bar */}
        <div className="zx-results-topbar">
          <div className="zx-topbar-left">
            <button className="zx-back-btn" onClick={() => navigate(-1)} title="Go Back">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="zx-topbar-title">Search Results</div>
              <div className="zx-topbar-subtitle">
                {isLoading ? 'Searching...' : `${searchResults.length} candidates`}
              </div>
            </div>
          </div>
          <button className="zx-filter-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="zx-filter-badge">{activeFilterCount}</span>
            )}
          </button>
        </div>

        {/* Layout */}
        <div className="zx-results-layout">
          {/* Sidebar */}
          <aside className={`zx-sidebar ${!sidebarOpen ? 'collapsed' : ''}`}>
            <CandidateSearchFilters
              onSearch={handleSearch}
              isSearching={isLoading}
              initialFilters={filters}
              organizationId={organizationId}
              hideHero={true}
            />
          </aside>

          {/* Results */}
          <main className="zx-main">
            {isLoading ? (
              <div className="zx-loading-state">
                <Loader />
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