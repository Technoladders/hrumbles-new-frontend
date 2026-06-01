// src/pages/candidates/ZiveXResultsPage.tsx
// SEARCH ENGINE: Typesense (replaces search_unified_candidates_v31 RPC)
// LAYOUT: Modern compact — top filter bar + full-width results
// No timeout, works on 5L+ records, sub-100ms search

import { FC, useMemo, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import CandidateSearchFilters from '@/components/candidates/zive-x/CandidateSearchFilters';
import CandidateSearchResults from '@/components/candidates/zive-x/CandidateSearchResults';
import BulkInviteReviewModal, { BulkInviteCandidate } from '@/components/jobs/job/invite/BulkInviteReviewModal';
import InviteCandidateModal from '@/components/jobs/job/invite/InviteCandidateModal';
import { SearchFilters, CandidateSearchResult, SearchTag } from '@/types/candidateSearch';
import { useTypesenseSearch } from '@/hooks/zive-x/useTypesenseSearch';
import {
  ArrowLeft, SlidersHorizontal, Users, Send, Briefcase,
  Search, X, Zap, AlertCircle, ChevronDown,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
const stripQuotes = (v: string) => v.replace(/^"|"$/g, '').trim();

interface JobOption {
  id: string; title: string; jobId: string;
  location?: string[] | string;
  experience?: { min?: { value?: number }; max?: { value?: number } };
  skills?: string[]; description?: string;
  hiringMode?: string; jobType?: string;
  clientDetails?: { clientName?: string };
  noticePeriod?: string; department?: string;
}

// ─── JobPickerModal (inline, unchanged) ──────────────────────────────────────
const JobPickerModal: FC<{
  isOpen: boolean; onClose: () => void; onSelect: (j: JobOption) => void;
  jobs: JobOption[]; mode: 'single' | 'bulk'; candidateCount?: number;
}> = ({ isOpen, onClose, onSelect, jobs, mode, candidateCount = 1 }) => {
  const [q, setQ] = useState('');
  const filtered = jobs.filter(j => j.title.toLowerCase().includes(q.toLowerCase()));
  if (!isOpen) return null;
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:1050 }} />
      <div style={{
        position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
        zIndex:1051, width:'calc(100vw - 32px)', maxWidth:'440px', background:'#fff',
        borderRadius:'14px', boxShadow:'0 20px 56px rgba(0,0,0,0.2)', overflow:'hidden',
      }}>
        <div style={{ padding:'14px 16px', borderBottom:'1px solid #F3F4F6',
          background:'linear-gradient(135deg,#6D28D9,#7C3AED)', display:'flex',
          justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <p style={{ margin:0, fontSize:'13px', fontWeight:700, color:'#fff' }}>
              {mode === 'bulk'
                ? `Select Job — Invite ${candidateCount} Candidate${candidateCount !== 1 ? 's' : ''}`
                : 'Select Job to Invite'}
            </p>
            <p style={{ margin:'1px 0 0', fontSize:'10px', color:'rgba(255,255,255,0.7)' }}>
              Choose which job this invite is for
            </p>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.15)', border:'none',
            borderRadius:'6px', padding:'5px', cursor:'pointer', display:'flex' }}>
            <X size={13} color="#fff" />
          </button>
        </div>
        <div style={{ padding:'10px 12px', borderBottom:'1px solid #F3F4F6', position:'relative' }}>
          <Search size={13} style={{ position:'absolute', left:'22px', top:'50%',
            transform:'translateY(-50%)', color:'#9CA3AF' }} />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search active jobs…"
            style={{ width:'100%', padding:'7px 10px 7px 28px', borderRadius:'7px',
              border:'1px solid #E5E7EB', fontSize:'12px', outline:'none',
              boxSizing:'border-box', background:'#F9FAFB' }} />
        </div>
        <div style={{ maxHeight:'340px', overflowY:'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ padding:'28px', textAlign:'center', color:'#9CA3AF', fontSize:'12px' }}>
              No active jobs found
            </div>
          ) : filtered.map((j, i) => (
            <button key={j.id} onClick={() => { onSelect(j); setQ(''); }}
              style={{ width:'100%', padding:'11px 14px', border:'none', background:'none',
                textAlign:'left', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px',
                borderBottom: i < filtered.length - 1 ? '1px solid #F9FAFB' : 'none',
                transition:'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F5F3FF')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <div style={{ width:'32px', height:'32px', borderRadius:'8px', background:'#EDE9FE',
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Briefcase size={15} color="#7C3AED" />
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ margin:0, fontSize:'13px', fontWeight:600, color:'#111827',
                  whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{j.title}</p>
                <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'2px' }}>
                  <span style={{ fontSize:'10px', color:'#9CA3AF', fontFamily:'monospace' }}>{j.jobId}</span>
                  {j.hiringMode && <span style={{ fontSize:'10px', fontWeight:600, padding:'1px 6px',
                    borderRadius:'99px', background:'#EDE9FE', color:'#7C3AED' }}>{j.hiringMode}</span>}
                </div>
              </div>
              <span style={{ fontSize:'18px', color:'#C4B5FD', flexShrink:0 }}>›</span>
            </button>
          ))}
        </div>
        <div style={{ padding:'10px 14px', borderTop:'1px solid #F3F4F6', background:'#FAFAFA',
          display:'flex', justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'7px 16px', borderRadius:'7px',
            border:'1px solid #E5E7EB', background:'#fff', fontSize:'12px',
            fontWeight:600, cursor:'pointer', color:'#6B7280' }}>Cancel</button>
        </div>
      </div>
    </>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ZiveXResultsPage: FC = () => {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const organizationId = useSelector((s: any) => s.auth.organization_id);
  const userId         = useSelector((s: any) => s.auth.user?.id);
  const [sidebarOpen,  setSidebarOpen] = useState(true);

  // Invite state
  const [jobPickerMode,   setJobPickerMode]   = useState<'single' | 'bulk' | null>(null);
  const [pendingSingle,   setPendingSingle]   = useState<CandidateSearchResult | null>(null);
  const [pendingBulkList, setPendingBulkList] = useState<BulkInviteCandidate[]>([]);
  const [selectedJob,     setSelectedJob]     = useState<JobOption | null>(null);
  const [singleInviteOpen, setSingleInviteOpen] = useState(false);
  const [bulkModalOpen,    setBulkModalOpen]    = useState(false);
  const [selectedIds,      setSelectedIds]      = useState<Set<string>>(new Set());

  // WhatsApp config
  const { data: waCfg } = useQuery({
    queryKey: ['whatsapp-config', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_organizations').select('whatsapp_config')
        .eq('id', organizationId).single();
      if (error) throw error;
      return data?.whatsapp_config || null;
    },
    enabled: !!organizationId,
  });

  const orgName = useMemo(() => waCfg?.company_name || 'DCS Group', [waCfg]);

  // Jobs for invite
  const { data: jobs = [] } = useQuery<JobOption[]>({
    queryKey: ['zx-jobs-for-invite', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_jobs').select('*')
        .eq('organization_id', organizationId).eq('status', 'Active')
        .order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return (data || []).map(j => ({
        id: j.id, title: j.title, jobId: j.job_id,
        location: j.location, experience: j.experience, skills: j.skills,
        description: j.description, hiringMode: j.hiring_mode,
        jobType: j.job_type, clientDetails: j.client_details,
        noticePeriod: j.notice_period, department: j.department,
      }));
    },
    enabled: !!organizationId,
  });

  // ── Parse filters from URL ────────────────────────────────────────────────
  const filters: SearchFilters = useMemo(() => {
    const getTags = (key: string): SearchTag[] => {
      const m = searchParams.get(`mandatory_${key}`)?.split(',') || [];
      const o = searchParams.get(`optional_${key}`)?.split(',')  || [];
      return [
        ...m.filter(Boolean).map(v => ({ value: stripQuotes(v), mandatory: true  })),
        ...o.filter(Boolean).map(v => ({ value: stripQuotes(v), mandatory: false })),
      ];
    };
    return {
      keywords:    getTags('keywords'), skills:    getTags('skills'),
      educations:  getTags('educations'), locations: getTags('locations'),
      industries:  getTags('industries'), companies: getTags('companies'),
      name:        getTags('name'), email: getTags('email'),
      current_company:     searchParams.get('current_company')     || '',
      current_designation: searchParams.get('current_designation') || '',
      min_exp: searchParams.get('min_exp') ? parseInt(searchParams.get('min_exp')!) : null,
      max_exp: searchParams.get('max_exp') ? parseInt(searchParams.get('max_exp')!) : null,
      min_current_salary:  searchParams.get('min_current_salary')  ? parseFloat(searchParams.get('min_current_salary')!)  : null,
      max_current_salary:  searchParams.get('max_current_salary')  ? parseFloat(searchParams.get('max_current_salary')!)  : null,
      min_expected_salary: searchParams.get('min_expected_salary') ? parseFloat(searchParams.get('min_expected_salary')!) : null,
      max_expected_salary: searchParams.get('max_expected_salary') ? parseFloat(searchParams.get('max_expected_salary')!) : null,
      notice_periods: searchParams.get('notice_periods')?.split(',') || [],
      date_posted:    searchParams.get('date_posted') || 'all_time',
      jd_text:              searchParams.get('jd_text') ? decodeURIComponent(searchParams.get('jd_text')!) : undefined,
      jd_job_title:         searchParams.get('jd_job_title')          || undefined,
      jd_selected_job_id:   searchParams.get('jd_selected_job_id')    || undefined,
      jd_generated_keywords: searchParams.get('jd_generated_keywords')?.split('|||').filter(Boolean) || undefined,
      jd_is_boolean_mode:   searchParams.get('jd_is_boolean_mode') === 'true',
    };
  }, [searchParams]);

  // ── Highlight terms (for result card highlighting) ────────────────────────
  const highlightTerms = useMemo(() => {
    const terms: string[] = [];
    ['keywords','skills','companies','educations','locations'].forEach(k => {
      const m = searchParams.get(`mandatory_${k}`)?.split(',') || [];
      const o = searchParams.get(`optional_${k}`)?.split(',')  || [];
      [...m, ...o].filter(Boolean).forEach(v => terms.push(stripQuotes(v)));
    });
    const cc = searchParams.get('current_company');     if (cc) terms.push(cc);
    const cd = searchParams.get('current_designation'); if (cd) terms.push(cd);
    return [...new Set(terms.filter(Boolean))];
  }, [searchParams]);

  // ── TYPESENSE SEARCH (replaces RPC) ──────────────────────────────────────
  const { data: searchResults = [], isLoading, isError, error } = useTypesenseSearch({
    filters,
    organizationId,
  });

  // ── Active filter count ───────────────────────────────────────────────────
  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.keywords?.length) n++; if (filters.skills?.length) n++;
    if (filters.locations?.length) n++; if (filters.companies?.length) n++;
    if (filters.educations?.length) n++; if (filters.current_company) n++;
    if (filters.current_designation) n++; if (filters.min_exp || filters.max_exp) n++;
    if (filters.notice_periods?.length) n++;
    return n;
  }, [filters]);

  // ── handleSearch (re-query by updating URL params) ────────────────────────
  const handleSearch = (nf: SearchFilters) => {
    const p = new URLSearchParams();
    const enc = (key: string, tags: SearchTag[] = []) => {
      const m = tags.filter(t =>  t.mandatory).map(t => stripQuotes(t.value));
      const o = tags.filter(t => !t.mandatory).map(t => stripQuotes(t.value));
      if (m.length) p.append(`mandatory_${key}`, m.join(','));
      if (o.length) p.append(`optional_${key}`,  o.join(','));
    };
    enc('keywords', nf.keywords); enc('skills',    nf.skills);
    enc('locations', nf.locations); enc('companies', nf.companies);
    enc('educations', nf.educations); enc('industries', nf.industries);
    enc('name', nf.name); enc('email', nf.email);
    if (nf.current_company)     p.append('current_company',     nf.current_company);
    if (nf.current_designation) p.append('current_designation', nf.current_designation);
    if (nf.min_exp) p.append('min_exp', nf.min_exp.toString());
    if (nf.max_exp) p.append('max_exp', nf.max_exp.toString());
    if (nf.min_current_salary)  p.append('min_current_salary',  nf.min_current_salary.toString());
    if (nf.max_current_salary)  p.append('max_current_salary',  nf.max_current_salary.toString());
    if (nf.min_expected_salary) p.append('min_expected_salary', nf.min_expected_salary.toString());
    if (nf.max_expected_salary) p.append('max_expected_salary', nf.max_expected_salary.toString());
    if (nf.notice_periods?.length) p.append('notice_periods', nf.notice_periods.join(','));
    if (nf.date_posted && nf.date_posted !== 'all_time') p.append('date_posted', nf.date_posted);
    if (nf.jd_text)                 p.append('jd_text', encodeURIComponent(nf.jd_text));
    if (nf.jd_job_title)            p.append('jd_job_title', nf.jd_job_title);
    if (nf.jd_selected_job_id)      p.append('jd_selected_job_id', nf.jd_selected_job_id);
    if (nf.jd_generated_keywords?.length) p.append('jd_generated_keywords', nf.jd_generated_keywords.join('|||'));
    if (nf.jd_is_boolean_mode !== undefined) p.append('jd_is_boolean_mode', nf.jd_is_boolean_mode.toString());
    navigate(`/zive-x-search/results?${p.toString()}`, { replace: true });
  };

  // ── Invite handlers ───────────────────────────────────────────────────────
  const handleSingleInvite   = useCallback((c: CandidateSearchResult) => { setPendingSingle(c); setJobPickerMode('single'); }, []);
  const handleToggleSelect   = useCallback((id: string) => { setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }, []);
  const handleSelectAll      = useCallback(() => { setSelectedIds(selectedIds.size === searchResults.length ? new Set() : new Set(searchResults.map(r => r.id))); }, [selectedIds.size, searchResults]);
  const handleBulkInviteClick = () => {
    const pool = selectedIds.size > 0 ? searchResults.filter(r => selectedIds.has(r.id)) : searchResults;
    const withEmail = pool.filter(r => r.email);
    if (!withEmail.length) return;
    setPendingBulkList(withEmail.map(r => ({
      id: r.id, name: r.full_name || '', email: r.email!, phone: r.phone, candidateOwnerId: userId || '',
    })));
    setJobPickerMode('bulk');
  };
  const handleJobPicked = (job: JobOption) => {
    setSelectedJob(job); setJobPickerMode(null);
    pendingBulkList.length > 0 ? setBulkModalOpen(true) : setSingleInviteOpen(true);
  };
  const handlePickerClose = () => { setJobPickerMode(null); setPendingSingle(null); setPendingBulkList([]); };

  return (
    <>
      <style>{`
        /* ─── ZiveX Results Page v2 ─── */
        .zxr2-page { min-height:100vh; background:#F4F5F7; font-family:'Inter',system-ui,sans-serif; --brand:#6C2BD9; --brand-light:#EDE9FE; --brand-mid:#DDD6FE; --border:#E5E7EB; --text:#111827; --sub:#6B7280; --t:150ms cubic-bezier(0.4,0,0.2,1); }

        /* ── TOPBAR ── */
        .zxr2-topbar { height:52px; background:white; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; padding:0 16px; position:sticky; top:0; z-index:30; box-shadow:0 1px 4px rgba(0,0,0,0.04); gap:10px; }
        .zxr2-back { width:32px; height:32px; border-radius:8px; border:1px solid var(--border); background:white; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all var(--t); color:var(--sub); flex-shrink:0; }
        .zxr2-back:hover { border-color:#C4B5FD; color:var(--brand); background:var(--brand-light); }
        .zxr2-title { font-size:14px; font-weight:700; color:var(--text); }
        .zxr2-subtitle { font-size:11px; color:var(--sub); display:flex; align-items:center; gap:4px; }
        .zxr2-dot { width:6px; height:6px; border-radius:50%; background:#10B981; animation:zxr2-pulse 2s infinite; }
        .zxr2-dot.loading { background:#F59E0B; animation:zxr2-spin 0.8s linear infinite; border-radius:0; clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%); }
        @keyframes zxr2-pulse { 0%,100%{opacity:1}50%{opacity:.4} }
        @keyframes zxr2-spin { to{transform:rotate(360deg)} }
        .zxr2-filter-btn { display:flex; align-items:center; gap:5px; padding:5px 10px; border-radius:7px; border:1.5px solid var(--border); background:white; cursor:pointer; font-size:12px; font-weight:600; color:#374151; transition:all var(--t); }
        .zxr2-filter-btn:hover, .zxr2-filter-btn.active { border-color:var(--brand); color:var(--brand); background:var(--brand-light); }
        .zxr2-badge { font-size:9px; font-weight:700; padding:1px 5px; border-radius:99px; background:var(--brand); color:white; }

        /* ── SEARCH ENGINE BADGE ── */
        .zxr2-engine-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:99px; background:linear-gradient(135deg,#EDE9FE,#DDD6FE); border:1px solid #C4B5FD; font-size:10px; font-weight:700; color:var(--brand); letter-spacing:0.2px; }

        /* ── LAYOUT ── */
        .zxr2-layout { display:flex; max-width:1920px; margin:0 auto; min-height:calc(100vh - 52px); }
        .zxr2-sidebar { width:292px; flex-shrink:0; border-right:1px solid var(--border); background:white; overflow-y:auto; max-height:calc(100vh - 52px); position:sticky; top:52px; transition:width 0.22s ease,opacity 0.22s ease; }
        .zxr2-sidebar.collapsed { width:0; overflow:hidden; border-right:none; opacity:0; }
        .zxr2-sidebar::-webkit-scrollbar { width:3px; }
        .zxr2-sidebar::-webkit-scrollbar-thumb { background:#E5E7EB; border-radius:4px; }

        .zxr2-main { flex:1; min-width:0; padding:14px 18px; }

        /* ── RESULTS HEADER ── */
        .zxr2-results-hd { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; flex-wrap:wrap; gap:8px; }
        .zxr2-count { font-size:13px; font-weight:600; color:var(--text); display:flex; align-items:center; gap:6px; }
        .zxr2-count-pill { background:var(--brand-light); color:var(--brand); font-size:11px; font-weight:700; padding:2px 8px; border-radius:99px; }
        .zxr2-actions-row { display:flex; align-items:center; gap:6px; }
        .zxr2-sel-btn { padding:5px 11px; border-radius:99px; border:1px solid #E5E7EB; background:white; font-size:11.5px; font-weight:600; color:var(--sub); cursor:pointer; transition:all var(--t); }
        .zxr2-sel-btn:hover { border-color:var(--brand); color:var(--brand); background:var(--brand-light); }
        .zxr2-invite-btn { display:flex; align-items:center; gap:4px; padding:5px 12px; border-radius:99px; border:none; background:#7B43F1; color:white; font-size:11.5px; font-weight:700; cursor:pointer; transition:background var(--t); }
        .zxr2-invite-btn:hover { background:#6228C2; }

        /* ── LOADING / ERROR / EMPTY ── */
        .zxr2-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; height:300px; background:white; border-radius:10px; border:1px solid var(--border); gap:10px; }
        .zxr2-spinner { width:28px; height:28px; border-radius:50%; border:3px solid var(--brand-light); border-top-color:var(--brand); animation:zxr2-spin 0.7s linear infinite; }
        .zxr2-loading-txt { font-size:13px; color:var(--sub); }
        .zxr2-error { display:flex; align-items:center; gap:10px; padding:16px; background:#FEF2F2; border:1px solid #FECACA; border-radius:10px; font-size:13px; color:#B91C1C; margin-bottom:12px; }
        .zxr2-empty { text-align:center; padding:60px 24px; background:white; border:1px solid var(--border); border-radius:10px; }
        .zxr2-empty-icon { width:52px; height:52px; border-radius:13px; background:#F3F4F6; display:flex; align-items:center; justify-content:center; margin:0 auto 14px; color:#9CA3AF; }

        @media(max-width:768px) {
          .zxr2-sidebar { position:fixed; top:52px; left:0; bottom:0; z-index:40; width:100%; max-width:300px; box-shadow:4px 0 16px rgba(0,0,0,0.08); }
          .zxr2-sidebar.collapsed { transform:translateX(-100%); opacity:0; }
        }
      `}</style>

      <div className="zxr2-page">

        {/* ── TOPBAR ── */}
        <div className="zxr2-topbar">
          <div style={{ display:'flex', alignItems:'center', gap:'10px', flexShrink:0 }}>
            <button className="zxr2-back" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <div>
              <div className="zxr2-title">Candidate Search</div>
              <div className="zxr2-subtitle">
                {isLoading
                  ? <><div className="zxr2-dot loading" /><span>Searching…</span></>
                  : <><div className="zxr2-dot" /><span>{searchResults.length} candidates found</span></>}
              </div>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            {/* Engine indicator */}
            <div className="zxr2-engine-badge">
              <Zap className="w-2.5 h-2.5" /> Typesense
            </div>
            <button
              className={`zxr2-filter-btn ${sidebarOpen ? 'active' : ''}`}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
              {activeFilterCount > 0 && <span className="zxr2-badge">{activeFilterCount}</span>}
            </button>
          </div>
        </div>

        {/* ── LAYOUT ── */}
        <div className="zxr2-layout">

          {/* Sidebar */}
          <aside className={`zxr2-sidebar ${!sidebarOpen ? 'collapsed' : ''}`}>
            <CandidateSearchFilters
              onSearch={handleSearch}
              isSearching={isLoading}
              initialFilters={filters}
              organizationId={organizationId}
              hideHero={true}
            />
          </aside>

          {/* Main */}
          <main className="zxr2-main">

            {/* Error state */}
            {isError && (
              <div className="zxr2-error">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>Search error: {(error as Error)?.message || 'Unknown error'}. Check Typesense connection.</span>
              </div>
            )}

            {/* Results header */}
            {!isLoading && (
              <div className="zxr2-results-hd">
                <div className="zxr2-count">
                  <Users className="w-4 h-4 text-gray-400" />
                  Results
                  <span className="zxr2-count-pill">{searchResults.length}</span>
                </div>
                {searchResults.length > 0 && (
                  <div className="zxr2-actions-row">
                    <button className="zxr2-sel-btn" onClick={handleSelectAll}>
                      {selectedIds.size === searchResults.length && searchResults.length > 0
                        ? 'Deselect All'
                        : `Select All (${searchResults.length})`}
                    </button>
                    <button className="zxr2-invite-btn" onClick={handleBulkInviteClick}>
                      <Send size={12} />
                      Bulk Invite{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="zxr2-loading">
                <div className="zxr2-spinner" />
                <span className="zxr2-loading-txt">Finding best candidates…</span>
              </div>
            )}

            {/* Results */}
            {!isLoading && (
              <CandidateSearchResults
                results={searchResults}
                highlightTerms={highlightTerms}
                jobId={selectedJob?.id}
                jobTitle={selectedJob?.title}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onInvite={handleSingleInvite}
              />
            )}
          </main>
        </div>
      </div>

      {/* Job picker */}
      <JobPickerModal
        isOpen={jobPickerMode !== null}
        onClose={handlePickerClose}
        onSelect={handleJobPicked}
        jobs={jobs}
        mode={jobPickerMode || 'single'}
        candidateCount={jobPickerMode === 'bulk' ? pendingBulkList.length : 1}
      />

      {singleInviteOpen && selectedJob && pendingSingle && (
        <InviteCandidateModal
          isOpen={singleInviteOpen}
          onClose={() => { setSingleInviteOpen(false); setPendingSingle(null); setSelectedJob(null); }}
          jobId={selectedJob.id} job={selectedJob}
          prefillName={pendingSingle.full_name || ''}
          prefillEmail={pendingSingle.email || ''}
          prefillPhone={pendingSingle.phone || ''}
          inviteSource="zivex"
        />
      )}

      {bulkModalOpen && selectedJob && pendingBulkList.length > 0 && (
        <BulkInviteReviewModal
          isOpen={bulkModalOpen}
          onClose={() => { setBulkModalOpen(false); setPendingBulkList([]); setSelectedJob(null); setSelectedIds(new Set()); }}
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
    </>
  );
};

export default ZiveXResultsPage;