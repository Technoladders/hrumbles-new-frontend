// src/pages/candidates/ZiveXResultsPage.tsx
// Job selector removed from topbar.
// Invite → JobPickerModal → InviteCandidateModal / BulkInviteReviewModal

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
import { ArrowLeft, SlidersHorizontal, Users, Send, Briefcase, Search, X } from 'lucide-react';

const stripQuotes = (v: string) => v.replace(/^"|"$/g, '').trim();
const wrapForFTS  = (value: string): string => {
  const clean = stripQuotes(value);
  if (clean.includes(' ') && !clean.startsWith('"')) return `"${clean}"`;
  return clean;
};

interface JobOption {
  id: string; title: string; jobId: string;
  location?: string[] | string;
  experience?: { min?: { value?: number }; max?: { value?: number } };
  skills?: string[]; description?: string;
  hiringMode?: string; jobType?: string;
  clientDetails?: { clientName?: string };
  noticePeriod?: string; department?: string;
}

// ─── JobPickerModal ────────────────────────────────────────────────────────────

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
        zIndex:1051, width:'calc(100vw - 32px)', maxWidth:'440px',
        background:'#fff', borderRadius:'14px',
        boxShadow:'0 20px 56px rgba(0,0,0,0.2)',
        overflow:'hidden', fontFamily:'inherit',
      }}>
        {/* Header */}
        <div style={{
          padding:'14px 16px', borderBottom:'1px solid #F3F4F6',
          background:'linear-gradient(135deg,#6D28D9,#7C3AED)',
          display:'flex', justifyContent:'space-between', alignItems:'center',
        }}>
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

        {/* Search */}
        <div style={{ padding:'10px 12px', borderBottom:'1px solid #F3F4F6', position:'relative' }}>
          <Search size={13} style={{ position:'absolute', left:'22px', top:'50%',
            transform:'translateY(-50%)', color:'#9CA3AF' }} />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search active jobs…"
            style={{ width:'100%', padding:'7px 10px 7px 28px', borderRadius:'7px',
              border:'1px solid #E5E7EB', fontSize:'12px', outline:'none',
              boxSizing:'border-box', background:'#F9FAFB' }} />
        </div>

        {/* List */}
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
                  whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {j.title}
                </p>
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

        {/* Footer */}
        <div style={{ padding:'10px 14px', borderTop:'1px solid #F3F4F6', background:'#FAFAFA',
          display:'flex', justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'7px 16px', borderRadius:'7px',
            border:'1px solid #E5E7EB', background:'#fff', fontSize:'12px',
            fontWeight:600, cursor:'pointer', color:'#6B7280' }}>
            Cancel
          </button>
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

  // job picker gate
  const [jobPickerMode,   setJobPickerMode]   = useState<'single' | 'bulk' | null>(null);
  const [pendingSingle,   setPendingSingle]   = useState<CandidateSearchResult | null>(null);
  const [pendingBulkList, setPendingBulkList] = useState<BulkInviteCandidate[]>([]);

  // post-selection modals
  const [selectedJob,      setSelectedJob]      = useState<JobOption | null>(null);
  const [singleInviteOpen, setSingleInviteOpen] = useState(false);
  const [bulkModalOpen,    setBulkModalOpen]    = useState(false);

  // bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Fetch WhatsApp config for template defaults
  const { data: waCfg } = useQuery({
    queryKey: ['whatsapp-config', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_organizations')
        .select('whatsapp_config')
        .eq('id', organizationId)
        .single();

      if (error) throw error;
      return data?.whatsapp_config || null;
    },
    enabled: !!organizationId,
  });

  const orgName = useMemo(() => {
    return waCfg?.company_name || 'DCS Group';
  }, [waCfg]);

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
        description: j.description, hiringMode: j.hiring_mode, jobType: j.job_type,
        clientDetails: j.client_details, noticePeriod: j.notice_period, department: j.department,
      }));
    },
    enabled: !!organizationId,
  });

  const filters: SearchFilters = useMemo(() => {
    const getTags = (key: string): SearchTag[] => {
      const m = searchParams.get(`mandatory_${key}`)?.split(',') || [];
      const o = searchParams.get(`optional_${key}`)?.split(',')  || [];
      return [
        ...m.filter(Boolean).map(v => ({ value: stripQuotes(v), mandatory: true  })),
        ...o.filter(Boolean).map(v  => ({ value: stripQuotes(v), mandatory: false })),
      ];
    };
    return {
      keywords: getTags('keywords'), skills: getTags('skills'),
      educations: getTags('educations'), locations: getTags('locations'),
      industries: getTags('industries'), companies: getTags('companies'),
      name: getTags('name'), email: getTags('email'),
      current_company:     searchParams.get('current_company')     || '',
      current_designation: searchParams.get('current_designation') || '',
      min_exp: searchParams.get('min_exp') ? parseInt(searchParams.get('min_exp')!) : null,
      max_exp: searchParams.get('max_exp') ? parseInt(searchParams.get('max_exp')!) : null,
      min_current_salary:  searchParams.get('min_current_salary')  ? parseFloat(searchParams.get('min_current_salary')!)  : null,
      max_current_salary:  searchParams.get('max_current_salary')  ? parseFloat(searchParams.get('max_current_salary')!)  : null,
      min_expected_salary: searchParams.get('min_expected_salary') ? parseFloat(searchParams.get('min_expected_salary')!) : null,
      max_expected_salary: searchParams.get('max_expected_salary') ? parseFloat(searchParams.get('max_expected_salary')!) : null,
      notice_periods: searchParams.get('notice_periods')?.split(',') || [],
      date_posted: searchParams.get('date_posted') || 'all_time',
      jd_text:              searchParams.get('jd_text') ? decodeURIComponent(searchParams.get('jd_text')!) : undefined,
      jd_job_title:         searchParams.get('jd_job_title')          || undefined,
      jd_selected_job_id:   searchParams.get('jd_selected_job_id')    || undefined,
      jd_generated_keywords: searchParams.get('jd_generated_keywords')?.split('|||').filter(Boolean) || undefined,
      jd_is_boolean_mode:   searchParams.get('jd_is_boolean_mode') === 'true',
    };
  }, [searchParams]);

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

  const { data: searchResults = [], isLoading } = useQuery<CandidateSearchResult[]>({
    queryKey: ['candidateSearchResults', organizationId, filters],
    queryFn: async () => {
      const proc = (tags: SearchTag[] = []) => ({
        mandatory: tags.filter(t =>  t.mandatory).map(t => t.value),
        optional:  tags.filter(t => !t.mandatory).map(t => t.value),
      });
      const kw = proc(filters.keywords); const sk = proc(filters.skills);
      const co = proc(filters.companies); const ed = proc(filters.educations);
      const lo = proc(filters.locations); const in_ = proc(filters.industries);
      const { data, error } = await supabase.rpc('search_unified_candidates_v31', {
        p_mandatory_keywords: kw.mandatory, p_optional_keywords: kw.optional,
        p_mandatory_skills: sk.mandatory, p_optional_skills: sk.optional,
        p_mandatory_companies: co.mandatory, p_optional_companies: co.optional,
        p_mandatory_educations: ed.mandatory, p_optional_educations: ed.optional,
        p_mandatory_locations: lo.mandatory, p_optional_locations: lo.optional,
        p_name: filters.name?.[0]?.value || null, p_email: filters.email?.[0]?.value || null,
        p_current_company: filters.current_company || null,
        p_current_designation: filters.current_designation || null,
        p_min_exp: filters.min_exp, p_max_exp: filters.max_exp,
        p_min_current_salary: filters.min_current_salary, p_max_current_salary: filters.max_current_salary,
        p_min_expected_salary: filters.min_expected_salary, p_max_expected_salary: filters.max_expected_salary,
        p_notice_periods: filters.notice_periods,
        p_industries: [...in_.mandatory, ...in_.optional],
        p_date_filter: filters.date_posted, p_organization_id: organizationId,
      });
      if (error) throw new Error(error.message);
      return data || [];
    },
  });

  const handleSearch = (nf: SearchFilters) => {
    const p = new URLSearchParams();
    const enc = (key: string, tags: SearchTag[] = [], fts = false) => {
      const e = (v: string) => fts ? wrapForFTS(v) : stripQuotes(v);
      const m = tags.filter(t =>  t.mandatory).map(t => e(t.value));
      const o = tags.filter(t => !t.mandatory).map(t => e(t.value));
      if (m.length) p.append(`mandatory_${key}`, m.join(','));
      if (o.length) p.append(`optional_${key}`,  o.join(','));
    };
    enc('keywords', nf.keywords, true); enc('locations', nf.locations, true);
    enc('skills', nf.skills); enc('companies', nf.companies);
    enc('educations', nf.educations); enc('industries', nf.industries);
    enc('name', nf.name); enc('email', nf.email);
    if (nf.current_company)     p.append('current_company',     nf.current_company);
    if (nf.current_designation) p.append('current_designation',  nf.current_designation);
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

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.keywords?.length) n++; if (filters.skills?.length) n++;
    if (filters.locations?.length) n++; if (filters.companies?.length) n++;
    if (filters.educations?.length) n++; if (filters.current_company) n++;
    if (filters.current_designation) n++; if (filters.min_exp || filters.max_exp) n++;
    if (filters.notice_periods?.length) n++;
    return n;
  }, [filters]);

  // ── Invite handlers ───────────────────────────────────────────────────────

  const handleSingleInvite = useCallback((candidate: CandidateSearchResult) => {
    setPendingSingle(candidate);
    setJobPickerMode('single');
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(
      selectedIds.size === searchResults.length
        ? new Set()
        : new Set(searchResults.map(r => r.id))
    );
  }, [selectedIds.size, searchResults]);

  const handleBulkInviteClick = () => {
    const pool     = selectedIds.size > 0 ? searchResults.filter(r => selectedIds.has(r.id)) : searchResults;
    const withEmail = pool.filter(r => r.email);
    if (!withEmail.length) return;
    setPendingBulkList(withEmail.map(r => ({
      id: r.id, name: r.full_name || r.candidate_name || '',
      email: r.email!, phone: r.phone || undefined, candidateOwnerId: userId || '',
    })));
    setJobPickerMode('bulk');
  };

  const handleJobPicked = (job: JobOption) => {
    setSelectedJob(job);
    setJobPickerMode(null);
    pendingBulkList.length > 0 ? setBulkModalOpen(true) : setSingleInviteOpen(true);
  };

  const handlePickerClose = () => {
    setJobPickerMode(null); setPendingSingle(null); setPendingBulkList([]);
  };

  return (
    <>
      <style>{`
        .zxr-page{min-height:100vh;background:#F4F5F7;font-family:'Inter',system-ui,sans-serif;--brand:#6C2BD9;--brand-light:#EDE9FE;--border:#E5E7EB;--text-primary:#111827;--text-secondary:#6B7280;--transition:150ms cubic-bezier(0.4,0,0.2,1)}
        .zxr-topbar{height:52px;background:white;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;padding:0 20px;position:sticky;top:0;z-index:30;box-shadow:0 1px 4px rgba(0,0,0,0.04);gap:12px}
        .zxr-topbar-left{display:flex;align-items:center;gap:10px;flex-shrink:0}
        .zxr-topbar-right{display:flex;align-items:center;gap:8px}
        .zxr-back-btn{width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:white;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all var(--transition);color:#6B7280}
        .zxr-back-btn:hover{border-color:#C4B5FD;color:var(--brand);background:var(--brand-light)}
        .zxr-topbar-title{font-size:14px;font-weight:700;color:var(--text-primary);line-height:1.2}
        .zxr-topbar-sub{font-size:11px;color:var(--text-secondary);display:flex;align-items:center;gap:4px}
        .zxr-topbar-sub .dot{width:6px;height:6px;border-radius:50%;background:#10B981;animation:zxr-pulse 2s infinite}
        @keyframes zxr-pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes zxr-spin{to{transform:rotate(360deg)}}
        .zxr-filter-btn{display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;border:1.5px solid var(--border);background:white;cursor:pointer;font-size:12.5px;font-weight:600;color:#374151;transition:all var(--transition)}
        .zxr-filter-btn:hover,.zxr-filter-btn.active{border-color:var(--brand);color:var(--brand);background:var(--brand-light)}
        .zxr-filter-badge{font-size:9.5px;font-weight:700;padding:1px 5px;border-radius:99px;background:var(--brand);color:white;line-height:1.4}
        .zxr-layout{display:flex;max-width:1920px;margin:0 auto;min-height:calc(100vh - 52px)}
        .zxr-sidebar{width:300px;flex-shrink:0;border-right:1px solid var(--border);background:white;overflow-y:auto;max-height:calc(100vh - 52px);position:sticky;top:52px;transition:width 0.25s ease,opacity 0.25s ease}
        .zxr-sidebar.collapsed{width:0;overflow:hidden;border-right:none;opacity:0}
        .zxr-sidebar::-webkit-scrollbar{width:4px}
        .zxr-sidebar::-webkit-scrollbar-thumb{background:#E5E7EB;border-radius:4px}
        .zxr-main{flex:1;min-width:0;padding:16px 20px;overflow:hidden}
        .zxr-bulk-bar{display:flex;align-items:center;gap:8px;padding:8px 14px;background:#EDE9FE;border:1px solid #DDD6FE;border-radius:10px;margin-bottom:10px}
        .zxr-bulk-count{font-size:13px;font-weight:700;color:#7C3AED}
        .zxr-bulk-invite-btn{display:flex;align-items:center;gap:5px;padding:5px 14px;border-radius:99px;border:none;background:#7B43F1;color:white;font-size:12px;font-weight:700;cursor:pointer;transition:background 0.15s}
        .zxr-bulk-invite-btn:hover{background:#6D28D9}
        .zxr-bulk-clear-btn{margin-left:auto;padding:5px 12px;border-radius:99px;border:1px solid #DDD6FE;background:white;color:#9CA3AF;font-size:12px;cursor:pointer}
        .zxr-results-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
        .zxr-results-count{font-size:13px;font-weight:600;color:var(--text-primary);display:flex;align-items:center;gap:7px}
        .zxr-results-count .badge{background:var(--brand-light);color:var(--brand);font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px}
        .zxr-select-all-btn{display:flex;align-items:center;gap:5px;padding:5px 12px;border-radius:99px;border:1px solid #E5E7EB;background:white;font-size:12px;font-weight:600;color:#6B7280;cursor:pointer;transition:all 0.15s}
        .zxr-select-all-btn:hover{border-color:var(--brand);color:var(--brand);background:var(--brand-light)}
        .zxr-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;height:320px;background:white;border-radius:10px;border:1px solid var(--border);gap:12px;color:var(--text-secondary);font-size:13.5px}
        .zxr-loading-ring{width:32px;height:32px;border-radius:50%;border:3px solid var(--brand-light);border-top-color:var(--brand);animation:zxr-spin 0.8s linear infinite}
        @media(max-width:768px){.zxr-sidebar{position:fixed;top:52px;left:0;bottom:0;z-index:40;width:100%;max-width:320px;box-shadow:4px 0 20px rgba(0,0,0,0.1)}.zxr-sidebar.collapsed{width:0;transform:translateX(-100%);opacity:0}}
      `}</style>

      <div className="zxr-page">
        <div className="zxr-topbar">
          <div className="zxr-topbar-left">
            <button className="zxr-back-btn" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <div>
              <div className="zxr-topbar-title">Candidate Search</div>
              <div className="zxr-topbar-sub">
                {isLoading
                  ? <><div className="zxr-loading-ring" style={{ width:8, height:8, borderWidth:1.5 }} /><span>Searching…</span></>
                  : <><div className="dot" /><span>{searchResults.length} candidates found</span></>}
              </div>
            </div>
          </div>
          <div className="zxr-topbar-right">
            <button className={`zxr-filter-btn ${sidebarOpen ? 'active' : ''}`}
              onClick={() => setSidebarOpen(!sidebarOpen)}>
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
              {activeFilterCount > 0 && <span className="zxr-filter-badge">{activeFilterCount}</span>}
            </button>
          </div>
        </div>

        <div className="zxr-layout">
          <aside className={`zxr-sidebar ${!sidebarOpen ? 'collapsed' : ''}`}>
            <CandidateSearchFilters onSearch={handleSearch} isSearching={isLoading}
              initialFilters={filters} organizationId={organizationId} hideHero={true} />
          </aside>

          <main className="zxr-main">
            {/* {selectedIds.size > 0 && (
              <div className="zxr-bulk-bar">
                <span className="zxr-bulk-count">{selectedIds.size} selected</span>
                <button className="zxr-bulk-invite-btn" onClick={handleBulkInviteClick}>
                  <Send size={13} /> Invite Selected ({selectedIds.size})
                </button>
                <button className="zxr-bulk-clear-btn" onClick={() => setSelectedIds(new Set())}>Clear</button>
              </div>
            )} */}

            {!isLoading && (
              <div className="zxr-results-header">
                <div className="zxr-results-count">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span>Results</span>
                  <span className="badge">{searchResults.length}</span>
                </div>
                {searchResults.length > 0 && (
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <button className="zxr-select-all-btn" onClick={handleSelectAll}>
                      {selectedIds.size === searchResults.length && searchResults.length > 0
                        ? 'Deselect All' : `Select All (${searchResults.length})`}
                    </button>
                    <button className="zxr-bulk-invite-btn" onClick={handleBulkInviteClick}>
                      <Send size={13} />
                      Bulk Invite{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
                    </button>
                  </div>
                )}
              </div>
            )}

            {isLoading ? (
              <div className="zxr-loading">
                <div className="zxr-loading-ring" />
                <span>Finding best candidates…</span>
              </div>
            ) : (
              <CandidateSearchResults
                results={searchResults} highlightTerms={highlightTerms}
                jobId={selectedJob?.id} jobTitle={selectedJob?.title}
                selectedIds={selectedIds} onToggleSelect={handleToggleSelect}
                onInvite={handleSingleInvite}
              />
            )}
          </main>
        </div>
      </div>

      {/* Step 1: Job picker */}
      <JobPickerModal
        isOpen={jobPickerMode !== null} onClose={handlePickerClose}
        onSelect={handleJobPicked} jobs={jobs}
        mode={jobPickerMode || 'single'}
        candidateCount={jobPickerMode === 'bulk' ? pendingBulkList.length : 1}
      />

      {/* Step 2a: Single */}
      {singleInviteOpen && selectedJob && pendingSingle && (
        <InviteCandidateModal
          isOpen={singleInviteOpen}
          onClose={() => { setSingleInviteOpen(false); setPendingSingle(null); setSelectedJob(null); }}
          jobId={selectedJob.id} job={selectedJob}
          prefillName={pendingSingle.full_name || pendingSingle.candidate_name || ''}
          prefillEmail={pendingSingle.email || ''} prefillPhone={pendingSingle.phone || ''}
          inviteSource="zivex"
        />
      )}

      {/* Step 2b: Bulk */}
      {bulkModalOpen && selectedJob && pendingBulkList.length > 0 && (
        <BulkInviteReviewModal
          isOpen={bulkModalOpen}
          onClose={() => { setBulkModalOpen(false); setPendingBulkList([]); setSelectedJob(null); setSelectedIds(new Set()); }}
          candidates={pendingBulkList} jobId={selectedJob.id}
          jobTitle={selectedJob.title} inviteSource="zivex"
          job={selectedJob}                    
  waTemplateName={waCfg?.default_template_name}
  waTemplateLanguage={waCfg?.default_template_language || 'en_US'}
  waOrgName={waCfg?.company_name || orgName || 'DCS Group'}
        />
      )}
    </>
  );
};

export default ZiveXResultsPage;