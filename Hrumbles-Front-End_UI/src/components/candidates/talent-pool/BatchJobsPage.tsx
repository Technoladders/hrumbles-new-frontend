// src/pages/candidates/BatchJobsPage.tsx
// Batch jobs analytics page — matches TalentPoolPage theme exactly
// Table with pagination + expandable child items with their own pagination

import { FC, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import moment from 'moment';
import {
  ChevronLeft, ChevronDown, ChevronRight, CheckCircle, XCircle,
  AlertCircle, Clock, Loader2, FileText, Users, BarChart2,
  RefreshCw, UploadCloud, Shield, User, Zap,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface BatchJob {
  id              : string;
  organization_id : string;
  created_by      : string;
  openai_batch_id : string;
  status          : string;
  total_files     : number;
  processed_files : number;
  failed_files    : number;
  skipped_files   : number;
  error_message   : string | null;
  created_at      : string;
  updated_at      : string;
  completed_at    : string | null;
  created_by_name : string | null;
  items_completed : number;
  items_failed    : number;
  items_skipped   : number;
  items_pending   : number;
  items_total     : number;
}
interface BatchItem {
  id            : string;
  file_name     : string;
  status        : string;
  result_status : string | null;
  error_message : string | null;
  created_at    : string;
}
interface RootState { auth: { role: string; user: { id: string; organization_id: string } | null } }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statusColor = (s: string) => ({
  processing: '#2563EB', pending: '#D97706',
  completed:  '#059669', failed:  '#DC2626',
  cancelled:  '#6B7280', expired: '#DC2626',
}[s] ?? '#6B7280');

const statusBg = (s: string) => ({
  processing: '#DBEAFE', pending: '#FEF3C7',
  completed:  '#ECFDF5', failed:  '#FEE2E2',
  cancelled:  '#F3F4F6', expired: '#FEE2E2',
}[s] ?? '#F3F4F6');

const statusLabel = (s: string) => ({
  processing: 'Processing', pending:   'Queued',
  completed:  'Completed',  failed:    'Failed',
  cancelled:  'Cancelled',  expired:   'Expired',
}[s] ?? s);

const fmtK = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K` : String(n);

const resultLabel = (r: string | null, err: string | null) => {
  if (r === 'INSERTED')          return { text: 'Added',         col: '#059669' };
  if (r === 'UPDATED')           return { text: 'Updated',       col: '#2563EB' };
  if (r === 'SKIPPED_RECENT')    return { text: 'Already recent',col: '#D97706' };
  if (r === 'SKIPPED_NO_EMAIL')  return { text: 'No email',      col: '#D97706' };
  if (err)                       return { text: err.slice(0, 40), col: '#DC2626' };
  return { text: '—', col: '#9CA3AF' };
};

// ─── Stat Card (matches TalentPoolPage StatDualCard style) ───────────────────
const StatCard: FC<{
  label: string; value: React.ReactNode;
  icon: React.ReactNode; accent: string;
  sub?: string; isLoading?: boolean;
}> = ({ label, value, icon, accent, sub, isLoading }) => (
  <div style={{
    background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12,
    padding: '12px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280' }}>{label}</span>
      <div style={{ width: 26, height: 26, borderRadius: 7, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>
        {icon}
      </div>
    </div>
    {isLoading
      ? <Skeleton className="h-6 w-16 mt-1"/>
      : <div style={{ fontSize: 22, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{value}</div>
    }
    {sub && <p style={{ fontSize: 10, color: '#9CA3AF', margin: '4px 0 0' }}>{sub}</p>}
  </div>
);

// ─── Expandable child items with pagination ───────────────────────────────────
const ITEMS_PER_PAGE = 5;

const ChildItemsTable: FC<{ jobId: string; isActive: boolean; isSuperAdmin: boolean }> = ({ jobId, isActive }) => {
  const [page, setPage] = useState(1);

  const { data: items, isLoading } = useQuery<BatchItem[]>({
    queryKey       : ['batchItems', jobId],
    queryFn        : async () => {
      const { data } = await supabase
        .from('hr_talent_pool_batch_items')
        .select('id,file_name,status,result_status,error_message,created_at')
        .eq('batch_job_id', jobId)
        .order('created_at', { ascending: true });
      return (data ?? []) as BatchItem[];
    },
    refetchInterval: isActive ? 15_000 : false,
  });

  if (isLoading) return (
    <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full"/>)}
    </div>
  );

  const total      = items?.length ?? 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const paged      = (items ?? []).slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div>
      {/* Child table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
          <thead>
            <tr style={{ background: '#F5F3FF' }}>
              {['File Name', 'Status', 'Result', 'Submitted At'].map(h => (
                <th key={h} style={{
                  padding: '7px 10px', textAlign: 'left', fontSize: 9,
                  fontWeight: 600, color: '#7C3AED', textTransform: 'uppercase',
                  letterSpacing: '.5px', whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((item, idx) => {
              const rl = resultLabel(item.result_status, item.error_message);
              return (
                <tr key={item.id} style={{
                  borderTop: '0.5px solid #EDE9FE',
                  background: idx % 2 === 0 ? '#fff' : '#FAF9FF',
                }}>
                  {/* File name */}
                  <td style={{ padding: '7px 10px', minWidth: 180 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: 5,
                        background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <FileText size={10} style={{ color: '#7C3AED' }}/>
                      </div>
                      <span style={{
                        fontSize: 11, color: '#374151', fontWeight: 500,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200,
                      }}>
                        {item.file_name}
                      </span>
                    </div>
                  </td>

                  {/* Status badge */}
                  <td style={{ padding: '7px 10px', whiteSpace: 'nowrap' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
                      background: statusBg(item.status), color: statusColor(item.status),
                    }}>
                      {item.status === 'pending'   && <Clock size={8}/>}
                      {item.status === 'completed' && <CheckCircle size={8}/>}
                      {item.status === 'failed'    && <XCircle size={8}/>}
                      {item.status === 'skipped'   && <AlertCircle size={8}/>}
                      {statusLabel(item.status)}
                    </span>
                  </td>

                  {/* Result */}
                  <td style={{ padding: '7px 10px' }}>
                    <span style={{ fontSize: 10, color: rl.col, fontWeight: 500 }}>{rl.text}</span>
                  </td>

                  {/* Time */}
                  <td style={{ padding: '7px 10px', fontSize: 10, color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                    {moment(item.created_at).format('DD MMM, HH:mm')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Child pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 10px', borderTop: '0.5px solid #EDE9FE', background: '#FAF9FF',
        }}>
          <span style={{ fontSize: 10, color: '#9CA3AF' }}>
            {((page-1)*ITEMS_PER_PAGE+1)}–{Math.min(page*ITEMS_PER_PAGE, total)} of {total} files
          </span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <Button variant="outline" size="sm" className="h-6 w-6 p-0"
              onClick={() => setPage(p => Math.max(p-1,1))} disabled={page===1}>
              <ChevronLeft className="h-3 w-3"/>
            </Button>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#374151', minWidth: 60, textAlign: 'center' }}>
              {page} / {totalPages}
            </span>
            <Button variant="outline" size="sm" className="h-6 w-6 p-0"
              onClick={() => setPage(p => Math.min(p+1,totalPages))} disabled={page===totalPages}>
              <ChevronRight className="h-3 w-3"/>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main table row with expand ───────────────────────────────────────────────
const JobTableRow: FC<{ job: BatchJob; idx: number; isSuperAdmin: boolean }> = ({ job, idx, isSuperAdmin }) => {
  const [expanded, setExpanded] = useState(false);
  const isActive  = job.status === 'processing' || job.status === 'pending';
  const done      = job.items_completed + job.items_failed + job.items_skipped;
  const pct       = job.items_total > 0 ? Math.round((done / job.items_total) * 100) : 0;
  const accentCol = statusColor(job.status);

  return (
    <>
      {/* Main row */}
      <tr
        style={{
          background  : expanded ? '#F5F3FF' : (idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'),
          borderBottom: '0.5px solid #F3F4F6',
          cursor      : 'pointer',
          transition  : 'background .12s',
        }}
        onMouseEnter={e => { if (!expanded) (e.currentTarget as HTMLTableRowElement).style.background = '#F0EEFF'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = expanded ? '#F5F3FF' : (idx%2===0?'#FFFFFF':'#FAFAFA'); }}
        onClick={() => setExpanded(e => !e)}
      >
        {/* Expand toggle */}
        <td style={{ padding: '9px 8px 9px 14px', width: 28 }}>
          <div style={{
            width: 18, height: 18, borderRadius: 5, border: '0.5px solid #D1D5DB',
            background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280',
          }}>
            {expanded ? <ChevronDown size={10}/> : <ChevronRight size={10}/>}
          </div>
        </td>

        {/* Status */}
        <td style={{ padding: '9px 8px', whiteSpace: 'nowrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
            background: statusBg(job.status), color: accentCol,
          }}>
            {isActive && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: accentCol, animation: 'pulse 1.5s infinite', display: 'inline-block' }}/>
            )}
            {statusLabel(job.status)}
          </span>
        </td>

        {/* User (superadmin) */}
        {isSuperAdmin && (
          <td style={{ padding: '9px 8px' }}>
            {job.created_by_name ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg,#A78BFA,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {job.created_by_name.charAt(0)}
                </div>
                <span style={{ fontSize: 11, color: '#374151', whiteSpace: 'nowrap' }}>{job.created_by_name}</span>
              </div>
            ) : <span style={{ fontSize: 10, color: '#9CA3AF' }}>—</span>}
          </td>
        )}

        {/* Files */}
        <td style={{ padding: '9px 8px', whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{job.items_total}</span>
          <span style={{ fontSize: 10, color: '#9CA3AF', marginLeft: 3 }}>files</span>
        </td>

        {/* Added */}
        <td style={{ padding: '9px 8px' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#059669', padding: '2px 7px', background: '#ECFDF5', borderRadius: 8 }}>
            {fmtK(job.items_completed)}
          </span>
        </td>

        {/* Skipped */}
        <td style={{ padding: '9px 8px' }}>
          {job.items_skipped > 0
            ? <span style={{ fontSize: 11, color: '#D97706' }}>{fmtK(job.items_skipped)}</span>
            : <span style={{ fontSize: 10, color: '#D1D5DB' }}>—</span>
          }
        </td>

        {/* Failed */}
        <td style={{ padding: '9px 8px' }}>
          {job.items_failed > 0
            ? <span style={{ fontSize: 11, fontWeight: 600, color: '#DC2626' }}>{fmtK(job.items_failed)}</span>
            : <span style={{ fontSize: 10, color: '#D1D5DB' }}>—</span>
          }
        </td>

        {/* Pending */}
        <td style={{ padding: '9px 8px' }}>
          {job.items_pending > 0
            ? <span style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10}/>{fmtK(job.items_pending)}</span>
            : <span style={{ fontSize: 10, color: '#D1D5DB' }}>—</span>
          }
        </td>

        {/* Progress bar */}
        <td style={{ padding: '9px 8px', minWidth: 100 }}>
          <div style={{ height: 4, borderRadius: 2, background: '#E5E7EB', overflow: 'hidden', marginBottom: 3 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: accentCol, borderRadius: 2, transition: 'width .5s ease' }}/>
          </div>
          <span style={{ fontSize: 9, color: '#9CA3AF' }}>{pct}%</span>
        </td>

        {/* Submitted at */}
        <td style={{ padding: '9px 8px', whiteSpace: 'nowrap' }}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span style={{ fontSize: 10, color: '#6B7280' }}>{moment(job.created_at).fromNow()}</span>
            </TooltipTrigger>
            <TooltipContent>{moment(job.created_at).format('DD MMM YYYY, HH:mm')}</TooltipContent>
          </Tooltip>
          {job.completed_at && (
            <div style={{ fontSize: 9, color: '#9CA3AF' }}>
              Done {moment(job.completed_at).format('HH:mm')}
            </div>
          )}
        </td>
      </tr>

      {/* Expanded child rows */}
      {expanded && (
        <tr>
          <td colSpan={isSuperAdmin ? 10 : 9} style={{ padding: 0, background: '#FAF9FF', borderBottom: '0.5px solid #EDE9FE' }}>
            {/* Indent bar */}
            <div style={{ borderLeft: '3px solid #7C3AED', marginLeft: 14 }}>
              {isSuperAdmin && job.openai_batch_id !== 'pending' && (
                <div style={{ padding: '6px 12px', borderBottom: '0.5px solid #EDE9FE', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Shield size={10} style={{ color: '#7C3AED' }}/>
                  <span style={{ fontSize: 9, color: '#5B21B6', fontFamily: 'monospace' }}>
                    OpenAI: {job.openai_batch_id}
                  </span>
                </div>
              )}
              <ChildItemsTable jobId={job.id} isActive={isActive} isSuperAdmin={isSuperAdmin}/>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════════
const JOBS_PER_PAGE = 15;

const BatchJobsPage: FC = () => {
  const { role, user } = useSelector((s: RootState) => s.auth);
  const organizationId = useSelector((s: any) => s.auth.organization_id);
  const isSuperAdmin   = role === 'organization_superadmin' || role === 'admin';

  const [statusFilter, setStatusFilter] = useState('all');
  const [userFilter,   setUserFilter]   = useState('all');
  const [jobsPage,     setJobsPage]     = useState(1);

  // ── Jobs query ─────────────────────────────────────────────────────────────
  const { data: jobs, isLoading, refetch, isFetching } = useQuery<BatchJob[]>({
    queryKey       : ['batchJobsPage', organizationId, isSuperAdmin, user?.id],
    queryFn        : async () => {
      let q = supabase.from('vw_talent_pool_batch_summary')
        .select('*').eq('organization_id', organizationId)
        .order('created_at', { ascending: false }).limit(500);
      if (!isSuperAdmin) q = q.eq('created_by', user!.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as BatchJob[];
    },
    enabled        : !!organizationId && !!user,
    refetchInterval: 30_000,
  });

  // ── Team members ───────────────────────────────────────────────────────────
  const { data: teamMembers } = useQuery({
    queryKey: ['teamMembersForBatch', organizationId],
    queryFn : async () => {
      const { data } = await supabase.from('hr_employees')
        .select('user_id,first_name,last_name').eq('organization_id', organizationId).not('user_id','is',null);
      return data ?? [];
    },
    enabled : !!organizationId && isSuperAdmin,
  });

  // ── Filter + paginate ──────────────────────────────────────────────────────
  const filtered = (jobs ?? []).filter(j => {
    if (statusFilter !== 'all' && j.status !== statusFilter) return false;
    if (userFilter   !== 'all' && j.created_by !== userFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / JOBS_PER_PAGE);
  const paged      = filtered.slice((jobsPage-1)*JOBS_PER_PAGE, jobsPage*JOBS_PER_PAGE);

  // Reset page when filter changes
  const handleStatusFilter = (v: string) => { setStatusFilter(v); setJobsPage(1); };
  const handleUserFilter   = (v: string) => { setUserFilter(v);   setJobsPage(1); };

  // ── Aggregate stats ────────────────────────────────────────────────────────
  const totalJobs     = jobs?.length ?? 0;
  const activeJobs    = jobs?.filter(j => j.status === 'processing' || j.status === 'pending').length ?? 0;
  const totalAdded    = jobs?.reduce((s, j) => s + j.items_completed, 0) ?? 0;
  const totalFiles    = jobs?.reduce((s, j) => s + j.items_total, 0) ?? 0;
  const totalFailed   = jobs?.reduce((s, j) => s + j.items_failed, 0) ?? 0;
  const successRate   = totalFiles > 0 ? Math.round((totalAdded / totalFiles) * 100) : 0;

  // ── Columns ────────────────────────────────────────────────────────────────
  const baseColumns = ['', 'Status', 'Files', 'Added', 'Skipped', 'Failed', 'Pending', 'Progress', 'Submitted'];
  const columns     = isSuperAdmin
    ? ['', 'Status', 'By', 'Files', 'Added', 'Skipped', 'Failed', 'Pending', 'Progress', 'Submitted']
    : baseColumns;

  return (
    <TooltipProvider delayDuration={80}>
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link to="/talent-pool" style={{
              width: 30, height: 30, borderRadius: 8, border: '0.5px solid #E5E7EB',
              background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#6B7280', textDecoration: 'none', flexShrink: 0,
            }}>
              <ChevronLeft size={14}/>
            </Link>
            <div>
              <h1 style={{ fontSize: 19, fontWeight: 700, color: '#111827', margin: 0 }}>Batch Upload Jobs</h1>
              <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                {isSuperAdmin ? 'All team batch uploads' : 'Your batch upload history'}
              </p>
            </div>
            {isSuperAdmin && (
              <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: '#EDE9FE', color: '#5B21B6', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                <Shield size={10}/> Admin View
              </span>
            )}
          </div>
          <button onClick={() => refetch()} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px',
            borderRadius: 8, border: '0.5px solid #E5E7EB', background: '#fff',
            fontSize: 11, fontWeight: 600, color: '#6B7280', cursor: 'pointer',
          }}>
            <RefreshCw size={12} style={{ animation: isFetching ? 'spin 1s linear infinite' : 'none' }}/>
            Refresh
          </button>
        </div>

        {/* ── STAT CARDS ─────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
          <StatCard label="Total Batches"    value={fmtK(totalJobs)}  icon={<UploadCloud size={13}/>} accent="#7C3AED" sub={`${activeJobs} active`}           isLoading={isLoading}/>
          <StatCard label="Files Submitted"  value={fmtK(totalFiles)} icon={<FileText size={13}/>}    accent="#2563EB" sub="across all batches"               isLoading={isLoading}/>
          <StatCard label="Candidates Added" value={fmtK(totalAdded)} icon={<Users size={13}/>}       accent="#059669" sub={`${successRate}% success rate`}   isLoading={isLoading}/>
          <StatCard label="Active Now"       value={activeJobs}       icon={<Zap size={13}/>}         accent="#D97706" sub="processing or queued"             isLoading={isLoading}/>
          {isSuperAdmin && (
            <StatCard label="Files Failed"   value={fmtK(totalFailed)} icon={<XCircle size={13}/>}   accent="#DC2626" sub="across all batches"               isLoading={isLoading}/>
          )}
        </div>

        {/* ── SUPERADMIN: Team summary table ─────────────────────────────── */}
        {isSuperAdmin && jobs && jobs.length > 0 && (
          <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 20, height: 20, borderRadius: 5, background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED' }}>
                <BarChart2 size={11}/>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>Team Upload Summary</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg,#6D28D9,#7C3AED)' }}>
                    {['Team Member','Batches','Files','Added','Skipped','Failed','Last Upload'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '.4px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(
                    (jobs ?? []).reduce((acc, j) => {
                      const k = j.created_by;
                      if (!acc[k]) acc[k] = { name: j.created_by_name ?? 'Unknown', batches:0, files:0, added:0, skipped:0, failed:0, last:j.created_at };
                      acc[k].batches++; acc[k].files += j.items_total; acc[k].added += j.items_completed;
                      acc[k].skipped += j.items_skipped; acc[k].failed += j.items_failed;
                      if (j.created_at > acc[k].last) acc[k].last = j.created_at;
                      return acc;
                    }, {} as Record<string, any>)
                  ).map(([uid, row], i) => (
                    <tr key={uid} style={{ borderTop: '0.5px solid #F3F4F6', background: i%2===0?'#fff':'#FAFAFA' }}>
                      <td style={{ padding: '8px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#A78BFA,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>
                            {row.name.charAt(0)}
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>{row.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '8px 12px', fontSize: 11, color: '#374151' }}>{row.batches}</td>
                      <td style={{ padding: '8px 12px', fontSize: 11, color: '#374151' }}>{fmtK(row.files)}</td>
                      <td style={{ padding: '8px 12px' }}><span style={{ fontSize: 11, fontWeight: 600, color: '#059669' }}>{fmtK(row.added)}</span></td>
                      <td style={{ padding: '8px 12px' }}><span style={{ fontSize: 11, color: '#D97706' }}>{fmtK(row.skipped)}</span></td>
                      <td style={{ padding: '8px 12px' }}><span style={{ fontSize: 11, color: row.failed>0?'#DC2626':'#9CA3AF' }}>{fmtK(row.failed)}</span></td>
                      <td style={{ padding: '8px 12px', fontSize: 10, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{moment(row.last).fromNow()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── FILTER BAR ─────────────────────────────────────────────────── */}
        <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 12, padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <BarChart2 size={13} style={{ color: '#9CA3AF' }}/>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280' }}>Filter</span>

          <Select value={statusFilter} onValueChange={handleStatusFilter}>
            <SelectTrigger style={{ height: 30, fontSize: 11, borderRadius: 7, minWidth: 110, border: statusFilter!=='all'?'0.5px solid #7C3AED':'0.5px solid #D1D5DB', background: statusFilter!=='all'?'#EDE9FE':'#F9FAFB', color: statusFilter!=='all'?'#5B21B6':'#6B7280' }}>
              <SelectValue placeholder="All Status"/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="pending">Queued</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          {isSuperAdmin && (
            <Select value={userFilter} onValueChange={handleUserFilter}>
              <SelectTrigger style={{ height: 30, fontSize: 11, borderRadius: 7, minWidth: 120, border: userFilter!=='all'?'0.5px solid #7C3AED':'0.5px solid #D1D5DB', background: userFilter!=='all'?'#EDE9FE':'#F9FAFB', color: userFilter!=='all'?'#5B21B6':'#6B7280' }}>
                <SelectValue placeholder="All Users"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {teamMembers?.map((m: any) => (
                  <SelectItem key={m.user_id} value={m.user_id}>{m.first_name} {m.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {(statusFilter !== 'all' || userFilter !== 'all') && (
            <button onClick={() => { setStatusFilter('all'); setUserFilter('all'); setJobsPage(1); }} style={{ height: 30, padding: '0 11px', borderRadius: 8, background: '#FEE2E2', border: '0.5px solid #FECACA', color: '#DC2626', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <XCircle size={11}/> Clear
            </button>
          )}

          <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 'auto' }}>
            {filtered.length} job{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── MAIN JOBS TABLE ─────────────────────────────────────────────── */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 7 }}>
            Batch Jobs ({filtered.length})
          </div>

          {isLoading ? (
            <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '0.5px solid #F3F4F6' }}>
                  <Skeleton className="h-4 w-4"/><Skeleton className="h-5 w-20"/><Skeleton className="h-4 w-10"/>
                  <Skeleton className="h-4 w-8"/><Skeleton className="h-4 w-8"/><Skeleton className="h-4 w-8"/>
                  <div style={{ flex:1 }}><Skeleton className="h-3 w-full"/></div>
                  <Skeleton className="h-4 w-16"/>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #E5E7EB', padding: 48, textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <UploadCloud size={32} style={{ color: '#D1D5DB', margin: '0 auto 10px' }}/>
              <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>No batch jobs found.</p>
              <p style={{ fontSize: 11, color: '#D1D5DB', margin: '4px 0 0' }}>
                Upload multiple resumes from the Talent Pool page to get started.
              </p>
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 12, border: '0.5px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg,#6D28D9,#7C3AED)' }}>
                      {columns.map(h => (
                        <th key={h} style={{ padding: h===''?'9px 8px 9px 14px':'9px 8px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '.5px', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((job, idx) => (
                      <JobTableRow key={job.id} job={job} idx={idx} isSuperAdmin={isSuperAdmin}/>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── PARENT PAGINATION ── */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderTop: '0.5px solid #F3F4F6', flexWrap: 'wrap', gap: 8, background: '#FAFAFA' }}>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                  {((jobsPage-1)*JOBS_PER_PAGE+1)}–{Math.min(jobsPage*JOBS_PER_PAGE, filtered.length)} of {filtered.length} batches
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0"
                    onClick={() => setJobsPage(p => Math.max(p-1,1))} disabled={jobsPage===1}>
                    <ChevronLeft className="h-3 w-3"/>
                  </Button>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#374151', minWidth: 80, textAlign: 'center' }}>
                    Page {jobsPage} / {totalPages}
                  </span>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0"
                    onClick={() => setJobsPage(p => Math.min(p+1,totalPages))} disabled={jobsPage===totalPages}>
                    <ChevronRight className="h-3 w-3"/>
                  </Button>
                </div>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                  {JOBS_PER_PAGE} per page
                </span>
              </div>
            </div>
          )}
        </div>

      </div>

      <style>{`
        @keyframes spin  { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
      `}</style>
    </TooltipProvider>
  );
};

export default BatchJobsPage;