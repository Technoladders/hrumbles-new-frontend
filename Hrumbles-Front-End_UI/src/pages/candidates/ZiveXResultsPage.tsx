// src/pages/candidates/ZiveXResultsPage.tsx
// REDESIGNED: TI-style — violet header + collapsible sidebar + dense results table
// Search engine: Typesense via useTypesenseSearch hook

import { FC, useMemo, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import CandidateSearchFilters from '@/components/candidates/zive-x/CandidateSearchFilters';
import BulkInviteReviewModal, { BulkInviteCandidate } from '@/components/jobs/job/invite/BulkInviteReviewModal';
import InviteCandidateModal from '@/components/jobs/job/invite/InviteCandidateModal';
import { SearchFilters, CandidateSearchResult, SearchTag } from '@/types/candidateSearch';
import { useTypesenseSearch } from '@/hooks/zive-x/useTypesenseSearch';
import ZiveXResultsTable from '@/components/candidates/zive-x/ZiveXResultsTable';
import {
  ArrowLeft, SlidersHorizontal, Send, Briefcase, Search, X,
  Zap, ChevronLeft, ChevronRight, RefreshCw,
} from 'lucide-react';

const stripQ = (v: string) => v.replace(/^"|"$/g, '').trim();

interface JobOption {
  id: string; title: string; jobId: string;
  location?: string[] | string; experience?: any;
  skills?: string[]; description?: string;
  hiringMode?: string; jobType?: string;
  clientDetails?: any; noticePeriod?: string; department?: string;
}

// ── Job Picker Modal ──────────────────────────────────────────────────────────
const JobPickerModal: FC<{
  isOpen: boolean; onClose: () => void; onSelect: (j: JobOption) => void;
  jobs: JobOption[]; mode: 'single'|'bulk'; candidateCount?: number;
}> = ({ isOpen, onClose, onSelect, jobs, mode, candidateCount = 1 }) => {
  const [q, setQ] = useState('');
  const filtered = jobs.filter(j => j.title.toLowerCase().includes(q.toLowerCase()));
  if (!isOpen) return null;
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1050 }} />
      <div style={{
        position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
        zIndex:1051, width:'calc(100vw - 32px)', maxWidth:440,
        background:'#fff', borderRadius:14, boxShadow:'0 20px 56px rgba(0,0,0,0.2)', overflow:'hidden',
      }}>
        <div style={{
          padding:'14px 16px', background:'linear-gradient(135deg,#5B21B6,#7C3AED)',
          display:'flex', justifyContent:'space-between', alignItems:'center',
        }}>
          <div>
            <p style={{ margin:0, fontSize:13, fontWeight:700, color:'white' }}>
              {mode === 'bulk' ? `Select Job — Invite ${candidateCount} Candidate${candidateCount !== 1 ? 's' : ''}` : 'Select Job to Invite'}
            </p>
            <p style={{ margin:'2px 0 0', fontSize:10, color:'rgba(255,255,255,0.65)' }}>Choose which job this invite is for</p>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:6, padding:5, cursor:'pointer' }}>
            <X size={13} color="white" />
          </button>
        </div>
        <div style={{ padding:'10px 12px', borderBottom:'1px solid #F3F4F6', position:'relative' }}>
          <Search size={12} style={{ position:'absolute', left:22, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }} />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search jobs…"
            style={{ width:'100%', padding:'7px 10px 7px 28px', borderRadius:7, border:'1px solid #E5E7EB', fontSize:12, outline:'none', boxSizing:'border-box' }} />
        </div>
        <div style={{ maxHeight:340, overflowY:'auto' }}>
          {filtered.length === 0
            ? <div style={{ padding:28, textAlign:'center', color:'#9CA3AF', fontSize:12 }}>No active jobs found</div>
            : filtered.map((j, i) => (
              <button key={j.id} onClick={() => { onSelect(j); setQ(''); }}
                style={{ width:'100%', padding:'10px 14px', border:'none', background:'none', textAlign:'left', cursor:'pointer', display:'flex', alignItems:'center', gap:10, borderBottom: i < filtered.length - 1 ? '1px solid #F9FAFB' : 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F5F3FF')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                <div style={{ width:30, height:30, borderRadius:8, background:'#EDE9FE', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Briefcase size={14} color="#7C3AED" />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ margin:0, fontSize:12, fontWeight:600, color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{j.title}</p>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
                    <span style={{ fontSize:10, color:'#9CA3AF', fontFamily:'monospace' }}>{j.jobId}</span>
                    {j.hiringMode && <span style={{ fontSize:9, fontWeight:600, padding:'1px 5px', borderRadius:99, background:'#EDE9FE', color:'#7C3AED' }}>{j.hiringMode}</span>}
                  </div>
                </div>
                <span style={{ fontSize:16, color:'#C4B5FD' }}>›</span>
              </button>
            ))
          }
        </div>
        <div style={{ padding:'10px 14px', borderTop:'1px solid #F3F4F6', background:'#FAFAFA', display:'flex', justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'6px 14px', borderRadius:7, border:'1px solid #E5E7EB', background:'#fff', fontSize:12, fontWeight:600, cursor:'pointer', color:'#6B7280' }}>Cancel</button>
        </div>
      </div>
    </>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const ZiveXResultsPage: FC = () => {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const organizationId = useSelector((s: any) => s.auth.organization_id);
  const userId         = useSelector((s: any) => s.auth.user?.id);
  const SIDEBAR_W      = 280;
  const [sidebarOpen,  setSidebarOpen] = useState(true);

  // Invite state
  const [jobPickerMode,    setJobPickerMode]    = useState<'single'|'bulk'|null>(null);
  const [pendingSingle,    setPendingSingle]    = useState<CandidateSearchResult|null>(null);
  const [pendingBulkList,  setPendingBulkList]  = useState<BulkInviteCandidate[]>([]);
  const [selectedJob,      setSelectedJob]      = useState<JobOption|null>(null);
  const [singleInviteOpen, setSingleInviteOpen] = useState(false);
  const [bulkModalOpen,    setBulkModalOpen]    = useState(false);
  const [selectedIds,      setSelectedIds]      = useState<Set<string>>(new Set());

  const { data: waCfg } = useQuery({
    queryKey: ['whatsapp-config', organizationId],
    queryFn: async () => {
      const { data } = await supabase.from('hr_organizations').select('whatsapp_config').eq('id', organizationId).single();
      return data?.whatsapp_config || null;
    },
    enabled: !!organizationId,
  });

  const { data: jobs = [] } = useQuery<JobOption[]>({
    queryKey: ['zx-jobs', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.from('hr_jobs').select('*')
        .eq('organization_id', organizationId).eq('status', 'Active')
        .order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return (data || []).map(j => ({
        id: j.id, title: j.title, jobId: j.job_id, location: j.location,
        experience: j.experience, skills: j.skills, description: j.description,
        hiringMode: j.hiring_mode, jobType: j.job_type,
        clientDetails: j.client_details, noticePeriod: j.notice_period, department: j.department,
      }));
    },
    enabled: !!organizationId,
  });

  // Parse filters from URL
  const filters: SearchFilters = useMemo(() => {
    const getTags = (key: string): SearchTag[] => {
      const m = searchParams.get(`mandatory_${key}`)?.split(',') || [];
      const o = searchParams.get(`optional_${key}`)?.split(',')  || [];
      return [
        ...m.filter(Boolean).map(v => ({ value: stripQ(v), mandatory: true  })),
        ...o.filter(Boolean).map(v => ({ value: stripQ(v), mandatory: false })),
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
      date_posted: searchParams.get('date_posted') || 'all_time',
      jd_text: searchParams.get('jd_text') ? decodeURIComponent(searchParams.get('jd_text')!) : undefined,
      jd_job_title: searchParams.get('jd_job_title') || undefined,
      jd_selected_job_id: searchParams.get('jd_selected_job_id') || undefined,
      jd_generated_keywords: searchParams.get('jd_generated_keywords')?.split('|||').filter(Boolean) || undefined,
      jd_is_boolean_mode: searchParams.get('jd_is_boolean_mode') === 'true',
    };
  }, [searchParams]);

  const highlightTerms = useMemo(() => {
    const terms: string[] = [];
    ['keywords','skills','companies','educations','locations'].forEach(k => {
      const m = searchParams.get(`mandatory_${k}`)?.split(',') || [];
      const o = searchParams.get(`optional_${k}`)?.split(',')  || [];
      [...m, ...o].filter(Boolean).forEach(v => terms.push(stripQ(v)));
    });
    const cc = searchParams.get('current_company');     if (cc) terms.push(cc);
    const cd = searchParams.get('current_designation'); if (cd) terms.push(cd);
    return [...new Set(terms.filter(Boolean))];
  }, [searchParams]);

  const { data: searchResults = [], isLoading, isError, error, refetch } = useTypesenseSearch({ filters, organizationId });

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.keywords?.length) n++; if (filters.skills?.length) n++;
    if (filters.locations?.length) n++; if (filters.companies?.length) n++;
    if (filters.educations?.length) n++; if (filters.current_company) n++;
    if (filters.current_designation) n++; if (filters.min_exp || filters.max_exp) n++;
    if (filters.notice_periods?.length) n++;
    return n;
  }, [filters]);

  const handleSearch = (nf: SearchFilters) => {
    const p = new URLSearchParams();
    const enc = (key: string, tags: SearchTag[] = []) => {
      const m = tags.filter(t =>  t.mandatory).map(t => stripQ(t.value));
      const o = tags.filter(t => !t.mandatory).map(t => stripQ(t.value));
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
    if (nf.jd_text)                  p.append('jd_text', encodeURIComponent(nf.jd_text));
    if (nf.jd_job_title)             p.append('jd_job_title', nf.jd_job_title);
    if (nf.jd_selected_job_id)       p.append('jd_selected_job_id', nf.jd_selected_job_id);
    if (nf.jd_generated_keywords?.length) p.append('jd_generated_keywords', nf.jd_generated_keywords.join('|||'));
    if (nf.jd_is_boolean_mode !== undefined) p.append('jd_is_boolean_mode', nf.jd_is_boolean_mode.toString());
    navigate(`/zive-x-search/results?${p.toString()}`, { replace: true });
  };

  const handleSingleInvite    = useCallback((c: CandidateSearchResult) => { setPendingSingle(c); setJobPickerMode('single'); }, []);
  const handleToggleSelect    = useCallback((id: string) => { setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }, []);
  const handleSelectAll       = useCallback(() => { setSelectedIds(selectedIds.size === searchResults.length ? new Set() : new Set(searchResults.map(r => r.id))); }, [selectedIds.size, searchResults]);
  const handleBulkInviteClick = () => {
    const pool = selectedIds.size > 0 ? searchResults.filter(r => selectedIds.has(r.id)) : searchResults;
    const withEmail = pool.filter(r => r.email);
    if (!withEmail.length) return;
    setPendingBulkList(withEmail.map(r => ({ id: r.id, name: r.full_name || '', email: r.email!, phone: r.phone, candidateOwnerId: userId || '' })));
    setJobPickerMode('bulk');
  };
  const handleJobPicked = (job: JobOption) => {
    setSelectedJob(job); setJobPickerMode(null);
    pendingBulkList.length > 0 ? setBulkModalOpen(true) : setSingleInviteOpen(true);
  };
  const handlePickerClose = () => { setJobPickerMode(null); setPendingSingle(null); setPendingBulkList([]); };

  const orgName = waCfg?.company_name || 'DCS Group';

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 70px - 8px)', background:'#f8f9fc', fontFamily:'Inter,system-ui,sans-serif' }}>

      {/* ── Header ── */}
      <div style={{
        flexShrink:0, height:44,
        background:'linear-gradient(90deg,#5B21B6,#7C3AED)',
        borderBottom:'1px solid rgba(109,28,217,0.3)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'0 14px', gap:8, boxShadow:'0 1px 4px rgba(0,0,0,0.08)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <button onClick={() => navigate(-1)} style={{
            width:28, height:28, borderRadius:7, border:'1px solid rgba(255,255,255,0.2)',
            background:'rgba(255,255,255,0.1)', display:'flex', alignItems:'center',
            justifyContent:'center', cursor:'pointer', color:'white',
          }}>
            <ArrowLeft size={13} />
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <div style={{ width:22, height:22, borderRadius:6, background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Zap size={12} color="white" />
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'white', lineHeight:1.2 }}>Candidate Search</div>
              <div style={{ fontSize:9, color:'rgba(255,255,255,0.65)', lineHeight:1, display:'flex', alignItems:'center', gap:4 }}>
                {isLoading
                  ? <><RefreshCw size={8} style={{ animation:'spin 0.8s linear infinite' }} /> Searching…</>
                  : <><span style={{ width:5, height:5, borderRadius:'50%', background:'#34D399', display:'inline-block' }} />{searchResults.length.toLocaleString()} candidates found</>
                }
              </div>
            </div>
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {/* Engine badge */}
          <div style={{
            display:'inline-flex', alignItems:'center', gap:4, padding:'3px 8px',
            borderRadius:99, background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.2)',
            fontSize:9, fontWeight:700, color:'white', letterSpacing:'0.2px',
          }}>
            <Zap size={9} /> Typesense
          </div>

          {/* Actions */}
          {searchResults.length > 0 && (
            <button onClick={handleSelectAll} style={{
              padding:'4px 10px', borderRadius:99, border:'1px solid rgba(255,255,255,0.3)',
              background:'rgba(255,255,255,0.1)', fontSize:11, fontWeight:600,
              color:'white', cursor:'pointer',
            }}>
              {selectedIds.size === searchResults.length && searchResults.length > 0 ? 'Deselect All' : `Select All (${searchResults.length})`}
            </button>
          )}
          {searchResults.length > 0 && (
            <button onClick={handleBulkInviteClick} style={{
              display:'flex', alignItems:'center', gap:4, padding:'4px 10px',
              borderRadius:99, border:'none', background:'rgba(255,255,255,0.95)',
              fontSize:11, fontWeight:700, color:'#6D28D9', cursor:'pointer',
            }}>
              <Send size={10} /> Bulk Invite{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
            </button>
          )}

          {/* Filter toggle */}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
            display:'flex', alignItems:'center', gap:4, padding:'4px 9px',
            borderRadius:7, border:'1px solid rgba(255,255,255,0.2)',
            background: sidebarOpen ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
            cursor:'pointer', fontSize:11, fontWeight:600, color:'white',
          }}>
            <SlidersHorizontal size={11} />
            Filters
            {activeFilterCount > 0 && (
              <span style={{ fontSize:9, fontWeight:700, padding:'1px 4px', borderRadius:99, background:'rgba(255,255,255,0.9)', color:'#6D28D9' }}>
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ display:'flex', flex:1, minHeight:0, overflow:'hidden', position:'relative' }}>

        {/* Sidebar */}
        <div style={{
          flexShrink:0, borderRight:'1px solid #E5E7EB', background:'white',
          overflow:'hidden', transition:'width 0.25s ease, opacity 0.25s ease',
          width: sidebarOpen ? SIDEBAR_W : 0, opacity: sidebarOpen ? 1 : 0,
        }}>
          <div style={{ width:SIDEBAR_W, height:'100%', overflowY:'auto' }}>
            <CandidateSearchFilters
              onSearch={handleSearch}
              isSearching={isLoading}
              initialFilters={filters}
              organizationId={organizationId}
              hideHero={true}
            />
          </div>
        </div>

        {/* Floating sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{
            position:'absolute', top:'50%', transform:'translateY(-50%)',
            left: sidebarOpen ? SIDEBAR_W - 1 : -1, zIndex:20,
            width:14, height:40, background:'white',
            border:'1px solid #E5E7EB', borderLeft:'none',
            borderRadius:'0 6px 6px 0', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'#9CA3AF', boxShadow:'2px 0 6px rgba(0,0,0,0.06)',
            transition:'left 0.25s ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#7C3AED'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#C4B5FD'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#9CA3AF'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#E5E7EB'; }}
        >
          {sidebarOpen ? <ChevronLeft size={10} /> : <ChevronRight size={10} />}
        </button>

        {/* Results */}
        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', overflow:'hidden' }}>
          {isError && (
            <div style={{
              margin:'8px 12px 0', padding:'10px 14px', borderRadius:8,
              background:'#FEF2F2', border:'1px solid #FECACA',
              fontSize:12, color:'#B91C1C', display:'flex', alignItems:'center', gap:8, flexShrink:0,
            }}>
              Search error: {(error as Error)?.message || 'Unknown error'}. Check Typesense connection.
            </div>
          )}

          <ZiveXResultsTable
            results={searchResults}
            isLoading={isLoading}
            highlightTerms={highlightTerms}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onInvite={handleSingleInvite}
            jobId={selectedJob?.id}
            jobTitle={selectedJob?.title}
          />
        </div>
      </div>

      <JobPickerModal
        isOpen={jobPickerMode !== null} onClose={handlePickerClose}
        onSelect={handleJobPicked} jobs={jobs}
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
          candidates={pendingBulkList} jobId={selectedJob.id} jobTitle={selectedJob.title}
          inviteSource="zivex" job={selectedJob}
          waTemplateName={waCfg?.default_template_name}
          waTemplateLanguage={waCfg?.default_template_language || 'en_US'}
          waOrgName={waCfg?.company_name || orgName}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default ZiveXResultsPage;