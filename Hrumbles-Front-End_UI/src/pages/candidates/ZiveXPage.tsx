// src/pages/candidates/ZiveXPage.tsx
// Phase 2 — single-page search (sidebar + hero/results)
//
// INVITE FLOW (restored from ZiveXResultsPage.tsx):
//   single invite  → JobPickerModal → InviteCandidateModal
//   bulk invite    → JobPickerModal → BulkInviteReviewModal
//
// IMPORTS use the correct paths from the original codebase:
//   @/components/jobs/job/invite/InviteCandidateModal
//   @/components/jobs/job/invite/BulkInviteReviewModal

import { FC, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getAuthDataFromLocalStorage } from '@/utils/localstorage';

import { SearchFilters, SearchTag, CandidateSearchResult } from '@/types/candidateSearch';
import { useTypesenseSearch } from '@/hooks/zive-x/useTypesenseSearch';

import ZiveXSearchSidebar from '@/components/candidates/zive-x/ZiveXSearchSidebar';
import ZiveXCardList from '@/components/candidates/zive-x/ZiveXCardList';
import ZiveXResultsTable from '@/components/candidates/zive-x/ZiveXResultsTable';
import ZiveXHeroSection from '@/components/candidates/zive-x/ZiveXHeroSection';

// ← CORRECT IMPORT PATHS (from ZiveXResultsPage original)
import InviteCandidateModal from '@/components/jobs/job/invite/InviteCandidateModal';
import BulkInviteReviewModal, { BulkInviteCandidate } from '@/components/jobs/job/invite/BulkInviteReviewModal';

import { LayoutGrid, List, Send, Briefcase, Search, X, RefreshCw } from 'lucide-react';

// ── JobOption type (matches ZiveXResultsPage original) ────────────────────────
interface JobOption {
  id:             string;
  title:          string;
  jobId:          string;
  location?:      string[] | string;
  experience?:    any;
  skills?:        string[];
  description?:   string;
  hiringMode?:    string;
  jobType?:       string;
  clientDetails?: any;
  noticePeriod?:  string;
  department?:    string;
}

// ── JobPickerModal (inline — copied from ZiveXResultsPage original) ───────────
const JobPickerModal: FC<{
  isOpen:          boolean;
  onClose:         () => void;
  onSelect:        (j: JobOption) => void;
  jobs:            JobOption[];
  mode:            'single' | 'bulk';
  candidateCount?: number;
}> = ({ isOpen, onClose, onSelect, jobs, mode, candidateCount = 1 }) => {
  const [q, setQ] = useState('');
  const filtered = jobs.filter(j => j.title.toLowerCase().includes(q.toLowerCase()));
  if (!isOpen) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 1051, width: 'calc(100vw - 32px)', maxWidth: 440,
        background: '#fff', borderRadius: 14, boxShadow: '0 20px 56px rgba(0,0,0,0.2)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg,#5B21B6,#7C3AED)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'white' }}>
              {mode === 'bulk'
                ? `Select Job — Invite ${candidateCount} Candidate${candidateCount !== 1 ? 's' : ''}`
                : 'Select Job to Invite'}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.65)' }}>Choose which job this invite is for</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, padding: 5, cursor: 'pointer' }}>
            <X size={13} color="white" />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #F3F4F6', position: 'relative' }}>
          <Search size={12} style={{ position: 'absolute', left: 22, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search jobs…"
            style={{ width: '100%', padding: '7px 10px 7px 28px', borderRadius: 7, border: '1px solid #E5E7EB', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* List */}
        <div style={{ maxHeight: 340, overflowY: 'auto' }}>
          {filtered.length === 0
            ? <div style={{ padding: 28, textAlign: 'center', color: '#9CA3AF', fontSize: 12 }}>No active jobs found</div>
            : filtered.map((j, i) => (
              <button key={j.id}
                onClick={() => { onSelect(j); setQ(''); }}
                style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: i < filtered.length - 1 ? '1px solid #F9FAFB' : 'none' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#F5F3FF')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'none')}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Briefcase size={14} color="#7C3AED" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span style={{ fontSize: 10, color: '#9CA3AF', fontFamily: 'monospace' }}>{j.jobId}</span>
                    {j.hiringMode && <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 99, background: '#EDE9FE', color: '#7C3AED' }}>{j.hiringMode}</span>}
                  </div>
                </div>
                <span style={{ fontSize: 16, color: '#C4B5FD' }}>›</span>
              </button>
            ))
          }
        </div>

        <div style={{ padding: '10px 14px', borderTop: '1px solid #F3F4F6', background: '#FAFAFA', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid #E5E7EB', background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#6B7280' }}>Cancel</button>
        </div>
      </div>
    </>
  );
};

// ── URL param helpers ─────────────────────────────────────────────────────────
function encodeTagArray(tags: SearchTag[]): { m?: string; o?: string } {
  const m = tags.filter(t =>  t.mandatory).map(t => encodeURIComponent(t.value)).join(',');
  const o = tags.filter(t => !t.mandatory).map(t => encodeURIComponent(t.value)).join(',');
  return { ...(m && { m }), ...(o && { o }) };
}
function decodeTagArray(m: string | null, o: string | null): SearchTag[] {
  const mT = (m ?? '').split(',').filter(Boolean).map(v => ({ value: decodeURIComponent(v), mandatory: true  }));
  const oT = (o ?? '').split(',').filter(Boolean).map(v => ({ value: decodeURIComponent(v), mandatory: false }));
  return [...mT, ...oT];
}

// ── Main page ─────────────────────────────────────────────────────────────────
const ZiveXPage: FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { organization_id }             = getAuthDataFromLocalStorage();
  const userId = useSelector((s: any) => s.auth.user?.id);

  // ── Page state ──────────────────────────────────────────────────────────────
  const [hasSearched,  setHasSearched]  = useState(false);
  const [sidebarKey,   setSidebarKey]   = useState(0);
  const [sidebarInit,  setSidebarInit]  = useState<Partial<SearchFilters>>({});
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());
  const [viewMode,     setViewMode]     = useState<'card' | 'table'>('card');

  // ── Invite state (restored from ZiveXResultsPage original) ─────────────────
  const [jobPickerMode,    setJobPickerMode]    = useState<'single' | 'bulk' | null>(null);
  const [pendingSingle,    setPendingSingle]    = useState<CandidateSearchResult | null>(null);
  const [pendingBulkList,  setPendingBulkList]  = useState<BulkInviteCandidate[]>([]);
  const [selectedJob,      setSelectedJob]      = useState<JobOption | null>(null);
  const [singleInviteOpen, setSingleInviteOpen] = useState(false);
  const [bulkModalOpen,    setBulkModalOpen]    = useState(false);
  

  // ── WhatsApp config (restored from ZiveXResultsPage original) ──────────────
  const { data: waCfg } = useQuery({
    queryKey: ['whatsapp-config', organization_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('hr_organizations')
        .select('whatsapp_config')
        .eq('id', organization_id)
        .single();
      return data?.whatsapp_config || null;
    },
    enabled: !!organization_id,
  });

  // ── Active jobs (restored from ZiveXResultsPage original) ──────────────────
  const { data: jobs = [] } = useQuery<JobOption[]>({
    queryKey: ['zx-jobs', organization_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_jobs')
        .select('*')
        .eq('organization_id', organization_id)
        .eq('status', 'Active')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []).map(j => ({
        id: j.id, title: j.title, jobId: j.job_id,
        location: j.location, experience: j.experience,
        skills: j.skills, description: j.description,
        hiringMode: j.hiring_mode, jobType: j.job_type,
        clientDetails: j.client_details, noticePeriod: j.notice_period,
        department: j.department,
      }));
    },
    enabled: !!organization_id,
  });

  const orgName = waCfg?.company_name || 'DCS Group';

  // ── Parse all Phase 2 filters from URL ─────────────────────────────────────
  const filters: SearchFilters = useMemo(() => {
    const p    = searchParams;
    const get  = (k: string) => p.get(k);
    const tags = (prefix: string) => decodeTagArray(get(`${prefix}_m`), get(`${prefix}_o`));
    const num  = (k: string) => { const v = get(k); return v != null && v !== '' ? Number(v) : undefined; };
    const arr  = (k: string) => get(k)?.split(',').filter(Boolean) ?? [];
    return {
      keywords:             tags('kw'),
      skills:               tags('sk'),
      locations:            tags('loc'),
      companies:            tags('co'),
      educations:           tags('edu'),
      name:                 tags('nm'),
      email:                tags('em'),
      current_designation:  get('cd') ?? undefined,
      current_company:      get('cc') ?? undefined,
      min_exp:              num('min_exp'),
      max_exp:              num('max_exp'),
      notice_periods:       arr('np'),
      min_current_salary:   num('min_cctc'),
      max_current_salary:   num('max_cctc'),
      min_expected_salary:  num('min_ectc'),
      max_expected_salary:  num('max_ectc'),
      date_posted:          get('dp') ?? undefined,
      // Phase 2
      previous_titles:      tags('pt'),
      previous_companies:   tags('pc'),
      degree:               get('degree') ?? undefined,
      institutions:         tags('inst'),
      excluded_skills:      arr('excl_sk'),
      companies_count_min:  num('cc_min'),
      companies_count_max:  num('cc_max'),
    };
  }, [searchParams]);

  // ── Encode filters → URL ────────────────────────────────────────────────────
  const encodeFiltersToURL = useCallback((f: SearchFilters) => {
    const p = new URLSearchParams();
    const setTags = (prefix: string, tags: SearchTag[] | undefined) => {
      if (!tags?.length) return;
      const { m, o } = encodeTagArray(tags);
      if (m) p.set(`${prefix}_m`, m);
      if (o) p.set(`${prefix}_o`, o);
    };
    const setNum = (k: string, v: number | undefined) => { if (v != null) p.set(k, String(v)); };
    const setArr = (k: string, v: string[] | undefined) => { if (v?.length) p.set(k, v.join(',')); };
    const setStr = (k: string, v: string | undefined) => { if (v?.trim()) p.set(k, v.trim()); };
    setTags('kw',  f.keywords);   setTags('sk',  f.skills);
    setTags('loc', f.locations);  setTags('co',  f.companies);
    setTags('edu', f.educations); setTags('nm',  f.name);
    setTags('em',  f.email);
    setStr('cd',       f.current_designation);
    setStr('cc',       f.current_company);
    setNum('min_exp',  f.min_exp);   setNum('max_exp',  f.max_exp);
    setArr('np',       f.notice_periods);
    setNum('min_cctc', f.min_current_salary);
    setNum('max_cctc', f.max_current_salary);
    setNum('min_ectc', f.min_expected_salary);
    setNum('max_ectc', f.max_expected_salary);
    setStr('dp',       f.date_posted);
    // Phase 2
    setTags('pt',   f.previous_titles);
    setTags('pc',   f.previous_companies);
    setStr('degree', f.degree);
    setTags('inst', f.institutions);
    setArr('excl_sk', f.excluded_skills);
    setNum('cc_min', f.companies_count_min);
    setNum('cc_max', f.companies_count_max);
    setSearchParams(p, { replace: true });
  }, [setSearchParams]);

  // ── Restore from URL on mount ───────────────────────────────────────────────
  useEffect(() => {
    if (Array.from(searchParams.keys()).length > 0) {
      setHasSearched(true);
      setSidebarInit(filters);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Search / reset handlers ─────────────────────────────────────────────────
const handleSearch = useCallback((newFilters: SearchFilters) => {
  // Merge any hero‑added keywords into the final filters
  encodeFiltersToURL(newFilters);
  setHasSearched(true);
  setSelectedIds(new Set());
  // Clear hero keywords after they’ve been used
  
},  [encodeFiltersToURL]);

  const handleReset = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
    setHasSearched(false);
    setSidebarInit({});
    setSidebarKey(k => k + 1);
    setSelectedIds(new Set());
  }, [setSearchParams]);

  

  // Adds keywords from hero AI extraction to sidebar without triggering search
const handleAddKeywordsToSidebar = useCallback((newKws: SearchTag[]) => {

  setSidebarInit(prev => ({
    ...prev,
    keywords: [...(prev.keywords || []), ...newKws],
    }));
}, []);

  const handleHistorySelect = useCallback((histFilters: SearchFilters) => {
    setSidebarInit(histFilters);
    setSidebarKey(k => k + 1);
    handleSearch(histFilters);
  }, [handleSearch]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(prev =>
      prev.size === results.length && results.length > 0
        ? new Set()
        : new Set(results.map(r => r.id))
    );
  }, []); // results added inside to avoid stale ref — see below

  // ── Typesense search ────────────────────────────────────────────────────────
  const { data: results = [], isLoading, isFetching } = useTypesenseSearch({
    filters,
    organizationId: organization_id,
    enabled:        hasSearched && !!organization_id,
  });

  const handleSelectAllWithResults = useCallback(() => {
    setSelectedIds(prev =>
      prev.size === results.length && results.length > 0
        ? new Set()
        : new Set(results.map(r => r.id))
    );
  }, [results]);

  // ── Invite handlers (restored from ZiveXResultsPage original) ──────────────
  const handleSingleInvite = useCallback((c: CandidateSearchResult) => {
    setPendingSingle(c);
    setJobPickerMode('single');
  }, []);

  const handleBulkInviteClick = useCallback(() => {
    const pool      = selectedIds.size > 0 ? results.filter(r => selectedIds.has(r.id)) : results;
    const withEmail = pool.filter(r => r.email);
    if (!withEmail.length) return;
    setPendingBulkList(withEmail.map(r => ({
      id:               r.id,
      name:             r.full_name || '',
      email:            r.email!,
      phone:            r.phone,
      candidateOwnerId: userId || '',
    })));
    setJobPickerMode('bulk');
  }, [results, selectedIds, userId]);

  const handleJobPicked = useCallback((job: JobOption) => {
    setSelectedJob(job);
    setJobPickerMode(null);
    if (pendingBulkList.length > 0) {
      setBulkModalOpen(true);
    } else {
      setSingleInviteOpen(true);
    }
  }, [pendingBulkList.length]);

  const handlePickerClose = useCallback(() => {
    setJobPickerMode(null);
    setPendingSingle(null);
    setPendingBulkList([]);
  }, []);

  // ── Highlight terms ─────────────────────────────────────────────────────────
  const highlightTerms = useMemo(() => {
    const terms = new Set<string>();
    const addTags = (tags: SearchTag[] | undefined) => tags?.forEach(t => t.value && terms.add(t.value));
    addTags(filters.keywords);     addTags(filters.skills);
    addTags(filters.locations);    addTags(filters.companies);
    addTags(filters.previous_titles);  addTags(filters.previous_companies);
    addTags(filters.institutions);
    if (filters.current_designation) terms.add(filters.current_designation);
    if (filters.current_company)     terms.add(filters.current_company);
    filters.jd_generated_keywords?.forEach(k => terms.add(k));
    return [...terms].filter(Boolean);
  }, [filters]);

  // ── Active filter count ─────────────────────────────────────────────────────
  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.keywords?.length)    n++; if (filters.skills?.length)       n++;
    if (filters.locations?.length)   n++; if (filters.companies?.length)    n++;
    if (filters.current_designation) n++; if (filters.current_company)      n++;
    if (filters.min_exp != null || filters.max_exp != null) n++;
    if (filters.notice_periods?.length) n++;
    if (filters.min_current_salary  != null || filters.max_current_salary  != null) n++;
    if (filters.min_expected_salary != null || filters.max_expected_salary != null) n++;
    // Phase 2
    if (filters.previous_titles?.length)    n++;
    if (filters.previous_companies?.length) n++;
    if (filters.degree)                     n++;
    if (filters.institutions?.length)       n++;
    if (filters.excluded_skills?.length)    n++;
    if (filters.companies_count_min != null || filters.companies_count_max != null) n++;
    return n;
  }, [filters]);

  const isSearching = isLoading || isFetching;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: '#F8FAFC' }}>

      {/* ── Sidebar ── */}
      <ZiveXSearchSidebar
        key={sidebarKey}
        onSearch={handleSearch}
        onReset={handleReset}
        isSearching={isSearching}
        initialFilters={sidebarInit}
        organizationId={organization_id}
      />

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {!hasSearched ? (
          /* ── Hero / idle ─────────────────────────────────────────────────── */
          <ZiveXHeroSection
  onSearch={handleSearch}
  onHistorySelect={handleHistorySelect}
  onAddKeywordsToSidebar={handleAddKeywordsToSidebar}
  organizationId={organization_id}
/>
        ) : (
          /* ── Results ─────────────────────────────────────────────────────── */
          <>
            {/* Results header */}
            <div style={{
              flexShrink: 0, padding: '8px 16px', background: 'white',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
                  {isSearching
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748B' }}>
                        <RefreshCw size={12} style={{ animation: 'zxSpin 0.8s linear infinite' }} /> Searching…
                      </span>
                    : `${results.length.toLocaleString()} candidates`
                  }
                </span>
                {activeFilterCount > 0 && (
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#EDE9FE', color: '#6D28D9', fontWeight: 600 }}>
                    {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
                  </span>
                )}
                {selectedIds.size > 0 && (
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: '#FEF3C7', color: '#92400E', fontWeight: 600 }}>
                    {selectedIds.size} selected
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Select all */}
                {results.length > 0 && (
                  <button onClick={handleSelectAllWithResults}
                    style={{ padding: '4px 10px', borderRadius: 99, border: '1px solid #E2E8F0', background: 'white', fontSize: 11, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
                    {selectedIds.size === results.length && results.length > 0 ? 'Deselect All' : `Select All (${results.length})`}
                  </button>
                )}

                {/* Bulk invite */}
                {results.length > 0 && (
                  <button onClick={handleBulkInviteClick}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 99, border: 'none', background: '#EDE9FE', fontSize: 11, fontWeight: 700, color: '#6D28D9', cursor: 'pointer' }}>
                    <Send size={10} />
                    Bulk Invite{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
                  </button>
                )}

                {/* View toggle */}
                <div style={{ display: 'flex', borderRadius: 7, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                  {(['card', 'table'] as const).map(m => (
                    <button key={m} onClick={() => setViewMode(m)}
                      style={{ width: 30, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', background: viewMode === m ? '#6D28D9' : 'white', color: viewMode === m ? 'white' : '#94A3B8', transition: 'all 0.1s' }}>
                      {m === 'card' ? <LayoutGrid size={13} /> : <List size={13} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results list — display:flex+flexDirection:column is required for
                inner scroll (ZiveXCardList/ZiveXResultsTable use flex:1 internally) */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {viewMode === 'card' ? (
                <ZiveXCardList
                  results={results}
                  isLoading={isSearching}
                  highlightTerms={highlightTerms}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onInvite={handleSingleInvite}
                />
              ) : (
                <ZiveXResultsTable
                  results={results}
                  isLoading={isSearching}
                  highlightTerms={highlightTerms}
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  onInvite={handleSingleInvite}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Job picker modal (before any invite opens) ── */}
      <JobPickerModal
        isOpen={jobPickerMode !== null}
        onClose={handlePickerClose}
        onSelect={handleJobPicked}
        jobs={jobs}
        mode={jobPickerMode || 'single'}
        candidateCount={jobPickerMode === 'bulk' ? pendingBulkList.length : 1}
      />

      {/* ── Single invite modal ── */}
      {singleInviteOpen && selectedJob && pendingSingle && (
        <InviteCandidateModal
          isOpen={singleInviteOpen}
          onClose={() => {
            setSingleInviteOpen(false);
            setPendingSingle(null);
            setSelectedJob(null);
          }}
          jobId={selectedJob.id}
          job={selectedJob}
          prefillName={pendingSingle.full_name   || ''}
          prefillEmail={pendingSingle.email      || ''}
          prefillPhone={pendingSingle.phone      || ''}
          inviteSource="zivex"
        />
      )}

      {/* ── Bulk invite modal ── */}
      {bulkModalOpen && selectedJob && pendingBulkList.length > 0 && (
        <BulkInviteReviewModal
          isOpen={bulkModalOpen}
          onClose={() => {
            setBulkModalOpen(false);
            setPendingBulkList([]);
            setSelectedJob(null);
            setSelectedIds(new Set());
          }}
          candidates={pendingBulkList}
          jobId={selectedJob.id}
          jobTitle={selectedJob.title}
          inviteSource="zivex"
          job={selectedJob}
          waTemplateName={waCfg?.default_template_name}
          waTemplateLanguage={waCfg?.default_template_language || 'en_US'}
          waOrgName={waCfg?.company_name || orgName}
        />
      )}

      <style>{`@keyframes zxSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ZiveXPage;