// src/components/candidates/talent-pool/BatchJobsPanel.tsx
// Mini panel on TalentPoolPage — shows live active jobs + "View All" button
// that links to BatchJobsPage with completed/pending counts on the button

import { FC, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronDown, ChevronRight, CheckCircle, XCircle, AlertCircle,
  Loader2, Clock, FileText, RefreshCw, UploadCloud, ExternalLink,
} from 'lucide-react';
import moment from 'moment';

// ─── Types ────────────────────────────────────────────────────────────────────
interface BatchJob {
  id              : string;
  status          : string;
  total_files     : number;
  created_by      : string;
  created_by_name : string | null;
  items_completed : number;
  items_failed    : number;
  items_skipped   : number;
  items_pending   : number;
  items_total     : number;
  created_at      : string;
  completed_at    : string | null;
}
interface RootState { auth: { role: string; user: { id: string } | null } }

const statusColor = (s: string) => ({ processing:'#2563EB', pending:'#D97706', completed:'#059669', failed:'#DC2626' }[s] ?? '#6B7280');
const statusLabel = (s: string) => ({ processing:'Processing', pending:'Queued', completed:'Completed', failed:'Failed' }[s] ?? s);
const fmtK = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1).replace(/\.0$/,'')}K` : String(n);

// ─── Mini job row ──────────────────────────────────────────────────────────────
const MiniJobRow: FC<{ job: BatchJob }> = ({ job }) => {
  const isActive  = job.status === 'processing' || job.status === 'pending';
  const done      = job.items_completed + job.items_failed + job.items_skipped;
  const pct       = job.items_total > 0 ? Math.round((done / job.items_total) * 100) : 0;
  const accentCol = statusColor(job.status);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 10px', borderRadius: 8,
      border: `0.5px solid ${isActive ? accentCol + '40' : '#F3F4F6'}`,
      background: isActive ? `${accentCol}06` : '#FAFAFA',
    }}>
      {/* Status indicator */}
      <span style={{ position: 'relative', display: 'inline-flex', width: 8, height: 8, flexShrink: 0 }}>
        {isActive && (
          <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: accentCol, opacity: 0.35, animation: 'ping 1.4s cubic-bezier(0,0,.2,1) infinite' }}/>
        )}
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: accentCol, display: 'block' }}/>
      </span>

      {/* Label */}
      <span style={{ fontSize: 11, fontWeight: 600, color: accentCol, flexShrink: 0 }}>
        {statusLabel(job.status)}
      </span>

      {/* File count */}
      <span style={{ fontSize: 11, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {job.items_total} file{job.items_total !== 1 ? 's' : ''}
        {job.created_by_name ? ` · ${job.created_by_name}` : ''}
      </span>

      {/* Counts */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
        {job.items_completed > 0 && (
          <span style={{ fontSize: 10, color: '#059669', display: 'flex', alignItems: 'center', gap: 2 }}>
            <CheckCircle size={9}/>{fmtK(job.items_completed)}
          </span>
        )}
        {job.items_failed > 0 && (
          <span style={{ fontSize: 10, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 2 }}>
            <XCircle size={9}/>{fmtK(job.items_failed)}
          </span>
        )}
        {job.items_pending > 0 && (
          <span style={{ fontSize: 10, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Clock size={9}/>{fmtK(job.items_pending)}
          </span>
        )}
      </div>

      {/* Progress */}
      <div style={{ width: 70, flexShrink: 0 }}>
        <div style={{ height: 4, borderRadius: 2, background: '#E5E7EB', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: accentCol, borderRadius: 2, transition: 'width .4s ease' }}/>
        </div>
        <div style={{ fontSize: 9, color: '#9CA3AF', marginTop: 2, textAlign: 'right' }}>
          {pct}% · {moment(job.created_at).fromNow()}
        </div>
      </div>
    </div>
  );
};

// ─── Main Panel ────────────────────────────────────────────────────────────────
const BatchJobsPanel: FC<{ organizationId: string }> = ({ organizationId }) => {
  const { role, user } = useSelector((s: RootState) => s.auth);
  const isSuperAdmin   = role === 'organization_superadmin' || role === 'admin';
  const navigate       = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const { data: jobs, isLoading, refetch, isFetching } = useQuery<BatchJob[]>({
    queryKey       : ['batchJobsPanel', organizationId, isSuperAdmin, user?.id],
    queryFn        : async () => {
      let q = supabase.from('vw_talent_pool_batch_summary')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (!isSuperAdmin) q = q.eq('created_by', user!.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as BatchJob[];
    },
    enabled        : !!organizationId && !!user,
    refetchInterval: 30_000,
  });

  // Only show active + last 3 completed in mini panel
  const activeJobs    = (jobs ?? []).filter(j => j.status === 'processing' || j.status === 'pending');
  const recentDone    = (jobs ?? []).filter(j => j.status === 'completed' || j.status === 'failed').slice(0, 3);
  const shownJobs     = [...activeJobs, ...recentDone];
  const hasActive     = activeJobs.length > 0;

  // Counts for the "View All" button badge
  const totalCompleted = (jobs ?? []).reduce((s, j) => s + j.items_completed, 0);
  const totalPending   = (jobs ?? []).reduce((s, j) => s + j.items_pending, 0);
  const totalJobs      = jobs?.length ?? 0;

  // Hide panel entirely if no batch jobs exist at all
  if (!isLoading && totalJobs === 0) return null;

  return (
    <div style={{
      background   : '#fff',
      border       : `0.5px solid ${hasActive ? '#C4B5FD' : '#E5E7EB'}`,
      borderRadius : 12,
      boxShadow    : hasActive ? '0 0 0 2px rgba(124,58,237,0.08)' : '0 1px 4px rgba(0,0,0,0.05)',
      overflow     : 'hidden',
      transition   : 'border-color .2s, box-shadow .2s',
    }}>
      {/* ── Panel header ── */}
      <div style={{
        display        : 'flex',
        alignItems     : 'center',
        gap            : 8,
        padding        : '10px 14px',
        background     : hasActive ? 'linear-gradient(135deg,rgba(124,58,237,0.04),transparent)' : 'transparent',
        borderBottom   : collapsed ? 'none' : '0.5px solid #F3F4F6',
      }}>
        {/* Icon */}
        <div style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0,
          background: hasActive ? '#EDE9FE' : '#F3F4F6',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: hasActive ? '#7C3AED' : '#9CA3AF',
        }}>
          {hasActive
            ? <Loader2 size={12} style={{ animation: 'spin 1.5s linear infinite' }}/>
            : <FileText size={12}/>
          }
        </div>

        {/* Title */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>Batch Jobs</span>
          {hasActive && (
            <span style={{
              fontSize: 9, padding: '1px 6px', borderRadius: 8,
              background: '#EDE9FE', color: '#7C3AED', fontWeight: 600,
            }}>
              {activeJobs.length} active
            </span>
          )}
        </div>

        {/* VIEW ALL button with counts */}
        <button
          onClick={() => navigate('/talent-pool/batch-jobs')}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 7, border: '0.5px solid #E5E7EB',
            background: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 600,
            color: '#6D28D9',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F5F3FF'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff'; }}
        >
          <ExternalLink size={10}/>
          View All
          {/* Counts badge */}
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 2 }}>
            {totalCompleted > 0 && (
              <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 6, background: '#ECFDF5', color: '#059669', fontWeight: 700 }}>
                {fmtK(totalCompleted)} ✓
              </span>
            )}
            {totalPending > 0 && (
              <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 6, background: '#FEF3C7', color: '#D97706', fontWeight: 700 }}>
                {fmtK(totalPending)} pending
              </span>
            )}
          </span>
        </button>

        {/* Refresh */}
        <button
          onClick={e => { e.stopPropagation(); refetch(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#9CA3AF', display: 'flex', borderRadius: 4 }}
        >
          <RefreshCw size={11} style={{ animation: isFetching ? 'spin 1s linear infinite' : 'none' }}/>
        </button>

        {/* Collapse */}
        <button
          onClick={() => setCollapsed(c => !c)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#9CA3AF', display: 'flex' }}
        >
          {collapsed ? <ChevronRight size={13}/> : <ChevronDown size={13}/>}
        </button>
      </div>

      {/* ── Job list ── */}
      {!collapsed && (
        <div style={{ padding: '8px 12px 10px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          {isLoading ? (
            [1,2].map(i => <Skeleton key={i} className="h-9 w-full rounded-lg"/>)
          ) : shownJobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 11, color: '#9CA3AF' }}>
              No recent jobs
            </div>
          ) : (
            shownJobs.map(job => <MiniJobRow key={job.id} job={job}/>)
          )}

          {/* Link to see more */}
          {totalJobs > shownJobs.length && (
            <button
              onClick={() => navigate('/talent-pool/batch-jobs')}
              style={{
                marginTop: 2, fontSize: 10, color: '#7C3AED', background: 'none',
                border: 'none', cursor: 'pointer', padding: 0, textAlign: 'center',
              }}
            >
              +{totalJobs - shownJobs.length} more jobs → View all
            </button>
          )}
        </div>
      )}

      <style>{`
        @keyframes ping { 75%, 100% { transform: scale(2); opacity: 0; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default BatchJobsPanel;