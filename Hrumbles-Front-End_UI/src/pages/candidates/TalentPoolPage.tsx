import { useState, useEffect, useRef, FC, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import moment from 'moment';
import { useDebounce } from 'use-debounce';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users, UserPlus, Search, History, Calendar, ChevronLeft, ChevronRight,
  Briefcase, ScanSearch, Mail, Sparkles, Bookmark, Filter,
  MessageSquare, Send, X, CheckSquare, TrendingUp, MapPin, DollarSign,
  Layers, BarChart2, Download, FileText, FileX, ChevronDown, Phone,
  Eye, MoreHorizontal, ExternalLink,
} from 'lucide-react';

import AddCandidateModal           from '@/components/candidates/talent-pool/AddCandidateModal';
import CompareWithJobDialog        from '@/components/candidates/talent-pool/CompareWithJobDialog';
import AnalysisHistoryDialog       from '@/components/candidates/AnalysisHistoryDialog';
import EnrichDataDialog            from '@/components/candidates/talent-pool/EnrichDataDialog';
import CircularProgress            from '@/components/jobs/ui/CircularProgress';
import JobMatchModal               from '@/components/candidates/talent-pool/JobMatchModal';
import WishlistModal               from '@/components/candidates/talent-pool/WishlistModal';
import { CandidateActivityButton } from '@/components/candidates/activity/CandidateActivityButton';
import InviteCandidateModal        from '@/components/jobs/job/invite/InviteCandidateModal';
import BulkInviteReviewModal, { BulkInviteCandidate } from '@/components/jobs/job/invite/BulkInviteReviewModal';
import V2WhatsAppFloat             from '@/components/MagicLinkView/candidate-profile-v2/components/V2WhatsAppFloat';
import BatchJobsPanel from '@/components/candidates/talent-pool/BatchJobsPanel';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface TalentPoolCandidate {
  id: string; candidate_name: string; email: string; phone: string;
  suggested_title: string; created_at: string;
  created_by: { first_name: string; last_name: string } | null;
  matching_skill_count?: number; matching_skills?: string[];
  total_candidate_count?: number; [key: string]: any;
}
interface Job {
  id: string; title: string; skills: string[]; primary_skills?: string[];
  description: string; experience: string | Record<string, any>;
  location: string[]; department?: string; budget?: string; budgetType?: string;
}
interface RootState { auth: { role: string; user: { id: string; organization_id: string } | null }; }

// ─── Helpers ─────────────────────────────────────────────────────────────────
const calcProfile = (c: TalentPoolCandidate) => {
  const fields = ['phone','total_experience','current_company','current_designation','notice_period','current_location','highest_education','work_experience'];
  let filled = 0; const missing: string[] = [];
  fields.forEach(k => {
    const v = c[k];
    (Array.isArray(v) ? v.length > 0 : !!v && String(v).trim() !== '') ? filled++ : missing.push(k.replace(/_/g,' '));
  });
  return { percentage: Math.round((filled / fields.length) * 100), missingFields: missing };
};
const fmtK  = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K` : String(n);
const fmtL  = (v: number | null) => { if (!v) return '—'; return v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : `₹${(v / 1000).toFixed(0)}K`; };
const parseSk = (raw: any): string[] => { try { return (typeof raw === 'string' ? JSON.parse(raw) : raw || []).filter(Boolean); } catch { return []; } };
const agg = (raw: any[], keys: string[]) => {
  const counts: Record<string, number> = {};
  raw?.forEach(r => { const v = (keys.map(k => r[k]).find(x => x) || '').trim(); if (v && v.length > 1 && v.length < 50 && v !== 'Other') counts[v] = (counts[v] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([label, count]) => ({ label, count }));
};

// ─── Sparkline SVG ───────────────────────────────────────────────────────────
const Sparkline: FC<{ data: number[]; color: string }> = ({ data, color }) => {
  if (data.length < 2) return null;
  const w = 72; const h = 26; const max = Math.max(...data, 1);
  const pts = data.map((v, i) => `${Math.round((i / (data.length - 1)) * w)},${Math.round(h - (v / max) * (h - 4) - 2)}`).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block', flexShrink: 0 }}>
      <defs><linearGradient id={`sp${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.3" /><stop offset="100%" stopColor={color} stopOpacity="0.03" /></linearGradient></defs>
      <path d={`M0,${h} L${pts.split(' ').join(' L')} L${w},${h} Z`} fill={`url(#sp${color.slice(1)})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ─── Horizontal progress bar ──────────────────────────────────────────────────
const HBar: FC<{ pct: number; color: string }> = ({ pct, color }) => (
  <div style={{ height: 4, borderRadius: 2, background: '#F3F4F6', flex: 1, overflow: 'hidden', minWidth: 30 }}>
    <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 2, transition: 'width .5s ease' }} />
  </div>
);

// ─── SVG Mini bar chart ───────────────────────────────────────────────────────
const BarMini: FC<{ items: { label: string; count: number }[]; color: string }> = ({ items, color }) => {
  const shown = items.slice(0, 6);
  const max = Math.max(...shown.map(i => i.count), 1);
  const W = 100; const H = 36; const bw = Math.floor(W / shown.length) - 2;
  return (
    <svg width="100%" height={H + 14} viewBox={`0 0 ${W} ${H + 14}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {shown.map((item, i) => {
        const bh = Math.max(Math.round((item.count / max) * H), 2);
        const x = i * (W / shown.length) + 1;
        return (
          <g key={i}>
            <rect x={x} y={H - bh} width={bw} height={bh} rx="2" fill={color} fillOpacity="0.75" />
            <text x={x + bw / 2} y={H + 11} textAnchor="middle" fontSize="5.5" fill="#9CA3AF">{item.label.slice(0, 7)}</text>
          </g>
        );
      })}
    </svg>
  );
};

// ─── Card wrapper with hover shadow ──────────────────────────────────────────
const Panel: FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: '#FFFFFF', border: '0.5px solid #E5E7EB', borderRadius: 12, padding: '12px 14px',
        boxShadow: hov ? '0 6px 20px rgba(0,0,0,0.10)' : '0 1px 4px rgba(0,0,0,0.06)',
        transition: 'box-shadow .2s, transform .2s',
        transform: hov ? 'translateY(-1px)' : 'none',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ─── Dual-metric stat card ────────────────────────────────────────────────────
const StatDualCard: FC<{
  title: string; icon: React.ReactNode; accent: string; isLoading?: boolean;
  top: { label: string; value: React.ReactNode }; bottom: { label: string; value: React.ReactNode };
  spark?: number[];
}> = ({ title, icon, accent, top, bottom, spark, isLoading }) => (
  <Panel>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>{icon}</div>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280' }}>{title}</span>
      </div>
      {spark && <Sparkline data={spark} color={accent} />}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {[top, bottom].map((m, i) => (
        <div key={i} style={{ background: '#F9FAFB', borderRadius: 8, padding: '8px 10px', border: '0.5px solid #F3F4F6' }}>
          <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 3 }}>{m.label}</div>
          {isLoading ? <Skeleton className="h-5 w-14 mt-1" /> : <div style={{ fontSize: 19, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{m.value}</div>}
        </div>
      ))}
    </div>
  </Panel>
);

// ─── Insight panel — fixed height, scrollable list ───────────────────────────
const InsightPanel: FC<{
  title: string; icon: React.ReactNode; accent: string; isLoading: boolean;
  items: { label: string; count: number }[]; total: number;
}> = ({ title, icon, accent, isLoading, items, total }) => {
  const max = items[0]?.count || 1;
  return (
    <Panel style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent }}>{icon}</div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{title}</span>
        </div>
        {total > 0 && <span style={{ fontSize: 9, color: '#9CA3AF', background: '#F3F4F6', padding: '2px 7px', borderRadius: 8 }}>{fmtK(total)}</span>}
      </div>
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>{[1,2,3].map(i => <Skeleton key={i} className="h-4 w-full" />)}</div>
      ) : items.length === 0 ? (
        <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', padding: '8px 0', margin: 0 }}>No data yet</p>
      ) : (
        <>
          {/* mini bar chart */}
          <div style={{ height: 50, flexShrink: 0 }}><BarMini items={items} color={accent} /></div>
          {/* fixed-height scrollable ranked list */}
          <div style={{ height: 130, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5, paddingRight: 2 }}>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: accent, width: 11, textAlign: 'right', flexShrink: 0, opacity: 0.6 }}>{i + 1}</span>
                <Tooltip><TooltipTrigger asChild>
                  <span style={{ fontSize: 10, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'default' }}>{item.label}</span>
                </TooltipTrigger><TooltipContent>{item.label} — {fmtK(item.count)}</TooltipContent></Tooltip>
                <HBar pct={(item.count / max) * 100} color={accent} />
                <span style={{ fontSize: 9, color: '#9CA3AF', width: 28, textAlign: 'right', flexShrink: 0 }}>{fmtK(item.count)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
};

// ─── CTC Funnel Chart ─────────────────────────────────────────────────────────
const CtcFunnelPanel: FC<{ buckets: { label: string; count: number }[]; isLoading: boolean }> = ({ buckets, isLoading }) => {
  const max = Math.max(...buckets.map(b => b.count), 1);
  const COLS = ['#A78BFA','#7C3AED','#6D28D9','#1D9E75','#059669','#D97706','#D85A30'];
  return (
    <Panel style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: '#1D9E7518', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1D9E75' }}><DollarSign size={12} /></div>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>CTC Distribution</span>
      </div>
      {isLoading ? <Skeleton className="h-32 w-full" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {buckets.map((b, i) => {
            const pct = Math.max(Math.round((b.count / max) * 100), b.count > 0 ? 8 : 0);
            const leftPad = Math.round((100 - pct) / 2);
            return (
              <Tooltip key={i}><TooltipTrigger asChild>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'default' }}>
                  <span style={{ fontSize: 9, color: '#6B7280', width: 34, textAlign: 'right', flexShrink: 0 }}>{b.label}</span>
                  <div style={{ flex: 1, height: 16, display: 'flex', alignItems: 'center' }}>
                    <div style={{ width: `${leftPad}%` }} />
                    <div style={{ width: `${pct}%`, height: '100%', background: COLS[i % COLS.length], borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: b.count > 0 ? 20 : 0 }}>
                      {b.count > 0 && <span style={{ fontSize: 8, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtK(b.count)}</span>}
                    </div>
                  </div>
                </div>
              </TooltipTrigger><TooltipContent>{b.label}: {fmtK(b.count)} candidates</TooltipContent></Tooltip>
            );
          })}
        </div>
      )}
    </Panel>
  );
};

// ─── Experience donut ─────────────────────────────────────────────────────────
const ExpPanel: FC<{ data: { label: string; count: number; color: string }[]; total: number; isLoading: boolean }> = ({ data, total, isLoading }) => {
  const r = 26; const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <Panel style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: '#7C3AED18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED' }}><Users size={12} /></div>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>Experience Mix</span>
      </div>
      {isLoading ? <Skeleton className="h-20 w-full" /> : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="64" height="64" style={{ flexShrink: 0 }}>
            <circle cx="32" cy="32" r={r} fill="none" stroke="#F3F4F6" strokeWidth="7" />
            {data.map((d, i) => {
              const pct = total > 0 ? d.count / total : 0;
              const dash = circ * pct; const gap = circ - dash;
              const el = <circle key={i} cx="32" cy="32" r={r} fill="none" stroke={d.color} strokeWidth="7" strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-offset + circ / 4} />;
              offset += dash; return el;
            })}
            <text x="32" y="29" textAnchor="middle" fontSize="10" fontWeight="700" fill="#111827">{fmtK(total)}</text>
            <text x="32" y="40" textAnchor="middle" fontSize="6.5" fill="#9CA3AF">total</text>
          </svg>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
            {data.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
                <span style={{ fontSize: 9, color: '#9CA3AF', flexShrink: 0 }}>{total > 0 ? Math.round(d.count / total * 100) : 0}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
};

// ─── Multi-axis Talent Overview Chart ─────────────────────────────────────────
// ─── Talent Overview Chart using Chart.js ────────────────────────────────────
const TalentOverviewChart: FC<{
  expBuckets: { label: string; count: number; color: string }[];
  ctcBuckets: { label: string; count: number }[];
  monthlyTrend: number[];
  isLoading: boolean;
}> = ({ expBuckets, ctcBuckets, monthlyTrend, isLoading }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInst = useRef<any>(null);

  // Build month labels like "Nov 25", "Dec 25", etc.
  const monthLabels = useMemo(() => {
    return monthlyTrend.map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (monthlyTrend.length - 1 - i));
      return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
    });
  }, [monthlyTrend.length]);

  useEffect(() => {
    if (isLoading || !chartRef.current) return;
    // Dynamically load Chart.js from CDN
    const scriptId = 'chartjs-cdn';
    const load = () => {
      if (chartInst.current) { try { chartInst.current.destroy(); } catch {} }
      const W = (window as any).Chart;
      if (!W) return;

      const expLabels = expBuckets.map(b => b.label);
      const expCounts = expBuckets.map(b => b.count);
      const ctcLabels = ctcBuckets.map(b => b.label);
      const ctcCounts = ctcBuckets.map(b => b.count);

      // 3 datasets on combined x-axis: monthly (line), exp (bar y1), ctc (bar y2)
      // Use 3 separate charts side by side for clarity
      const ctx = chartRef.current!.getContext('2d');
      chartInst.current = new W(ctx, {
        type: 'bar',
        data: {
          labels: monthLabels,
          datasets: [
            {
              label: 'Added / month',
              data: monthlyTrend,
              type: 'line',
              yAxisID: 'y',
              borderColor: '#7C3AED',
              backgroundColor: 'rgba(124,58,237,0.1)',
              borderWidth: 2.5,
              pointBackgroundColor: '#7C3AED',
              pointRadius: 4,
              pointHoverRadius: 6,
              fill: true,
              tension: 0.35,
              order: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index' as const, intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(17,24,39,0.9)',
              titleColor: '#F9FAFB',
              bodyColor: '#D1D5DB',
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (ctx: any) => ` ${ctx.dataset.label}: ${fmtK(ctx.parsed.y)}`,
              },
            },
          },
          scales: {
            x: {
              grid: { color: 'rgba(243,244,246,0.8)', lineWidth: 0.5 },
              ticks: { color: '#9CA3AF', font: { size: 10 } },
              border: { dash: [4, 4] },
            },
            y: {
              position: 'left' as const,
              grid: { color: 'rgba(243,244,246,0.8)', lineWidth: 0.5 },
              ticks: { color: '#7C3AED', font: { size: 10 }, callback: (v: any) => fmtK(Number(v)) },
              border: { dash: [4, 4], color: 'rgba(124,58,237,0.3)' },
              title: { display: true, text: 'Monthly adds', color: '#7C3AED', font: { size: 10 } },
            },
          },
        },
      });
    };

    if (document.getElementById(scriptId)) { load(); return; }
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
    script.onload = load;
    document.head.appendChild(script);
    return () => { if (chartInst.current) { try { chartInst.current.destroy(); } catch {} } };
  }, [isLoading, monthlyTrend, expBuckets, ctcBuckets, monthLabels]);

  // Separate inline SVG bars for exp + ctc (simpler, no scaling issues)
  const maxExp = Math.max(...expBuckets.map(b => b.count), 1);
  const maxCTC = Math.max(...ctcBuckets.map(b => b.count), 1);
  const EXP_COLS = ['#7C3AED','#2563EB','#1D9E75','#D97706','#D85A30'];
  const CTC_COLS = ['#A78BFA','#7C3AED','#6D28D9','#1D9E75','#059669','#D97706','#D85A30'];

  return (
    <Panel style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: '#7C3AED18', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED' }}><BarChart2 size={12} /></div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>Talent Pool Overview</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {[{col:'#7C3AED',label:'Monthly additions'},{col:'#1D9E75',label:'Experience levels'},{col:'#D97706',label:'CTC ranges'}].map(l=>(
            <div key={l.label} style={{ display:'flex', alignItems:'center', gap:4 }}>
              <div style={{ width:10, height:4, borderRadius:2, background:l.col }} />
              <span style={{ fontSize:10, color:'#6B7280' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {isLoading ? <Skeleton className="h-48 w-full" /> : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 16, alignItems: 'end' }}>

          {/* Monthly trend line chart */}
          <div>
            <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 6, fontWeight: 500 }}>Monthly additions trend</div>
            <div style={{ position: 'relative', height: 160 }}>
              <canvas ref={chartRef} />
            </div>
          </div>

          {/* Experience distribution bars */}
          <div style={{ width: 140, flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 6, fontWeight: 500 }}>By experience</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {expBuckets.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 9, color: '#6B7280', width: 42, textAlign: 'right', flexShrink: 0 }}>{b.label}</span>
                  <div style={{ flex: 1, height: 14, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${Math.max(b.count > 0 ? (b.count / maxExp) * 100 : 0, b.count > 0 ? 5 : 0)}%`,
                      background: EXP_COLS[i % EXP_COLS.length], borderRadius: 3, transition: 'width .5s',
                      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 3
                    }}>
                      {b.count > 0 && <span style={{ fontSize: 8, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtK(b.count)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTC distribution bars */}
          <div style={{ width: 140, flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 6, fontWeight: 500 }}>By CTC (INR)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {ctcBuckets.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 9, color: '#6B7280', width: 36, textAlign: 'right', flexShrink: 0 }}>{b.label}</span>
                  <div style={{ flex: 1, height: 14, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${Math.max(b.count > 0 ? (b.count / maxCTC) * 100 : 0, b.count > 0 ? 5 : 0)}%`,
                      background: CTC_COLS[i % CTC_COLS.length], borderRadius: 3, transition: 'width .5s',
                      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 3
                    }}>
                      {b.count > 0 && <span style={{ fontSize: 8, color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtK(b.count)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
};

// ─── Search-suggest dropdown ──────────────────────────────────────────────────
// Multi-select suggest dropdown with free-text fallback
const MultiSuggestDrop: FC<{
  placeholder: string;
  values: string[];
  onChange: (vals: string[]) => void;
  options: string[];
  icon?: React.ReactNode;
  isLoading?: boolean;
}> = ({ placeholder, values, onChange, options, icon, isLoading }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => {
    const lq = q.toLowerCase();
    const all = options.filter(o => o.toLowerCase().includes(lq)).slice(0, 30);
    // if typed text not in options, offer it as free-text entry
    if (q.trim() && !options.find(o => o.toLowerCase() === lq)) {
      all.unshift(`Use: "${q.trim()}"`);
    }
    return all;
  }, [options, q]);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);
  const toggle = (opt: string) => {
    const actual = opt.startsWith('Use: "') ? opt.slice(6, -1) : opt;
    const next = values.includes(actual) ? values.filter(v => v !== actual) : [...values, actual];
    onChange(next);
    setQ('');
  };
  const active = values.length > 0;
  const label = active ? (values.length === 1 ? values[0].slice(0,14) : `${values[0].slice(0,10)}…+${values.length-1}`) : placeholder;
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 9px', height: 30, borderRadius: 7, border: `0.5px solid ${active ? '#7C3AED' : '#D1D5DB'}`, background: active ? '#EDE9FE' : '#F9FAFB', cursor: 'pointer', minWidth: 88, maxWidth: 160 }}>
        {icon && <span style={{ color: active ? '#7C3AED' : '#9CA3AF', flexShrink: 0, display: 'flex' }}>{icon}</span>}
        <span style={{ fontSize: 11, color: active ? '#5B21B6' : '#6B7280', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        {active
          ? <button onClick={e => { e.stopPropagation(); onChange([]); setQ(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#7C3AED', display: 'flex', flexShrink: 0 }}><X size={10} /></button>
          : <ChevronDown size={10} style={{ color: '#9CA3AF', flexShrink: 0 }} />}
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 300, marginTop: 3, width: 230, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 9, boxShadow: '0 8px 24px rgba(0,0,0,0.14)', overflow: 'hidden' }}>
          <div style={{ padding: '7px 9px', borderBottom: '0.5px solid #F3F4F6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F9FAFB', borderRadius: 6, padding: '4px 7px' }}>
              <Search size={11} style={{ color: '#9CA3AF', flexShrink: 0 }} />
              <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search or type to add..."
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 11, color: '#111827', width: '100%' }}
                onKeyDown={e => { if (e.key === 'Enter' && q.trim()) { toggle(`Use: "${q.trim()}"`); } }} />
            </div>
          </div>
          {values.length > 0 && (
            <div style={{ padding: '6px 9px', borderBottom: '0.5px solid #F3F4F6', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {values.map(v => (
                <span key={v} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 8, background: '#EDE9FE', color: '#5B21B6', display: 'flex', alignItems: 'center', gap: 3 }}>
                  {v.length > 16 ? v.slice(0,14)+'...' : v}
                  <span onClick={() => toggle(v)} style={{ cursor: 'pointer', lineHeight: 1 }}>×</span>
                </span>
              ))}
            </div>
          )}
          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            {isLoading ? <div style={{ padding: '9px 11px', fontSize: 11, color: '#9CA3AF' }}>Loading...</div>
              : filtered.length === 0 ? <div style={{ padding: '9px 11px', fontSize: 11, color: '#9CA3AF' }}>No matches</div>
              : filtered.map(opt => {
                  const actual = opt.startsWith('Use: "') ? opt.slice(6, -1) : opt;
                  const sel = values.includes(actual);
                  const freeText = opt.startsWith('Use: "');
                  return (
                    <div key={opt} onClick={() => toggle(opt)}
                      style={{ padding: '7px 11px', fontSize: 11, color: freeText ? '#7C3AED' : '#374151', cursor: 'pointer', background: sel ? '#EDE9FE' : 'transparent', display: 'flex', alignItems: 'center', gap: 7 }}
                      onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = '#F9FAFB'; }}
                      onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}>
                      <div style={{ width: 13, height: 13, borderRadius: 3, border: `1.5px solid ${sel ? '#7C3AED' : '#D1D5DB'}`, background: sel ? '#7C3AED' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {sel && <span style={{ fontSize: 9, color: '#fff', lineHeight: 1 }}>✓</span>}
                      </div>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: freeText ? 'italic' : 'normal' }}>{opt}</span>
                    </div>
                  );
                })
            }
          </div>
          {filtered.length > 0 && (
            <div style={{ padding: '5px 9px', borderTop: '0.5px solid #F3F4F6', fontSize: 10, color: '#9CA3AF' }}>
              {values.length} selected · Click to toggle · Enter to add typed text
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Job Picker Modal (original, unchanged) ───────────────────────────────────
const JobPickerModal: FC<{ isOpen: boolean; onClose: () => void; onSelect: (j: Job) => void; organizationId: string; title?: string }> =
  ({ isOpen, onClose, onSelect, organizationId, title = 'Select a job to invite for' }) => {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 300);
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobsForInvite', organizationId, debouncedSearch],
    queryFn: async () => {
      if (!organizationId) return [];
      let q = supabase.from('hr_jobs').select('id,title,skills,primary_skills,description,experience,location,department,budget,budgetType:budget_type').eq('organization_id', organizationId).order('created_at', { ascending: false });
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
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 2001, width: 'min(480px,calc(100vw - 32px))', maxHeight: '70vh', background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'linear-gradient(135deg,#7C3AED,#9B59F5)' }}>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#fff' }}>{title}</p>
            <p style={{ margin: '2px 0 0', fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>Choose a position to link with this invite</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, padding: 5, cursor: 'pointer', display: 'flex' }}><X size={14} color="#fff" /></button>
        </div>
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #F3F4F6', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs…" style={{ width: '100%', paddingLeft: 28, paddingRight: 10, paddingTop: 7, paddingBottom: 7, borderRadius: 7, border: '1px solid #E5E7EB', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? <div style={{ padding: 20, textAlign: 'center', color: '#9CA3AF', fontSize: 12 }}>Loading jobs…</div>
            : !jobs?.length ? <div style={{ padding: 20, textAlign: 'center', color: '#9CA3AF', fontSize: 12 }}>No jobs found</div>
            : jobs.map(j => (
              <button key={j.id} onClick={() => { onSelect(j); onClose(); }}
                style={{ width: '100%', padding: '10px 14px', border: 'none', background: '#fff', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #F9FAFB', display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F5F3FF')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Briefcase size={12} color="#7C3AED" /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title}</p>
                  {j.department && <p style={{ margin: '1px 0 0', fontSize: 10, color: '#9CA3AF' }}>{j.department}</p>}
                </div>
                <ChevronRight size={12} color="#C4B5FD" />
              </button>
            ))}
        </div>
      </div>
    </>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════════════
const TalentPoolPage: FC = () => {
  const { role, user } = useSelector((state: RootState) => state.auth);
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Original state (all preserved) ──────────────────────────────────────
  const [searchTerm, setSearchTerm]         = useState<string>(searchParams.get('search') || '');
  const [currentPage, setCurrentPage]       = useState<number>(parseInt(searchParams.get('page') || '1', 10));
  const [itemsPerPage, setItemsPerPage]     = useState<number>(parseInt(searchParams.get('limit') || '20', 10));
  const [filterCreator, setFilterCreator]   = useState<string>('all');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  const [selectedJob, setSelectedJob]         = useState<Job | null>(null);
  const [isJobPopoverOpen, setJobPopoverOpen] = useState(false);
  const [jobSearchTerm, setJobSearchTerm]     = useState('');
  const [debouncedJobSearchTerm] = useDebounce(jobSearchTerm, 500);

  const [isMatchModalOpen, setMatchModalOpen]           = useState(false);
  const [isAddModalOpen, setAddModalOpen]               = useState(false);
  const [isWishlistModalOpen, setIsWishlistModalOpen]   = useState(false);
  const [compareCandidate, setCompareCandidate]         = useState<TalentPoolCandidate | null>(null);
  const [historyCandidate, setHistoryCandidate]         = useState<TalentPoolCandidate | null>(null);
  const [enrichCandidate, setEnrichCandidate]           = useState<TalentPoolCandidate | null>(null);
  const [copiedId, setCopiedId]                         = useState<string | null>(null);
  const [singleInviteCandidate, setSingleInviteCandidate] = useState<TalentPoolCandidate | null>(null);
  const [singleInviteJob, setSingleInviteJob]             = useState<Job | null>(null);
  const [showSingleJobPicker, setShowSingleJobPicker]     = useState(false);
  const [selectedIds, setSelectedIds]                   = useState<Set<string>>(new Set());
  const [showBulkJobPicker, setShowBulkJobPicker]       = useState(false);
  const [bulkInviteJob, setBulkInviteJob]               = useState<Job | null>(null);
  const [showBulkModal, setShowBulkModal]               = useState(false);
  const [floatCandidate, setFloatCandidate]             = useState<TalentPoolCandidate | null>(null);

  // ── Filter state ─────────────────────────────────────────────────────────
  const [filterExp, setFilterExp]           = useState<string>('all');
  const [filterNotice, setFilterNotice]     = useState<string[]>([]);
  const [filterSource, setFilterSource]     = useState<string>('all');
  const [filterLocations, setFilterLocations] = useState<string[]>([]);
  const [filterTitles, setFilterTitles]     = useState<string[]>([]);
  const [filterSkills, setFilterSkills]     = useState<string[]>([]);
  const [filterResume, setFilterResume]     = useState<string>('all');

  useEffect(() => {
    const p = new URLSearchParams();
    if (searchTerm) p.set('search', searchTerm);
    if (currentPage !== 1) p.set('page', currentPage.toString());
    if (itemsPerPage !== 20) p.set('limit', itemsPerPage.toString());
    setSearchParams(p, { replace: true });
  }, [searchTerm, currentPage, itemsPerPage, setSearchParams]);

  // ── Team members ─────────────────────────────────────────────────────────
  const { data: teamMembers } = useQuery({
    queryKey: ['teamMembers', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase.from('hr_employees')
        .select('user_id,first_name,last_name,hr_talent_pool!hr_talent_pool_created_by_fkey!inner(id)')
        .eq('organization_id', organizationId).not('user_id', 'is', null);
      if (error) return [];
      return data || [];
    },
    enabled: !!organizationId && role !== 'employee',
    staleTime: 5 * 60 * 1000,
  });

  // ── Main candidates query ────────────────────────────────────────────────
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['talentPoolCandidates', role, user?.id, currentPage, itemsPerPage, debouncedSearchTerm, filterCreator, filterExp, filterNotice, filterSource, filterLocations, filterTitles, filterSkills, filterResume],
    queryFn: async () => {
      const from = (currentPage - 1) * itemsPerPage;
      const to   = from + itemsPerPage - 1;
      let q = supabase.from('hr_talent_pool')
        .select(`id,candidate_name,email,phone,suggested_title,created_at,current_salary,current_location,total_experience,current_company,current_designation,notice_period,highest_education,work_experience,created_by:hr_employees!hr_talent_pool_created_by_fkey(first_name,last_name),parsed_experience_years,parsed_current_ctc,source_platform,top_skills,top_skills_lower,resume_text,resume_path`, { count: 'exact' });
      if (organizationId) q = q.eq('organization_id', organizationId);
      const TASKUP = '0e4318d8-b1a5-4606-b311-c56d7eec47ce';
      if (user?.id) {
        if (organizationId === TASKUP && role === 'employee') q = q.eq('created_by', user.id);
        else if (filterCreator === 'my') q = q.eq('created_by', user.id);
        else if (filterCreator !== 'all') q = q.eq('created_by', filterCreator);
      }
      if (debouncedSearchTerm) { const s = `%${debouncedSearchTerm}%`; q = q.or(`candidate_name.ilike.${s},email.ilike.${s},phone.ilike.${s}`); }
      if (filterExp === 'fresher') q = q.or('total_experience.ilike.%Fresher%,parsed_experience_years.eq.0');
      else if (filterExp === '1-3') q = q.gte('parsed_experience_years', 1).lte('parsed_experience_years', 3);
      else if (filterExp === '3-5') q = q.gte('parsed_experience_years', 3).lte('parsed_experience_years', 5);
      else if (filterExp === '5-10') q = q.gte('parsed_experience_years', 5).lte('parsed_experience_years', 10);
      else if (filterExp === '10+') q = q.gte('parsed_experience_years', 10);
      if (filterNotice.length > 0) {
        const noticeParts = filterNotice.map(n => `notice_period.ilike.%${n}%`).join(',');
        q = q.or(noticeParts);
      }
      if (filterSource !== 'all') q = q.ilike('source_platform', `%${filterSource}%`);
      if (filterLocations.length > 0) {
        const locParts = filterLocations.map(l => `current_location.ilike.%${l}%`).join(',');
        q = q.or(locParts);
      }
      if (filterTitles.length > 0) {
        const titleParts = filterTitles.flatMap(t => [`suggested_title.ilike.%${t}%`,`current_designation.ilike.%${t}%`]).join(',');
        q = q.or(titleParts);
      }
      if (filterSkills.length > 0) {
        // AND logic for skills — must have ALL selected skills
        filterSkills.forEach(sk => { q = q.contains('top_skills_lower', JSON.stringify([sk.toLowerCase()])); });
      }
      if (filterResume === 'with') q = q.not('resume_path','is',null);
      else if (filterResume === 'without') q = q.is('resume_path',null);
      q = q.range(from, to).order('created_at', { ascending: false });
      const { data: d, error, count } = await q;
      if (error) throw new Error(error.message);
      return { candidates: d as TalentPoolCandidate[], totalCount: count ?? 0 };
    },
    enabled: !!user && !!organizationId,
  });

  // ── Jobs for matching ────────────────────────────────────────────────────
  const { data: jobs, isLoading: isLoadingJobs } = useQuery({
    queryKey: ['jobsForMatching', organizationId, debouncedJobSearchTerm],
    queryFn: async () => {
      if (!organizationId) return [];
      let q = supabase.from('hr_jobs').select('id,title,skills,primary_skills,description,experience,location').eq('organization_id', organizationId).order('created_at', { ascending: false });
      if (debouncedJobSearchTerm) q = q.ilike('title', `%${debouncedJobSearchTerm}%`);
      const { data: d, error } = await q.limit(50);
      if (error) throw error;
      return d as Job[];
    },
    enabled: !!organizationId && isJobPopoverOpen,
  });

  // ── Stats ────────────────────────────────────────────────────────────────
  const { data: statsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ['talentPoolStats', organizationId],
    queryFn: async () => {
      const month = moment().startOf('month').toISOString();
      const week  = moment().startOf('week').toISOString();
      const [{ count: mc }, { count: wc }, { count: ec }, { count: nc }] = await Promise.all([
        supabase.from('hr_talent_pool').select('*',{count:'exact',head:true}).eq('organization_id',organizationId).gte('created_at',month),
        supabase.from('hr_talent_pool').select('*',{count:'exact',head:true}).eq('organization_id',organizationId).gte('created_at',week),
        supabase.from('hr_talent_pool').select('*',{count:'exact',head:true}).eq('organization_id',organizationId).not('resume_path','is',null),
        supabase.from('hr_talent_pool').select('*',{count:'exact',head:true}).eq('organization_id',organizationId).is('resume_path',null),
      ]);
      const trend: number[] = [];
      for (let i = 5; i >= 0; i--) {
        const start = moment().subtract(i,'months').startOf('month').toISOString();
        const end   = moment().subtract(i,'months').endOf('month').toISOString();
        const { count } = await supabase.from('hr_talent_pool').select('*',{count:'exact',head:true}).eq('organization_id',organizationId).gte('created_at',start).lte('created_at',end);
        trend.push(count ?? 0);
      }
      return { addedThisMonth: mc ?? 0, addedThisWeek: wc ?? 0, withResume: ec ?? 0, withoutResume: nc ?? 0, trend };
    },
    enabled: !!user && !!organizationId,
  });

  // ── Analytics ────────────────────────────────────────────────────────────
  const AB = { enabled: !!organizationId, staleTime: 5 * 60 * 1000 };

  const { data: titleStats, isLoading: isTL } = useQuery({ queryKey: ['tp_titles',organizationId], ...AB,
    queryFn: async () => {
      // Page through all data — Supabase max 1000/call, use range
      let all: any[] = []; let from = 0; const pageSize = 1000;
      while(true) {
        const {data:r,error} = await supabase.from('hr_talent_pool').select('suggested_title,current_designation').eq('organization_id',organizationId).range(from,from+pageSize-1);
        if(error||!r||r.length===0) break; all=[...all,...r]; if(r.length<pageSize) break; from+=pageSize;
      }
      return agg(all,['suggested_title','current_designation']);
    }});

  const { data: skillStats, isLoading: isSL } = useQuery({ queryKey: ['tp_skills',organizationId], ...AB,
    queryFn: async () => {
      let all: any[] = []; let from = 0; const pageSize = 1000;
      while(true) {
        const {data:r} = await supabase.from('hr_talent_pool').select('top_skills_lower').eq('organization_id',organizationId).not('top_skills_lower','is',null).range(from,from+pageSize-1);
        if(!r||r.length===0) break; all=[...all,...r]; if(r.length<pageSize) break; from+=pageSize;
      }
      const counts: Record<string,number> = {};
      all.forEach(row => { parseSk(row.top_skills_lower).forEach((s:string) => { const k = String(s).trim(); if(k && k.length<40) counts[k]=(counts[k]||0)+1; }); });
      return Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,30).map(([label,count])=>({label,count}));
    }});

  const { data: locationStats, isLoading: isLL } = useQuery({ queryKey: ['tp_loc',organizationId], ...AB,
    queryFn: async () => {
      let all: any[] = []; let from = 0; const pageSize = 1000;
      while(true) {
        const {data:r} = await supabase.from('hr_talent_pool').select('current_location').eq('organization_id',organizationId).not('current_location','is',null).range(from,from+pageSize-1);
        if(!r||r.length===0) break; all=[...all,...r]; if(r.length<pageSize) break; from+=pageSize;
      }
      const counts: Record<string,number> = {};
      all.forEach(row => { const loc=(row.current_location||'').trim().split(/[,\-\/]/)[0].trim(); if(loc && loc.length>1 && loc.length<35) counts[loc]=(counts[loc]||0)+1; });
      // merge Bangalore/Bengaluru
      const merged = Object.entries(counts).reduce((acc,[k,v])=>{
        const norm = k==='Bengaluru'?'Bangalore':k; acc[norm]=(acc[norm]||0)+v; return acc;
      },{} as Record<string,number>);
      return Object.entries(merged).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([label,count])=>({label,count}));
    }});

  const { data: deptStats, isLoading: isDL } = useQuery({ queryKey: ['tp_dept',organizationId], ...AB,
    queryFn: async () => { const {data:r} = await supabase.from('hr_talent_pool').select('department,functional_role').eq('organization_id',organizationId).not('department','is',null).limit(5000); return agg(r||[],['department','functional_role']); } });

  const { data: noticeOptions, isLoading: isNOL } = useQuery({ queryKey: ['tp_notice',organizationId], ...AB,
    queryFn: async () => {
      let all: any[] = []; let from = 0; const pageSize = 1000;
      while(true) {
        const {data:r} = await supabase.from('hr_talent_pool').select('notice_period').eq('organization_id',organizationId).not('notice_period','is',null).range(from,from+pageSize-1);
        if(!r||r.length===0) break; all=[...all,...r]; if(r.length<pageSize) break; from+=pageSize;
      }
      const counts: Record<string,number> = {};
      all.forEach(row => { const n=(row.notice_period||'').trim(); if(n && n.length>0 && n.length<50) counts[n]=(counts[n]||0)+1; });
      return Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([label,count])=>({label,count}));
    }});

  const { data: sourceStats, isLoading: isSrcL } = useQuery({ queryKey: ['tp_src',organizationId], ...AB,
    queryFn: async () => { const {data:r} = await supabase.from('hr_talent_pool').select('source_platform').eq('organization_id',organizationId).limit(5000);
      const counts: Record<string,number> = {};
      r?.forEach(row => { const s=(row.source_platform||'Unknown').trim(); counts[s]=(counts[s]||0)+1; });
      return Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([label,count])=>({label,count})); } });

  const { data: ctcStats, isLoading: isCL } = useQuery({ queryKey: ['tp_ctc',organizationId], ...AB,
    queryFn: async () => { const {data:r} = await supabase.from('hr_talent_pool').select('parsed_current_ctc').eq('organization_id',organizationId).not('parsed_current_ctc','is',null).gt('parsed_current_ctc',0).limit(15000);
      const B = [{label:'<2L',min:0,max:200000,count:0},{label:'2-5L',min:200000,max:500000,count:0},{label:'5-8L',min:500000,max:800000,count:0},{label:'8-12L',min:800000,max:1200000,count:0},{label:'12-20L',min:1200000,max:2000000,count:0},{label:'20-35L',min:2000000,max:3500000,count:0},{label:'>35L',min:3500000,max:Infinity,count:0}];
      r?.forEach(row => { const v=Number(row.parsed_current_ctc); const b=B.find(bk=>v>=bk.min&&v<bk.max); if(b) b.count++; });
      return B; } });

  const { data: expStats, isLoading: isEL } = useQuery({ queryKey: ['tp_exp',organizationId], ...AB,
    queryFn: async () => { const {data:r} = await supabase.from('hr_talent_pool').select('parsed_experience_years,total_experience').eq('organization_id',organizationId).limit(15000);
      const B = [{label:'Fresher',min:-99,max:0.5,count:0,color:'#7C3AED'},{label:'1–3 yrs',min:0.5,max:3.5,count:0,color:'#2563EB'},{label:'3–5 yrs',min:3.5,max:5.5,count:0,color:'#1D9E75'},{label:'5–10 yrs',min:5.5,max:10.5,count:0,color:'#D97706'},{label:'10+ yrs',min:10.5,max:999,count:0,color:'#D85A30'}];
      r?.forEach(row => { const y=row.parsed_experience_years; if(y==null){ if((row.total_experience||'').toLowerCase().includes('fresher')) B[0].count++; } else { const b=y<0?B[0]:B.find(bk=>y>=bk.min&&y<=bk.max); if(b) b.count++; } });
      return B; } });

  // Build dropdown options
  const titleOpts  = useMemo(() => (titleStats||[]).map(i=>i.label), [titleStats]);
  const skillOpts  = useMemo(() => (skillStats||[]).map(i=>i.label), [skillStats]);
  const locOpts    = useMemo(() => (locationStats||[]).map(i=>i.label), [locationStats]);
  const noticeOpts = useMemo(() => (noticeOptions||[]).map(i=>i.label), [noticeOptions]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const paginatedCandidates = data?.candidates ?? [];
  const totalCandidates     = data?.totalCount ?? 0;
  const totalPages          = Math.ceil(totalCandidates / itemsPerPage);
  const trend               = statsData?.trend ?? [0,0,0,0,0,0];

  // ── Handlers (all original) ───────────────────────────────────────────────
  const handleCandidateAdded     = () => { refetch(); setAddModalOpen(false); };
  const handleItemsPerPageChange = (v: string) => { setItemsPerPage(parseInt(v,10)); setCurrentPage(1); };
  const handleSearchChange       = (e: React.ChangeEvent<HTMLInputElement>) => { setSearchTerm(e.target.value); setCurrentPage(1); };
  const handleJobSelect          = (job: Job) => { setSelectedJob(job); setJobPopoverOpen(false); setMatchModalOpen(true); };
  const clearJobFilter           = () => { setSelectedJob(null); setMatchModalOpen(false); setCurrentPage(1); };
  const toggleSelect = (id: string) => setSelectedIds(p => { const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });
  const toggleAll    = () => { selectedIds.size===paginatedCandidates.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(paginatedCandidates.map(c=>c.id))); };
  const handleSingleInvite      = (c: TalentPoolCandidate) => { setSingleInviteCandidate(c); setSingleInviteJob(null); setShowSingleJobPicker(true); };
  const handleSingleJobSelected = (j: Job) => { setSingleInviteJob(j); setShowSingleJobPicker(false); };
  const handleBulkInvite        = () => { if(!selectedIds.size) return; setBulkInviteJob(null); setShowBulkJobPicker(true); };
  const handleBulkJobSelected   = (j: Job) => { setBulkInviteJob(j); setShowBulkJobPicker(false); setShowBulkModal(true); };
  const bulkCandidates: BulkInviteCandidate[] = paginatedCandidates.filter(c=>selectedIds.has(c.id)).map(c=>({id:c.id,name:c.candidate_name,email:c.email,phone:c.phone,candidateId:null,candidateOwnerId:user?.id||''}));

  const hasFilters = filterExp!=='all'||filterNotice.length>0||filterSource!=='all'||filterLocations.length>0||filterTitles.length>0||filterSkills.length>0||filterResume!=='all'||filterCreator!=='all';
  const clearAll   = () => { setFilterExp('all'); setFilterNotice([]); setFilterSource('all'); setFilterLocations([]); setFilterTitles([]); setFilterSkills([]); setFilterResume('all'); setFilterCreator('all'); setCurrentPage(1); };

  const noticeBadge = (n: string|null) => {
    if (!n) return null;
    const lo = n.toLowerCase();
    const imm = lo.includes('immediate')||lo.includes('0 day');
    const sht = lo.includes('15')||lo.includes('30');
    const [bg,col] = imm ? ['#D1FAE5','#065F46'] : sht ? ['#FEF3C7','#92400E'] : ['#DBEAFE','#1E40AF'];
    return <span style={{fontSize:9,padding:'2px 6px',borderRadius:8,background:bg,color:col,whiteSpace:'nowrap',flexShrink:0}}>{n.length>14?n.slice(0,12)+'…':n}</span>;
  };

  // ── Chip helper ───────────────────────────────────────────────────────────
  const Chip: FC<{ label: string; bg: string; col: string; onClear: () => void }> = ({label,bg,col,onClear}) => (
    <span style={{fontSize:10,padding:'2px 8px',borderRadius:10,background:bg,color:col,display:'flex',alignItems:'center',gap:4}}>
      {label}<X size={9} style={{cursor:'pointer'}} onClick={onClear} />
    </span>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <TooltipProvider delayDuration={80}>
      <div style={{padding:'12px 16px',display:'flex',flexDirection:'column',gap:12}}>

        {/* HEADER */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
          <div>
            <h1 style={{fontSize:19,fontWeight:700,color:'#111827',margin:0}}>Talent Pool</h1>
            <p style={{fontSize:11,color:'#9CA3AF',marginTop:2}}>{isLoading?'Loading…':`${totalCandidates.toLocaleString()} candidates`}</p>
          </div>
          <div style={{display:'flex',gap:7}}>
            <Button variant="outline" size="sm" onClick={()=>setIsWishlistModalOpen(true)} style={{height:30,fontSize:11,borderRadius:8,gap:5}}>
              <Bookmark size={12}/>Shortlist
            </Button>
            <button onClick={()=>setAddModalOpen(true)} style={{display:'flex',alignItems:'center',gap:6,paddingLeft:10,paddingRight:14,height:30,borderRadius:8,color:'#fff',fontSize:11,fontWeight:700,background:'linear-gradient(135deg,#6D28D9,#7C3AED)',border:'none',cursor:'pointer',boxShadow:'0 2px 8px #7C3AED40'}}>
              <UserPlus size={13}/>Add Candidate
            </button>
          </div>
        </div>

        {/* COMPACT STATS */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(195px,1fr))',gap:10}}>
          <StatDualCard title="Candidates" icon={<Users size={14}/>} accent="#7C3AED" isLoading={isLoading||isStatsLoading} spark={trend}
            top={{label:'Total',value:isLoading?'…':totalCandidates.toLocaleString()}}
            bottom={{label:'Added this week',value:isStatsLoading?'…':fmtK(statsData?.addedThisWeek??0)}} />
          <StatDualCard title="Resume coverage" icon={<FileText size={14}/>} accent="#1D9E75" isLoading={isStatsLoading} spark={trend}
            top={{label:'With resume',value:isStatsLoading?'…':fmtK(statsData?.withResume??0)}}
            bottom={{label:'Without resume',value:isStatsLoading?'…':fmtK(statsData?.withoutResume??0)}} />
          <StatDualCard title="Activity" icon={<Calendar size={14}/>} accent="#D97706" isLoading={isStatsLoading}
            top={{label:'Added this month',value:isStatsLoading?'…':fmtK(statsData?.addedThisMonth??0)}}
            bottom={{label:'Shortlisted',value:'—'}} />
        </div>

        {/* INSIGHTS */}
        <div>
          <div style={{fontSize:10,fontWeight:600,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'.6px',marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
            <BarChart2 size={11} style={{color:'#9CA3AF'}}/> Pool Insights
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(178px,1fr))',gap:10}}>
            <InsightPanel title="By Title" icon={<Briefcase size={12}/>} accent="#7C3AED" isLoading={isTL} items={titleStats||[]} total={(titleStats||[]).reduce((s,i)=>s+i.count,0)}/>
            <InsightPanel title="Top Skills" icon={<Sparkles size={12}/>} accent="#2563EB" isLoading={isSL} items={skillStats||[]} total={0}/>
            <InsightPanel title="By Location" icon={<MapPin size={12}/>} accent="#D97706" isLoading={isLL} items={locationStats||[]} total={(locationStats||[]).reduce((s,i)=>s+i.count,0)}/>
            <ExpPanel data={expStats||[]} total={(expStats||[]).reduce((s,i)=>s+i.count,0)} isLoading={isEL}/>
            <CtcFunnelPanel buckets={ctcStats||[{label:'<2L',count:0},{label:'2-5L',count:0},{label:'5-8L',count:0},{label:'8-12L',count:0},{label:'12-20L',count:0},{label:'20-35L',count:0},{label:'>35L',count:0}]} isLoading={isCL}/>
            <TalentOverviewChart expBuckets={expStats||[]} ctcBuckets={ctcStats||[]} monthlyTrend={trend} isLoading={isStatsLoading||isEL||isCL}/>
          </div>
        </div>
           {/* ↓ NEW: Batch upload jobs tracker */}
         <BatchJobsPanel organizationId={organizationId} />

        {/* FILTER BAR */}
        <div style={{background:'#FFFFFF',border:'0.5px solid #E5E7EB',borderRadius:12,padding:'10px 14px',boxShadow:'0 1px 4px rgba(0,0,0,0.05)',display:'flex',flexDirection:'column',gap:8}}>
          {/* Row 1: search + match job */}
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:200,display:'flex',alignItems:'center',gap:6,padding:'0 10px',height:32,borderRadius:8,border:'0.5px solid #D1D5DB',background:'#F9FAFB'}}>
              <Search size={12} style={{color:'#9CA3AF',flexShrink:0}}/>
              <input placeholder="Search name, email, phone…" value={searchTerm} onChange={handleSearchChange}
                style={{border:'none',background:'transparent',outline:'none',fontSize:12,color:'#111827',width:'100%'}}/>
              {searchTerm && <button onClick={()=>{setSearchTerm('');setCurrentPage(1);}} style={{background:'none',border:'none',cursor:'pointer',color:'#9CA3AF',display:'flex',padding:0,flexShrink:0}}><X size={12}/></button>}
            </div>
            <Popover open={isJobPopoverOpen} onOpenChange={setJobPopoverOpen}>
              <PopoverTrigger asChild>
                <button style={{height:32,padding:'0 14px',borderRadius:8,background:'linear-gradient(135deg,#7C3AED,#A855F7)',border:'none',color:'#fff',fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:5,flexShrink:0}}>
                  <Sparkles size={12}/> Match Job
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-3 rounded-xl shadow-xl border-none mt-1" align="end">
                <Command shouldFilter={false}>
                  <CommandInput placeholder="Search jobs…" value={jobSearchTerm} onValueChange={setJobSearchTerm} className="h-8 text-xs"/>
                  <CommandList className="mt-2 max-h-[240px]">
                    <CommandEmpty>{isLoadingJobs?'Loading…':'No jobs found.'}</CommandEmpty>
                    <CommandGroup>{jobs?.map(j=>(<CommandItem key={j.id} value={j.title} onSelect={()=>handleJobSelect(j)} className="text-xs py-2 cursor-pointer">{j.title}<ChevronRight size={12} className="ml-auto text-purple-400"/></CommandItem>))}</CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {hasFilters && <button onClick={clearAll} style={{height:32,padding:'0 11px',borderRadius:8,background:'#FEE2E2',border:'0.5px solid #FECACA',color:'#DC2626',fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:4,flexShrink:0}}><X size={11}/>Clear</button>}
          </div>

          {/* Row 2: all dropdowns */}
          <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
            {/* Creator */}
            <Select value={filterCreator} onValueChange={v=>{setFilterCreator(v);setCurrentPage(1);}}>
              <SelectTrigger style={{height:30,fontSize:11,borderRadius:7,minWidth:105,maxWidth:140,border:filterCreator!=='all'?'0.5px solid #7C3AED':'0.5px solid #D1D5DB',background:filterCreator!=='all'?'#EDE9FE':'#F9FAFB',color:filterCreator!=='all'?'#5B21B6':'#6B7280'}}>
                <SelectValue placeholder="All team"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Candidates</SelectItem>
                <SelectItem value="my" className="text-xs">My Candidates</SelectItem>
                {role!=='employee'&&teamMembers?.map((m:any)=>(<SelectItem key={m.user_id} value={m.user_id} className="text-xs">{m.first_name} {m.last_name}</SelectItem>))}
              </SelectContent>
            </Select>

            {/* Experience */}
            <Select value={filterExp} onValueChange={v=>{setFilterExp(v);setCurrentPage(1);}}>
              <SelectTrigger style={{height:30,fontSize:11,borderRadius:7,minWidth:96,maxWidth:130,border:filterExp!=='all'?'0.5px solid #7C3AED':'0.5px solid #D1D5DB',background:filterExp!=='all'?'#EDE9FE':'#F9FAFB',color:filterExp!=='all'?'#5B21B6':'#6B7280'}}>
                <SelectValue placeholder="Experience"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Exp</SelectItem>
                <SelectItem value="fresher" className="text-xs">Fresher</SelectItem>
                <SelectItem value="1-3" className="text-xs">1–3 Yrs</SelectItem>
                <SelectItem value="3-5" className="text-xs">3–5 Yrs</SelectItem>
                <SelectItem value="5-10" className="text-xs">5–10 Yrs</SelectItem>
                <SelectItem value="10+" className="text-xs">10+ Yrs</SelectItem>
              </SelectContent>
            </Select>

            {/* Notice — multi-select suggest */}
            <MultiSuggestDrop
              placeholder="Notice"
              values={filterNotice}
              onChange={v=>{setFilterNotice(v);setCurrentPage(1);}}
              options={noticeOpts}
              icon={<ChevronDown size={11}/>}
              isLoading={isNOL}
            />

            {/* Source */}
            <Select value={filterSource} onValueChange={v=>{setFilterSource(v);setCurrentPage(1);}}>
              <SelectTrigger style={{height:30,fontSize:11,borderRadius:7,minWidth:85,maxWidth:115,border:filterSource!=='all'?'0.5px solid #7C3AED':'0.5px solid #D1D5DB',background:filterSource!=='all'?'#EDE9FE':'#F9FAFB',color:filterSource!=='all'?'#5B21B6':'#6B7280'}}>
                <SelectValue placeholder="Source"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Sources</SelectItem>
                <SelectItem value="naukri" className="text-xs">Naukri</SelectItem>
                <SelectItem value="invite" className="text-xs">Invite</SelectItem>
                <SelectItem value="candidate_search" className="text-xs">People Search</SelectItem>
                <SelectItem value="migration" className="text-xs">Migration</SelectItem>
              </SelectContent>
            </Select>

            {/* Resume */}
            <Select value={filterResume} onValueChange={v=>{setFilterResume(v);setCurrentPage(1);}}>
              <SelectTrigger style={{height:30,fontSize:11,borderRadius:7,minWidth:88,maxWidth:118,border:filterResume!=='all'?'0.5px solid #7C3AED':'0.5px solid #D1D5DB',background:filterResume!=='all'?'#EDE9FE':'#F9FAFB',color:filterResume!=='all'?'#5B21B6':'#6B7280'}}>
                <SelectValue placeholder="Resume"/>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All</SelectItem>
                <SelectItem value="with" className="text-xs">With Resume</SelectItem>
                <SelectItem value="without" className="text-xs">Without Resume</SelectItem>
              </SelectContent>
            </Select>

            {/* Title multi-suggest */}
            <MultiSuggestDrop placeholder="Title" values={filterTitles} onChange={v=>{setFilterTitles(v);setCurrentPage(1);}} options={titleOpts} icon={<Briefcase size={11}/>} isLoading={isTL}/>

            {/* Skill multi-suggest */}
            <MultiSuggestDrop placeholder="Skill" values={filterSkills} onChange={v=>{setFilterSkills(v);setCurrentPage(1);}} options={skillOpts} icon={<Sparkles size={11}/>} isLoading={isSL}/>

            {/* Location multi-suggest */}
            <MultiSuggestDrop placeholder="Location" values={filterLocations} onChange={v=>{setFilterLocations(v);setCurrentPage(1);}} options={locOpts} icon={<MapPin size={11}/>} isLoading={isLL}/>
          </div>

          {/* Active chips */}
          {hasFilters && (
            <div style={{display:'flex',gap:5,flexWrap:'wrap',paddingTop:6,borderTop:'0.5px solid #F3F4F6'}}>
              {filterCreator!=='all' && <Chip label="Team filter" bg="#EDE9FE" col="#5B21B6" onClear={()=>{setFilterCreator('all');setCurrentPage(1);}}/>}
              {filterExp!=='all' && <Chip label={filterExp==='fresher'?'Fresher':filterExp+' yrs'} bg="#DBEAFE" col="#1D4ED8" onClear={()=>{setFilterExp('all');setCurrentPage(1);}}/>}
              {filterNotice.map(n=><Chip key={n} label={n.slice(0,20)} bg="#FEF3C7" col="#92400E" onClear={()=>{setFilterNotice(filterNotice.filter(x=>x!==n));setCurrentPage(1);}}/>)}
              {filterSource!=='all' && <Chip label={filterSource} bg="#FEE2E2" col="#991B1B" onClear={()=>{setFilterSource('all');setCurrentPage(1);}}/>}
              {filterResume!=='all' && <Chip label={filterResume==='with'?'With resume':'No resume'} bg="#D1FAE5" col="#065F46" onClear={()=>{setFilterResume('all');setCurrentPage(1);}}/>}
              {filterTitles.map(t=><Chip key={t} label={t.slice(0,20)} bg="#EDE9FE" col="#5B21B6" onClear={()=>{setFilterTitles(filterTitles.filter(x=>x!==t));setCurrentPage(1);}}/>)}
              {filterSkills.map(s=><Chip key={s} label={s.slice(0,20)} bg="#DBEAFE" col="#1D4ED8" onClear={()=>{setFilterSkills(filterSkills.filter(x=>x!==s));setCurrentPage(1);}}/>)}
              {filterLocations.map(l=><Chip key={l} label={l.slice(0,20)} bg="#FEF9C3" col="#854D0E" onClear={()=>{setFilterLocations(filterLocations.filter(x=>x!==l));setCurrentPage(1);}}/>)}
            </div>
          )}
        </div>

        {/* BULK BAR */}
        {selectedIds.size > 0 && (
          <div style={{background:'#EDE9FE',border:'0.5px solid #C4B5FD',borderRadius:10,padding:'7px 14px',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            <CheckSquare size={13} style={{color:'#7C3AED',flexShrink:0}}/>
            <span style={{fontSize:11,fontWeight:600,color:'#5B21B6'}}>{selectedIds.size} selected</span>
            <button onClick={handleBulkInvite} style={{height:27,padding:'0 11px',borderRadius:7,background:'#7C3AED',border:'none',color:'#fff',fontSize:11,fontWeight:600,cursor:'pointer'}}>Bulk Invite</button>
            <button style={{height:27,padding:'0 11px',borderRadius:7,background:'#fff',border:'0.5px solid #C4B5FD',color:'#5B21B6',fontSize:11,fontWeight:600,cursor:'pointer'}}>Add to Shortlist</button>
            <button onClick={()=>setSelectedIds(new Set())} style={{marginLeft:'auto',background:'none',border:'none',fontSize:11,color:'#7C3AED',cursor:'pointer'}}>Clear</button>
          </div>
        )}

        {/* TABLE */}
        <div>
          <div style={{fontSize:10,fontWeight:600,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:7}}>
            Candidates ({totalCandidates.toLocaleString()})
          </div>

          {isLoading ? (
            <div style={{background:'#FFF',borderRadius:12,border:'0.5px solid #E5E7EB',overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              {Array.from({length:6}).map((_,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderBottom:'0.5px solid #F3F4F6'}}>
                  <Skeleton className="h-3 w-3"/><Skeleton className="h-8 w-8 rounded-full"/>
                  <div style={{flex:1}}><Skeleton className="h-3 w-32 mb-1"/><Skeleton className="h-2 w-20"/></div>
                  <Skeleton className="h-5 w-16"/><Skeleton className="h-5 w-12"/><Skeleton className="h-5 w-16"/>
                </div>
              ))}
            </div>
          ) : !paginatedCandidates.length ? (
            <div style={{background:'#FFF',borderRadius:12,border:'0.5px solid #E5E7EB',padding:40,textAlign:'center',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              <Users size={30} style={{color:'#D1D5DB',margin:'0 auto 8px'}}/>
              <p style={{fontSize:13,color:'#9CA3AF',margin:0}}>No candidates found.{searchTerm&&' Try adjusting your search.'}</p>
            </div>
          ) : (
            <div style={{background:'#FFF',borderRadius:12,border:'0.5px solid #E5E7EB',overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',minWidth:820}}>
                  <thead>
                    <tr style={{background:'linear-gradient(135deg,#6D28D9,#7C3AED)'}}>
                      <th style={{width:32,padding:'9px 8px 9px 12px'}}>
                        <input type="checkbox" checked={selectedIds.size===paginatedCandidates.length&&paginatedCandidates.length>0} onChange={toggleAll} style={{width:12,height:12,accentColor:'#fff',cursor:'pointer'}}/>
                      </th>
                      {['Candidate','Skills','Exp','CTC','Notice','Location','Added','Actions'].map(h=>(
                        <th key={h} style={{padding:'9px 8px',textAlign:'left',fontSize:10,fontWeight:600,color:'rgba(255,255,255,0.85)',textTransform:'uppercase',letterSpacing:'.5px',whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCandidates.map((c,idx)=>{
                      const ps = calcProfile(c);
                      const isSelected = selectedIds.has(c.id);
                      const allSkills = parseSk(c.top_skills_lower || c.top_skills);
                      const shownSkills = allSkills.slice(0, 2);
                      const extraSkills = allSkills.slice(2);
                      const initials = c.created_by ? `${c.created_by.first_name?.charAt(0)||''}${c.created_by.last_name?.charAt(0)||''}`.toUpperCase() : '';
                      const rc = ps.percentage===100?'#10B981':ps.percentage>=50?'#F59E0B':'#EF4444';
                      const rcBg = ps.percentage===100?'#ECFDF5':ps.percentage>=50?'#FFFBEB':'#FEF2F2';
                      const circ2 = 2*Math.PI*17;
                      const hasResume = !!(c.resume_path || (c.resume_text && c.resume_text.trim().length > 20));
                      return (
                        <tr key={c.id}
                          style={{background:isSelected?'#F5F3FF':idx%2===0?'#FFFFFF':'#FAFAFA',borderBottom:'0.5px solid #F3F4F6',transition:'background .12s'}}
                          onMouseEnter={e=>{if(!isSelected)(e.currentTarget as HTMLTableRowElement).style.background='#F0EEFF';}}
                          onMouseLeave={e=>{(e.currentTarget as HTMLTableRowElement).style.background=isSelected?'#F5F3FF':idx%2===0?'#FFFFFF':'#FAFAFA';}}
                        >
                          <td style={{padding:'7px 4px 7px 12px',width:32}}>
                            <input type="checkbox" checked={isSelected} onChange={()=>toggleSelect(c.id)} style={{width:12,height:12,accentColor:'#7C3AED',cursor:'pointer'}}/>
                          </td>

                          {/* Candidate */}
                          <td style={{padding:'7px 8px',minWidth:185,maxWidth:225}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div style={{position:'relative',flexShrink:0,cursor:'default',width:38,height:38}}>
                                    <div style={{position:'absolute',inset:0,borderRadius:'50%',background:rcBg,border:`2px solid ${rc}`}}/>
                                    <div style={{position:'absolute',inset:4,borderRadius:'50%',background:'linear-gradient(135deg,#7C3AED,#4F46E5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#fff'}}>
                                      {c.candidate_name?.charAt(0)?.toUpperCase()||'?'}
                                    </div>
                                    <svg width="38" height="38" style={{position:'absolute',top:0,left:0,pointerEvents:'none'}}>
                                      <circle cx="19" cy="19" r="17" fill="none" stroke={rc} strokeWidth="3"
                                        strokeDasharray={`${circ2*ps.percentage/100} ${circ2-(circ2*ps.percentage/100)}`}
                                        strokeDashoffset={circ2/4} strokeLinecap="round"/>
                                    </svg>
                                    <div style={{position:'absolute',bottom:-4,right:-4,minWidth:17,height:17,borderRadius:9,background:rc,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid #fff',fontSize:7,fontWeight:700,color:'#fff',padding:'0 2px'}}>
                                      {ps.percentage}%
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                  <div style={{maxWidth:180}}>
                                    <p style={{fontWeight:600,fontSize:11,marginBottom:4}}>Profile {ps.percentage}% complete</p>
                                    {ps.missingFields.length>0&&<><p style={{fontSize:10,color:'#9CA3AF',marginBottom:3}}>Missing:</p><ul style={{fontSize:10,paddingLeft:14,margin:0}}>{ps.missingFields.map(f=><li key={f}>{f}</li>)}</ul></>}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                              <div style={{minWidth:0}}>
                                <div style={{display:'flex',alignItems:'center',gap:4}}>
                                  <Link to={`/talent-pool/${c.id}`} style={{fontSize:11,fontWeight:600,color:'#6D28D9',display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',textDecoration:'none',maxWidth:130}}>
                                    {c.candidate_name||'N/A'}
                                  </Link>
                                  {hasResume&&<Tooltip><TooltipTrigger asChild>
                                    <span style={{width:14,height:14,borderRadius:3,background:'#D1FAE5',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                      <FileText size={8} style={{color:'#059669'}}/>
                                    </span>
                                  </TooltipTrigger><TooltipContent>Has resume</TooltipContent></Tooltip>}
                                </div>
                                <span style={{fontSize:9,color:'#9CA3AF',display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                  {c.suggested_title||c.current_designation||c.current_company||'—'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Skills — 2 shown + N more tooltip */}
                          <td style={{padding:'7px 8px',minWidth:115}}>
                            <div style={{display:'flex',gap:3,alignItems:'center',flexWrap:'nowrap'}}>
                              {allSkills.length===0
                                ? <span style={{fontSize:10,color:'#D1D5DB'}}>—</span>
                                : <>
                                    {shownSkills.map((s,i)=>(
                                      <span key={i} style={{fontSize:9,padding:'2px 6px',borderRadius:8,background:'#EDE9FE',color:'#5B21B6',whiteSpace:'nowrap',maxWidth:78,overflow:'hidden',textOverflow:'ellipsis',display:'inline-block'}}>
                                        {s}
                                      </span>
                                    ))}
                                    {extraSkills.length>0&&(
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span style={{fontSize:9,padding:'2px 7px',borderRadius:8,background:'#F3F4F6',color:'#6B7280',cursor:'pointer',whiteSpace:'nowrap',flexShrink:0,border:'0.5px solid #E5E7EB'}}>
                                            +{extraSkills.length}
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom">
                                          <div style={{maxWidth:220}}>
                                            <p style={{fontSize:10,fontWeight:600,marginBottom:5}}>All {allSkills.length} skills</p>
                                            <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
                                              {allSkills.map((s,i)=>(
                                                <span key={i} style={{fontSize:9,padding:'2px 6px',borderRadius:6,background:'#EDE9FE',color:'#5B21B6'}}>{s}</span>
                                              ))}
                                            </div>
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>
                                    )}
                                  </>
                              }
                            </div>
                          </td>

                          {/* Exp */}
                          <td style={{padding:'7px 8px',whiteSpace:'nowrap'}}>
                            {c.parsed_experience_years!=null&&c.parsed_experience_years>=0
                              ? <span style={{fontSize:10,padding:'2px 7px',borderRadius:8,background:'#DBEAFE',color:'#1D4ED8'}}>{c.parsed_experience_years}y</span>
                              : c.total_experience
                                ? <span style={{fontSize:9,color:'#6B7280'}}>{String(c.total_experience).slice(0,14)}</span>
                                : <span style={{fontSize:10,color:'#D1D5DB'}}>—</span>
                            }
                          </td>

                          {/* CTC */}
                          <td style={{padding:'7px 8px',whiteSpace:'nowrap'}}>
                            {c.parsed_current_ctc
                              ? <span style={{fontSize:10,padding:'2px 7px',borderRadius:8,background:'#D1FAE5',color:'#065F46'}}>{fmtL(Number(c.parsed_current_ctc))}</span>
                              : c.current_salary
                                ? <span style={{fontSize:9,color:'#6B7280'}}>{String(c.current_salary).slice(0,10)}</span>
                                : <span style={{fontSize:10,color:'#D1D5DB'}}>—</span>
                            }
                          </td>

                          {/* Notice */}
                          <td style={{padding:'7px 8px'}}>{noticeBadge(c.notice_period)}</td>

                          {/* Location */}
                          <td style={{padding:'7px 8px',maxWidth:110}}>
                            <span style={{fontSize:10,color:'#6B7280',display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                              {c.current_location ? String(c.current_location).split(/[,\/]/)[0].trim() : <span style={{color:'#D1D5DB'}}>—</span>}
                            </span>
                          </td>

                          {/* Added by */}
                          <td style={{padding:'7px 8px',whiteSpace:'nowrap'}}>
                            {initials ? (
                              <Tooltip><TooltipTrigger asChild>
                                <div style={{display:'flex',alignItems:'center',gap:5,cursor:'default'}}>
                                  <div style={{width:20,height:20,borderRadius:'50%',background:'linear-gradient(135deg,#A78BFA,#7C3AED)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:700,color:'#fff',flexShrink:0}}>{initials}</div>
                                  <span style={{fontSize:9,color:'#9CA3AF'}}>{moment(c.created_at).format('DD MMM')}</span>
                                </div>
                              </TooltipTrigger><TooltipContent>{`${c.created_by?.first_name||''} ${c.created_by?.last_name||''}`.trim()} · {moment(c.created_at).format('DD MMM YY')}</TooltipContent></Tooltip>
                            ) : <span style={{fontSize:9,color:'#9CA3AF'}}>System·{moment(c.created_at).format('DD MMM')}</span>}
                          </td>

                          {/* Actions — bordered button style */}
                          <td style={{padding:'7px 6px'}}>
                            <div style={{display:'flex',alignItems:'center',gap:2}}>
                              <Tooltip><TooltipTrigger asChild>
                                <button onClick={()=>setHistoryCandidate(c)} style={{width:24,height:24,borderRadius:5,border:'0.5px solid #E5E7EB',background:'#FAFAFA',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#6B7280'}}
                                  onMouseEnter={e=>{e.currentTarget.style.background='#F3F4F6';e.currentTarget.style.borderColor='#D1D5DB';}}
                                  onMouseLeave={e=>{e.currentTarget.style.background='#FAFAFA';e.currentTarget.style.borderColor='#E5E7EB';}}>
                                  <History size={11}/>
                                </button>
                              </TooltipTrigger><TooltipContent>History</TooltipContent></Tooltip>

                              <Tooltip><TooltipTrigger asChild>
                                <button onClick={()=>setCompareCandidate(c)} style={{width:24,height:24,borderRadius:5,border:'0.5px solid #E5E7EB',background:'#FAFAFA',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#6B7280'}}
                                  onMouseEnter={e=>{e.currentTarget.style.background='#F3F4F6';e.currentTarget.style.borderColor='#D1D5DB';}}
                                  onMouseLeave={e=>{e.currentTarget.style.background='#FAFAFA';e.currentTarget.style.borderColor='#E5E7EB';}}>
                                  <ScanSearch size={11}/>
                                </button>
                              </TooltipTrigger><TooltipContent>Compare</TooltipContent></Tooltip>

                              <Tooltip><TooltipTrigger asChild>
                                <button onClick={()=>setEnrichCandidate(c)} style={{width:24,height:24,borderRadius:5,border:'0.5px solid #DDD6FE',background:'#F5F3FF',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#7C3AED'}}
                                  onMouseEnter={e=>{e.currentTarget.style.background='#EDE9FE';e.currentTarget.style.borderColor='#A78BFA';}}
                                  onMouseLeave={e=>{e.currentTarget.style.background='#F5F3FF';e.currentTarget.style.borderColor='#DDD6FE';}}>
                                  <Sparkles size={11}/>
                                </button>
                              </TooltipTrigger><TooltipContent>Enrich</TooltipContent></Tooltip>

                              <CandidateActivityButton candidateId={c.id} candidateName={c.candidate_name}/>
                              <div style={{width:1,height:14,background:'#E5E7EB',margin:'0 1px',flexShrink:0}}/>

                              <Tooltip><TooltipTrigger asChild>
                                <button onClick={()=>handleSingleInvite(c)} style={{width:24,height:24,borderRadius:5,border:'0.5px solid #DDD6FE',background:'#F5F3FF',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#7C3AED'}}
                                  onMouseEnter={e=>{e.currentTarget.style.background='#7C3AED';e.currentTarget.style.borderColor='#7C3AED';e.currentTarget.style.color='#fff';}}
                                  onMouseLeave={e=>{e.currentTarget.style.background='#F5F3FF';e.currentTarget.style.borderColor='#DDD6FE';e.currentTarget.style.color='#7C3AED';}}>
                                  <Send size={11}/>
                                </button>
                              </TooltipTrigger><TooltipContent>Invite to Job</TooltipContent></Tooltip>

                              <Tooltip><TooltipTrigger asChild>
                                <button onClick={()=>{navigator.clipboard.writeText(c.email);setCopiedId(c.id);setTimeout(()=>setCopiedId(null),1500);}} style={{width:24,height:24,borderRadius:5,border:'0.5px solid #E5E7EB',background:'#FAFAFA',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#6B7280'}}
                                  onMouseEnter={e=>{e.currentTarget.style.background='#F3F4F6';e.currentTarget.style.borderColor='#D1D5DB';}}
                                  onMouseLeave={e=>{e.currentTarget.style.background='#FAFAFA';e.currentTarget.style.borderColor='#E5E7EB';}}>
                                  <Mail size={11}/>
                                </button>
                              </TooltipTrigger><TooltipContent>{copiedId===c.id?'✓ Copied!':c.email||'No email'}</TooltipContent></Tooltip>

                              {c.phone&&(
                                <Tooltip><TooltipTrigger asChild>
                                  <button onClick={()=>setFloatCandidate(c)} style={{width:24,height:24,borderRadius:5,border:'0.5px solid #A7F3D0',background:'#ECFDF5',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#059669'}}
                                    onMouseEnter={e=>{e.currentTarget.style.background='#059669';e.currentTarget.style.borderColor='#059669';e.currentTarget.style.color='#fff';}}
                                    onMouseLeave={e=>{e.currentTarget.style.background='#ECFDF5';e.currentTarget.style.borderColor='#A7F3D0';e.currentTarget.style.color='#059669';}}>
                                    <MessageSquare size={11}/>
                                  </button>
                                </TooltipTrigger><TooltipContent>WhatsApp</TooltipContent></Tooltip>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 14px',borderTop:'0.5px solid #F3F4F6',flexWrap:'wrap',gap:8,background:'#FAFAFA'}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:11,color:'#9CA3AF'}}>Rows</span>
                  <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                    <SelectTrigger className="w-[58px] h-7 text-xs"><SelectValue/></SelectTrigger>
                    <SelectContent>{['10','20','50','100'].map(v=><SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:5}}>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={()=>setCurrentPage(p=>Math.max(p-1,1))} disabled={currentPage===1}><ChevronLeft className="h-3 w-3"/></Button>
                  <span style={{fontSize:11,fontWeight:600,color:'#374151',minWidth:90,textAlign:'center'}}>Page {currentPage} / {totalPages}</span>
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={()=>setCurrentPage(p=>Math.min(p+1,totalPages))} disabled={currentPage===totalPages}><ChevronRight className="h-3 w-3"/></Button>
                </div>
                <span style={{fontSize:11,color:'#9CA3AF'}}>{((currentPage-1)*itemsPerPage+1).toLocaleString()}–{Math.min(currentPage*itemsPerPage,totalCandidates).toLocaleString()} of {totalCandidates.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* ALL ORIGINAL MODALS */}
        <JobMatchModal isOpen={isMatchModalOpen&&!!selectedJob} onClose={clearJobFilter} job={selectedJob} organizationId={organizationId}/>
        {isAddModalOpen    && <AddCandidateModal isOpen onClose={()=>setAddModalOpen(false)} onCandidateAdded={handleCandidateAdded}/>}
        {compareCandidate  && <CompareWithJobDialog isOpen onClose={()=>setCompareCandidate(null)} candidateId={compareCandidate.id}/>}
        {historyCandidate  && <AnalysisHistoryDialog isOpen onClose={()=>setHistoryCandidate(null)} candidateId={historyCandidate.id} candidateName={historyCandidate.candidate_name??''}/>}
        {enrichCandidate   && <EnrichDataDialog isOpen onClose={()=>setEnrichCandidate(null)} candidate={enrichCandidate}/>}
        <WishlistModal isOpen={isWishlistModalOpen} onClose={()=>setIsWishlistModalOpen(false)}/>

        <JobPickerModal isOpen={showSingleJobPicker} onClose={()=>setShowSingleJobPicker(false)} onSelect={handleSingleJobSelected} organizationId={organizationId} title="Select job for this invite"/>
        {singleInviteJob&&singleInviteCandidate&&(
          <InviteCandidateModal isOpen onClose={()=>{setSingleInviteCandidate(null);setSingleInviteJob(null);}}
            jobId={singleInviteJob.id} job={singleInviteJob as any}
            prefillEmail={singleInviteCandidate.email||''} prefillName={singleInviteCandidate.candidate_name||''} prefillPhone={singleInviteCandidate.phone||''}
            candidateId={null} candidateOwnerId={user.id} inviteSource="talentpool"/>
        )}

        <JobPickerModal isOpen={showBulkJobPicker} onClose={()=>setShowBulkJobPicker(false)} onSelect={handleBulkJobSelected} organizationId={organizationId}
          title={`Select job for ${selectedIds.size} candidate${selectedIds.size!==1?'s':''}`}/>
        {showBulkModal&&bulkInviteJob&&(
          <BulkInviteReviewModal isOpen onClose={()=>{setShowBulkModal(false);setSelectedIds(new Set());}}
            candidates={bulkCandidates} jobId={bulkInviteJob.id} jobTitle={bulkInviteJob.title} inviteSource="talentpool" job={bulkInviteJob as any}/>
        )}

        {floatCandidate?.phone&&(
          <V2WhatsAppFloat candidateId={floatCandidate.id} candidateName={floatCandidate.candidate_name||'Candidate'} candidatePhone={floatCandidate.phone}/>
        )}
      </div>
    </TooltipProvider>
  );
};

export default TalentPoolPage;