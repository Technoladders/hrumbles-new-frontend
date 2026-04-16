
import { useState, useEffect, FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import moment from 'moment';
import { useDebounce } from 'use-debounce';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users, UserPlus, Search, History, Calendar,
  ChevronLeft, ChevronRight, Briefcase, ScanSearch, Mail, Phone, Sparkles,
  Bookmark, Filter, MessageSquare, Send, X, CheckSquare,
} from 'lucide-react';

import AddCandidateModal        from '@/components/candidates/talent-pool/AddCandidateModal';
import CompareWithJobDialog     from '@/components/candidates/talent-pool/CompareWithJobDialog';
import AnalysisHistoryDialog    from '@/components/candidates/AnalysisHistoryDialog';
import EnrichDataDialog         from '@/components/candidates/talent-pool/EnrichDataDialog';
import CircularProgress         from '@/components/jobs/ui/CircularProgress';
import JobMatchModal            from '@/components/candidates/talent-pool/JobMatchModal';
import WishlistModal            from '@/components/candidates/talent-pool/WishlistModal';
import { CandidateActivityButton } from '@/components/candidates/activity/CandidateActivityButton';
import InviteCandidateModal     from '@/components/jobs/job/invite/InviteCandidateModal';
import BulkInviteReviewModal, { BulkInviteCandidate } from '@/components/jobs/job/invite/BulkInviteReviewModal';
import V2WhatsAppFloat          from '@/components/MagicLinkView/candidate-profile-v2/components/V2WhatsAppFloat';

export interface TalentPoolCandidate {
  id: string;
  candidate_name: string;
  email: string;
  phone: string;
  suggested_title: string;
  created_at: string;
  created_by: { first_name: string; last_name: string } | null;
  matching_skill_count?: number;
  matching_skills?: string[];
  total_candidate_count?: number;
  [key: string]: any;
}

interface Job { id: string; title: string; skills: string[]; primary_skills?: string[]; description: string; experience: string | Record<string, any>; location: string[]; department?: string; budget?: string; budgetType?: string; }
interface RootState { auth: { role: string; user: { id: string; organization_id: string } | null; }; }

const calculateProfileCompletion = (candidate: TalentPoolCandidate) => {
  const fields = ['phone','total_experience','current_company','current_designation','notice_period','current_location','highest_education','work_experience'];
  let filled = 0; const missing: string[] = [];
  fields.forEach(k => {
    const v = candidate[k];
    const ok = Array.isArray(v) ? v.length > 0 : !!v && String(v).trim() !== '';
    if (ok) filled++; else missing.push(k.replace(/_/g,' '));
  });
  const pct = Math.round((filled / fields.length) * 100);
  return { percentage: pct, colorClass: pct < 50 ? 'text-red-500' : pct < 100 ? 'text-yellow-500' : 'text-green-500', missingFields: missing };
};

// ── Job picker modal ─────────────────────────────────────────────────────────
interface JobPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (job: Job) => void;
  organizationId: string;
  title?: string;
}
const JobPickerModal: FC<JobPickerProps> = ({ isOpen, onClose, onSelect, organizationId, title = 'Select a job to invite for' }) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 300);

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobsForInvite', organizationId, debouncedSearch],
    queryFn: async () => {
      if (!organizationId) return [];
      let q = supabase.from('hr_jobs')
        .select('id, title, skills, primary_skills, description, experience, location, department, budget, budgetType:budget_type')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (debouncedSearch) q = q.ilike('title', `%${debouncedSearch}%`);
      const { data, error } = await q.limit(60);
      if (error) throw error;
      return data as Job[];
    },
    enabled: !!organizationId && isOpen,
  });

  if (!isOpen) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 2001, width: 'min(480px, calc(100vw - 32px))', maxHeight: '70vh',
        background: '#fff', borderRadius: '14px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'linear-gradient(135deg,#7C3AED,#9B59F5)' }}>
          <div>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#fff' }}>{title}</p>
            <p style={{ margin: '2px 0 0', fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Choose a position to link with this invite</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '6px', padding: '5px', cursor: 'pointer', display: 'flex' }}>
            <X size={14} color="#fff" />
          </button>
        </div>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #F3F4F6', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs..."
              style={{ width: '100%', paddingLeft: 28, paddingRight: 10, paddingTop: 7, paddingBottom: 7, borderRadius: '7px', border: '1px solid #E5E7EB', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF', fontSize: '12px' }}>Loading jobs…</div>
          ) : !jobs?.length ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF', fontSize: '12px' }}>No jobs found</div>
          ) : jobs.map(j => (
            <button key={j.id} onClick={() => { onSelect(j); onClose(); }}
              style={{ width: '100%', padding: '10px 14px', border: 'none', background: '#fff', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #F9FAFB', display: 'flex', alignItems: 'center', gap: 8 }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F5F3FF')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Briefcase size={12} color="#7C3AED" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title}</p>
                {j.department && <p style={{ margin: '1px 0 0', fontSize: '10px', color: '#9CA3AF' }}>{j.department}</p>}
              </div>
              <ChevronRight size={12} color="#C4B5FD" />
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

// ── Main Page ────────────────────────────────────────────────────────────────
const TalentPoolPage: FC = () => {
  const { role, user } = useSelector((state: RootState) => state.auth);
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchTerm, setSearchTerm]     = useState<string>(searchParams.get('search') || '');
  const [currentPage, setCurrentPage]   = useState<number>(parseInt(searchParams.get('page') || '1', 10));
  const [itemsPerPage, setItemsPerPage] = useState<number>(parseInt(searchParams.get('limit') || '20', 10));
  const [filterCreator, setFilterCreator] = useState<string>('all');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  const [selectedJob, setSelectedJob]         = useState<Job | null>(null);
  const [isJobPopoverOpen, setJobPopoverOpen] = useState(false);
  const [jobSearchTerm, setJobSearchTerm]     = useState('');
  const [debouncedJobSearchTerm] = useDebounce(jobSearchTerm, 500);

  const [isMatchModalOpen, setMatchModalOpen]     = useState<boolean>(false);
  const [isAddModalOpen, setAddModalOpen]         = useState<boolean>(false);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState<boolean>(false);

  const [compareCandidate, setCompareCandidate]   = useState<TalentPoolCandidate | null>(null);
  const [historyCandidate, setHistoryCandidate]   = useState<TalentPoolCandidate | null>(null);
  const [enrichCandidate, setEnrichCandidate]     = useState<TalentPoolCandidate | null>(null);
  const [copiedValue, setCopiedValue]             = useState<'email' | 'phone' | null>(null);

  // Invite state
  const [singleInviteCandidate, setSingleInviteCandidate] = useState<TalentPoolCandidate | null>(null);
  const [singleInviteJob, setSingleInviteJob]             = useState<Job | null>(null);
  const [showSingleJobPicker, setShowSingleJobPicker]     = useState(false);

  // Bulk invite state
  const [selectedIds, setSelectedIds]             = useState<Set<string>>(new Set());
  const [showBulkJobPicker, setShowBulkJobPicker] = useState(false);
  const [bulkInviteJob, setBulkInviteJob]         = useState<Job | null>(null);
  const [showBulkModal, setShowBulkModal]         = useState(false);

  // WA float
  const [floatCandidate, setFloatCandidate] = useState<TalentPoolCandidate | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm)      params.set('search', searchTerm);
    if (currentPage !== 1) params.set('page', currentPage.toString());
    if (itemsPerPage !== 20) params.set('limit', itemsPerPage.toString());
    setSearchParams(params, { replace: true });
  }, [searchTerm, currentPage, itemsPerPage, setSearchParams]);

  const handleCopyToClipboard = (text: string, type: 'email' | 'phone') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedValue(type);
    setTimeout(() => setCopiedValue(null), 1500);
  };

  const { data: teamMembers } = useQuery({
    queryKey: ['teamMembers', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('hr_employees')
        .select('user_id, first_name, last_name, hr_talent_pool!hr_talent_pool_created_by_fkey!inner(id)')
        .eq('organization_id', organizationId).not('user_id', 'is', null);
      if (error) return [];
      return data || [];
    },
    enabled: !!organizationId && role !== 'employee',
    staleTime: 5 * 60 * 1000,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['talentPoolCandidates', role, user?.id, currentPage, itemsPerPage, debouncedSearchTerm, filterCreator],
    queryFn: async () => {
      const from = (currentPage - 1) * itemsPerPage;
      const to   = from + itemsPerPage - 1;
      let query = supabase.from('hr_talent_pool')
        .select(`id, candidate_name, email, phone, suggested_title, created_at, current_salary, current_location, total_experience, current_company, current_designation, notice_period, highest_education, work_experience, created_by:hr_employees!hr_talent_pool_created_by_fkey (first_name, last_name)`, { count: 'exact' });
      if (organizationId) query = query.eq('organization_id', organizationId);
      const TASKUP = '0e4318d8-b1a5-4606-b311-c56d7eec47ce';
      if (user?.id) {
        if (organizationId === TASKUP && role === 'employee') query = query.eq('created_by', user.id);
        else if (filterCreator === 'my') query = query.eq('created_by', user.id);
        else if (filterCreator !== 'all') query = query.eq('created_by', filterCreator);
      }
      if (debouncedSearchTerm) {
        const s = `%${debouncedSearchTerm}%`;
        query = query.or(`candidate_name.ilike.${s},email.ilike.${s},phone.ilike.${s}`);
      }
      query = query.range(from, to).order('created_at', { ascending: false });
      const { data: d, error, count } = await query;
      if (error) throw new Error(error.message);
      return { candidates: d as TalentPoolCandidate[], totalCount: count ?? 0 };
    },
    enabled: !!user && !!organizationId,
  });

  const { data: jobs, isLoading: isLoadingJobs } = useQuery({
    queryKey: ['jobsForMatching', organizationId, debouncedJobSearchTerm],
    queryFn: async () => {
      if (!organizationId) return [];
      let q = supabase.from('hr_jobs').select('id, title, skills, primary_skills, description, experience, location').eq('organization_id', organizationId).order('created_at', { ascending: false });
      if (debouncedJobSearchTerm) q = q.ilike('title', `%${debouncedJobSearchTerm}%`);
      const { data: d, error } = await q.limit(50);
      if (error) throw new Error(error.message);
      return d as Job[];
    },
    enabled: !!organizationId && isJobPopoverOpen,
  });

  const { data: statsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ['talentPoolStats', role, user?.id, organizationId],
    queryFn: async () => {
      const month = moment().startOf('month').toISOString();
      const week  = moment().startOf('week').toISOString();
      const { count: mc } = await supabase.from('hr_talent_pool').select('*', { count: 'exact', head: true }).gte('created_at', month);
      const { count: wc } = await supabase.from('hr_talent_pool').select('*', { count: 'exact', head: true }).gte('created_at', week);
      return { addedThisMonth: mc ?? 0, addedThisWeek: wc ?? 0 };
    },
    enabled: !!user && !!organizationId,
  });

  const addedThisMonth      = statsData?.addedThisMonth ?? 0;
  const addedThisWeek       = statsData?.addedThisWeek ?? 0;
  const paginatedCandidates = data?.candidates ?? [];
  const totalCandidates     = data?.totalCount ?? 0;
  const totalPages          = Math.ceil(totalCandidates / itemsPerPage);

  const handleCandidateAdded      = () => { refetch(); setAddModalOpen(false); };
  const handleItemsPerPageChange  = (v: string) => { setItemsPerPage(parseInt(v, 10)); setCurrentPage(1); };
  const handleSearchChange        = (e: React.ChangeEvent<HTMLInputElement>) => { setSearchTerm(e.target.value); setCurrentPage(1); };
  const handleJobSelect           = (job: Job) => { setSelectedJob(job); setJobPopoverOpen(false); setMatchModalOpen(true); };
  const clearJobFilter            = () => { setSelectedJob(null); setMatchModalOpen(false); setCurrentPage(1); };

  // Checkbox helpers
  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll    = () => {
    if (selectedIds.size === paginatedCandidates.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(paginatedCandidates.map(c => c.id)));
  };

  // Single invite flow: click invite → job picker → InviteCandidateModal
  const handleSingleInvite = (c: TalentPoolCandidate) => {
    setSingleInviteCandidate(c);
    setSingleInviteJob(null);
    setShowSingleJobPicker(true);
  };
  const handleSingleJobSelected = (j: Job) => {
    setSingleInviteJob(j);
    setShowSingleJobPicker(false);
  };

  // Bulk invite flow: click bulk invite → job picker → BulkInviteReviewModal
  const handleBulkInvite = () => {
    if (selectedIds.size === 0) return;
    setBulkInviteJob(null);
    setShowBulkJobPicker(true);
  };
  const handleBulkJobSelected = (j: Job) => {
    setBulkInviteJob(j);
    setShowBulkJobPicker(false);
    setShowBulkModal(true);
  };

  const bulkCandidates: BulkInviteCandidate[] = paginatedCandidates
    .filter(c => selectedIds.has(c.id))
    .map(c => ({ id: c.id, name: c.candidate_name, email: c.email, phone: c.phone, candidateId: null, candidateOwnerId: user?.id || '' }));

  // ── Table ──────────────────────────────────────────────────────────────────
  const renderTable = () => {
    if (isLoading) return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-2.5">
              <Skeleton className="h-3.5 w-3.5 rounded" />
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3.5 w-24 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );

    if (!paginatedCandidates.length) return (
      <Card className="p-10 text-center text-sm text-gray-400">
        No candidates found.{searchTerm && ' Try adjusting your search.'}
      </Card>
    );

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden text-xs">
        {/* Table header */}
        <div style={{ display: 'grid', gridTemplateColumns: '28px 2fr 1.4fr 1fr 1fr 1.2fr 140px', gap: 0 }}
          className="bg-gradient-to-r from-purple-600 to-violet-600 px-2 py-2">
          <div className="flex items-center justify-center">
            <input type="checkbox"
              checked={selectedIds.size === paginatedCandidates.length && paginatedCandidates.length > 0}
              onChange={toggleAll}
              className="w-3 h-3 rounded cursor-pointer accent-white" />
          </div>
          {['Candidate', 'Contact', 'Salary', 'Location', 'Title', 'Actions'].map(h => (
            <div key={h} className="text-white font-semibold uppercase tracking-wide text-[10px] px-2 py-0.5 flex items-center">{h}</div>
          ))}
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-100">
          {paginatedCandidates.map(c => {
            const ps = calculateProfileCompletion(c);
            const fi = c.created_by?.first_name?.charAt(0) || '';
            const li = c.created_by?.last_name?.charAt(0) || '';
            const isSelected = selectedIds.has(c.id);

            return (
              <div key={c.id}
                style={{ display: 'grid', gridTemplateColumns: '28px 2fr 1.4fr 1fr 1fr 1.2fr 140px', gap: 0 }}
                className={`px-2 py-1.5 transition-colors ${isSelected ? 'bg-violet-50' : 'hover:bg-gray-50'}`}>

                {/* Checkbox */}
                <div className="flex items-center justify-center">
                  <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(c.id)}
                    className="w-3 h-3 rounded cursor-pointer accent-purple-600" />
                </div>

                {/* Candidate */}
                <div className="flex items-center gap-1.5 px-1.5 min-w-0">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold text-[9px]">
                    {c.candidate_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <Link to={`/talent-pool/${c.id}`}
                      className="font-semibold text-gray-800 hover:text-purple-600 text-[11px] leading-tight truncate block transition-colors">
                      {c.candidate_name || 'N/A'}
                    </Link>
                    <p className="text-[9px] text-gray-400 truncate">{c.suggested_title || '—'}</p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger>
                      <CircularProgress percentage={ps.percentage} showEnrichButton onEnrichClick={() => setEnrichCandidate(c)} />
                    </TooltipTrigger>
                    <TooltipContent>
                      {ps.percentage === 100 ? 'Profile complete' : <div><p className="font-semibold text-xs mb-1">Missing:</p><ul className="text-xs list-disc pl-3">{ps.missingFields.map(f => <li key={f}>{f}</li>)}</ul></div>}
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Contact */}
                <div className="flex items-center gap-1 px-1.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button onClick={() => handleCopyToClipboard(c.email, 'email')}
                        className="p-1 rounded hover:bg-purple-50 transition-colors flex-shrink-0">
                        <Mail size={11} className="text-purple-400" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{copiedValue === 'email' ? 'Copied!' : c.email}</TooltipContent>
                  </Tooltip>
                  {c.phone && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button onClick={() => handleCopyToClipboard(c.phone, 'phone')}
                          className="p-1 rounded hover:bg-purple-50 transition-colors flex-shrink-0">
                          <Phone size={11} className="text-purple-400" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{copiedValue === 'phone' ? 'Copied!' : c.phone}</TooltipContent>
                    </Tooltip>
                  )}
                  {/* <span className="text-gray-400 text-[10px] truncate ml-0.5">{c.email?.split('@')[0]}</span> */}
                </div>

                {/* Salary */}
                <div className="px-1.5 flex items-center text-gray-600 text-[10px] truncate">
                  {c.current_salary || <span className="text-gray-300">—</span>}
                </div>

                {/* Location */}
                <div className="px-1.5 flex items-center text-gray-600 text-[10px] truncate">
                  {c.current_location || <span className="text-gray-300">—</span>}
                </div>

                {/* Added by */}
                <div className="px-1.5 flex items-center gap-1.5 min-w-0">
                  {(fi || li) ? (
                    <>
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold text-[8px]">
                        {`${fi}${li}`.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-700 font-medium truncate">{`${c.created_by?.first_name || ''} ${c.created_by?.last_name || ''}`.trim()}</p>
                        <p className="text-[9px] text-gray-400">{moment(c.created_at).format('DD MMM YY')}</p>
                      </div>
                    </>
                  ) : <span className="text-gray-400 text-[10px]">System</span>}
                </div>

                {/* Actions — compact icon row */}
                <div className="flex items-center gap-0.5 px-1">
                  <Tooltip><TooltipTrigger asChild>
                    <button onClick={() => setHistoryCandidate(c)} className="p-1 rounded hover:bg-gray-100"><History size={11} className="text-gray-400" /></button>
                  </TooltipTrigger><TooltipContent>History</TooltipContent></Tooltip>

                  <Tooltip><TooltipTrigger asChild>
                    <button onClick={() => setCompareCandidate(c)} className="p-1 rounded hover:bg-gray-100"><ScanSearch size={11} className="text-gray-400" /></button>
                  </TooltipTrigger><TooltipContent>Compare</TooltipContent></Tooltip>

                  <Tooltip><TooltipTrigger asChild>
                    <button onClick={() => setEnrichCandidate(c)} className="p-1 rounded hover:bg-violet-50"><Sparkles size={11} className="text-violet-400" /></button>
                  </TooltipTrigger><TooltipContent>Enrich</TooltipContent></Tooltip>

                  <CandidateActivityButton candidateId={c.id} candidateName={c.candidate_name} />

                  <div className="w-px h-3 bg-gray-200 mx-0.5" />

                  {/* Single invite */}
                  <Tooltip><TooltipTrigger asChild>
                    <button onClick={() => handleSingleInvite(c)}
                      className="p-1 rounded hover:bg-purple-50 transition-colors">
                      <Send size={11} className="text-purple-500" />
                    </button>
                  </TooltipTrigger><TooltipContent>Invite</TooltipContent></Tooltip>

                  {/* WhatsApp chat */}
                  {c.phone && (
                    <Tooltip><TooltipTrigger asChild>
                      <button onClick={() => setFloatCandidate(c)}
                        className="p-1 rounded hover:bg-green-50 transition-colors">
                        <MessageSquare size={11} className="text-green-500" />
                      </button>
                    </TooltipTrigger><TooltipContent>WhatsApp</TooltipContent></Tooltip>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPagination = () => {
    if (!totalCandidates) return null;
    const start = (currentPage - 1) * itemsPerPage;
    return (
      <div className="flex flex-col sm:flex-row justify-between items-center mt-3 gap-3 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span>Show</span>
          <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
            <SelectTrigger className="w-[60px] h-7 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{['5','10','20','50'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
          </Select>
          <span>per page</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setCurrentPage(p => Math.max(p-1,1))} disabled={currentPage===1}><ChevronLeft className="h-3 w-3"/></Button>
          <span className="font-medium">Page {currentPage} of {totalPages}</span>
          <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setCurrentPage(p => Math.min(p+1,totalPages))} disabled={currentPage===totalPages}><ChevronRight className="h-3 w-3"/></Button>
        </div>
        <span>Showing {Math.min(start+1,totalCandidates)}–{Math.min(start+itemsPerPage,totalCandidates)} of {totalCandidates}</span>
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-4 animate-fade-in p-4">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold">Talent Pool</h1>
            <p className="text-xs text-gray-500 mt-0.5">Search and manage your candidates</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsWishlistModalOpen(true)}
              className="h-8 text-xs rounded-full border-gray-300 text-gray-600 hover:bg-purple-600 hover:text-white hover:border-purple-600 transition-colors gap-1.5">
              <Bookmark size={13} />Shortlist
            </Button>
            <button onClick={() => setAddModalOpen(true)}
              className="flex items-center gap-2 pl-2 pr-4 py-1.5 rounded-full text-white text-xs font-bold bg-purple-600 hover:bg-purple-700 shadow-md transition-all h-8">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                <UserPlus size={11} className="text-white" />
              </div>
              Add Candidate
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: isLoading ? '…' : totalCandidates, icon: Users, color: 'blue' },
            { label: 'This Month', value: isStatsLoading ? '…' : addedThisMonth, icon: Calendar, color: 'green' },
            { label: 'This Week', value: isStatsLoading ? '…' : addedThisWeek, icon: Briefcase, color: 'yellow' },
            { label: 'Archived', value: 0, icon: Users, color: 'purple' },
          ].map(s => (
            <Card key={s.label} className="p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-xl font-bold mt-0.5">{s.value}</p>
              </div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${s.color}-50`}>
                <s.icon size={16} className={`text-${s.color}-500`} />
              </div>
            </Card>
          ))}
        </div>

        {/* Controls bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Creator filter */}
          <Select value={filterCreator} onValueChange={v => { setFilterCreator(v); setCurrentPage(1); }}>
            <SelectTrigger className="h-8 w-[150px] text-xs rounded-full border-gray-200 bg-white shadow-sm">
              <div className="flex items-center gap-1.5"><Filter size={11} className="text-gray-400" /><SelectValue placeholder="Filter" /></div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Candidates</SelectItem>
              <SelectItem value="my" className="text-xs">My Candidates</SelectItem>
              {role !== 'employee' && teamMembers?.length > 0 && (
                <>{teamMembers.map((m: any) => <SelectItem key={m.user_id} value={m.user_id} className="text-xs">{m.first_name} {m.last_name}</SelectItem>)}</>
              )}
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <Input placeholder="Search name, email, phone…" className="pl-9 h-8 text-xs rounded-full bg-gray-50"
              value={searchTerm} onChange={handleSearchChange} />
          </div>

          {/* Match with job */}
          <Popover open={isJobPopoverOpen} onOpenChange={setJobPopoverOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" className="h-8 text-xs rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 gap-1.5 px-3">
                <Sparkles size={12} />Match Job
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-3 rounded-xl shadow-xl border-none mt-1" align="end">
              <Command shouldFilter={false}>
                <CommandInput placeholder="Search jobs…" value={jobSearchTerm} onValueChange={setJobSearchTerm}
                  className="h-8 text-xs" />
                <CommandList className="mt-2 max-h-[240px]">
                  <CommandEmpty>{isLoadingJobs ? 'Loading…' : 'No jobs found.'}</CommandEmpty>
                  <CommandGroup>
                    {jobs?.map(j => (
                      <CommandItem key={j.id} value={j.title} onSelect={() => handleJobSelect(j)}
                        className="text-xs py-2 cursor-pointer">
                        {j.title}<ChevronRight size={12} className="ml-auto text-purple-400" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Bulk invite button — shown when any selected */}
          {selectedIds.size > 0 && (
            <button onClick={handleBulkInvite}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-bold bg-purple-600 hover:bg-purple-700 shadow-md transition-all h-8 animate-in fade-in slide-in-from-right-2">
              <CheckSquare size={12} />
              Bulk Invite ({selectedIds.size})
            </button>
          )}
        </div>

        {renderTable()}
        {renderPagination()}

        {/* ── Modals ── */}
        <JobMatchModal isOpen={isMatchModalOpen && !!selectedJob} onClose={clearJobFilter} job={selectedJob} organizationId={organizationId} />
        {isAddModalOpen     && <AddCandidateModal isOpen onClose={() => setAddModalOpen(false)} onCandidateAdded={handleCandidateAdded} />}
        {compareCandidate   && <CompareWithJobDialog isOpen onClose={() => setCompareCandidate(null)} candidateId={compareCandidate.id} />}
        {historyCandidate   && <AnalysisHistoryDialog isOpen onClose={() => setHistoryCandidate(null)} candidateId={historyCandidate.id} candidateName={historyCandidate.candidate_name ?? ''} />}
        {enrichCandidate    && <EnrichDataDialog isOpen onClose={() => setEnrichCandidate(null)} candidate={enrichCandidate} />}
        <WishlistModal isOpen={isWishlistModalOpen} onClose={() => setIsWishlistModalOpen(false)} />

        {/* Job picker for single invite */}
        <JobPickerModal isOpen={showSingleJobPicker} onClose={() => setShowSingleJobPicker(false)}
          onSelect={handleSingleJobSelected} organizationId={organizationId}
          title="Select job for this invite" />

        {/* Single invite modal — opens after job selected */}
        {singleInviteJob && singleInviteCandidate && (
          <InviteCandidateModal
            isOpen
            onClose={() => { setSingleInviteCandidate(null); setSingleInviteJob(null); }}
            jobId={singleInviteJob.id}
            job={singleInviteJob as any}
            prefillEmail={singleInviteCandidate.email || ''}
            prefillName={singleInviteCandidate.candidate_name || ''}
            prefillPhone={singleInviteCandidate.phone || ''}
            candidateId={null}
            candidateOwnerId={user.id}
            inviteSource="talentpool"
          />
        )}

        {/* Job picker for bulk invite */}
        <JobPickerModal isOpen={showBulkJobPicker} onClose={() => setShowBulkJobPicker(false)}
          onSelect={handleBulkJobSelected} organizationId={organizationId}
          title={`Select job for ${selectedIds.size} candidate${selectedIds.size !== 1 ? 's' : ''}`} />

        {/* Bulk invite modal */}
        {showBulkModal && bulkInviteJob && (
          <BulkInviteReviewModal
            isOpen
            onClose={() => { setShowBulkModal(false); setSelectedIds(new Set()); }}
            candidates={bulkCandidates}
            jobId={bulkInviteJob.id}
            jobTitle={bulkInviteJob.title}
            inviteSource="talentpool"
            job={bulkInviteJob as any}
          />
        )}

        {/* WA float for selected candidate */}
        {floatCandidate?.phone && (
          <V2WhatsAppFloat
            candidateId={floatCandidate.id}
            candidateName={floatCandidate.candidate_name || 'Candidate'}
            candidatePhone={floatCandidate.phone}
          />
        )}
      </div>
    </TooltipProvider>
  );
};

export default TalentPoolPage;