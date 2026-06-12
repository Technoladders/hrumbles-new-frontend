import { useState, useEffect, useRef, FC, useMemo, useCallback } from 'react';
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
  Briefcase, ScanSearch, Mail, Sparkles, Bookmark, BarChart2,
  MessageSquare, Send, X, CheckSquare, MapPin, DollarSign,
  FileText, ChevronDown, Table2, TrendingUp, Award, Zap, Upload, UploadCloud
} from 'lucide-react';

import AddCandidateModal           from '@/components/candidates/talent-pool/AddCandidateModal';
import CompareWithJobDialog        from '@/components/candidates/talent-pool/CompareWithJobDialog';
import AnalysisHistoryDialog       from '@/components/candidates/AnalysisHistoryDialog';
import EnrichDataDialog            from '@/components/candidates/talent-pool/EnrichDataDialog';
import JobMatchModal               from '@/components/candidates/talent-pool/JobMatchModal';
import WishlistModal               from '@/components/candidates/talent-pool/WishlistModal';
import { CandidateActivityButton } from '@/components/candidates/activity/CandidateActivityButton';
import InviteCandidateModal        from '@/components/jobs/job/invite/InviteCandidateModal';
import BulkInviteReviewModal, { BulkInviteCandidate } from '@/components/jobs/job/invite/BulkInviteReviewModal';
import V2WhatsAppFloat             from '@/components/MagicLinkView/candidate-profile-v2/components/V2WhatsAppFloat';
import BatchJobsPanel              from '@/components/candidates/talent-pool/BatchJobsPanel';
import AnalyticsTab                from '@/components/candidates/talent-pool/AnalyticsTab';
import CallButton from '@/components/calling/CallButton'
import YohrCsvUploadButton from '@/components/candidates/talent-pool/YohrCsvUploadButton';



// ─── Types ───────────────────────────────────────────────────────────────────
export interface TalentPoolCandidate {
  id: string; candidate_name: string; email: string; phone: string;
  suggested_title: string; created_at: string;
  created_by: { first_name: string; last_name: string } | null;
  [key: string]: any;
}
interface Job {
  id: string; title: string; skills: string[]; primary_skills?: string[];
  description: string; experience: string | Record<string, any>;
  location: string[]; department?: string; budget?: string; budgetType?: string;
}
interface RootState { auth: { role: string; user: { id: string; organization_id: string } | null }; }
interface AnalyticsData {
  total: number; with_resume: number; without_resume: number;
  added_this_month: number; added_this_week: number; added_today: number;
  monthly_trend: { month: string; count: number }[];
  by_title: { label: string; count: number }[];
  by_skill: { label: string; count: number }[];
  by_location: { label: string; count: number }[];
  by_experience: { label: string; count: number }[];
  by_ctc: { label: string; count: number }[];
  by_source: { label: string; count: number }[];
  exp_ctc_heatmap: { exp: string; ctc: string; count: number }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const EXP_ORDER  = ['Fresher','1–3 yrs','3–5 yrs','5–10 yrs','10+ yrs'];
const CTC_ORDER  = ['<2L','2–5L','5–8L','8–12L','12–20L','20–35L','>35L'];
const PALETTE    = ['#6d4aff','#8a6dff','#a37cd9','#c89cdb','#e0c2eb','#b88cff','#9060e0'];
const ACCENT     = '#6d4aff';
const ACCENT2    = '#1D9E75';
const ACCENT3    = '#D97706';

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

// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

// ─── KPI Card ────────────────────────────────────────────────────────────────
const KpiCard: FC<{
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string; trend?: number;
}> = ({ label, value, sub, icon, color, trend }) => (
  <div style={{
    background: '#fff', border: '1px solid #ece9f0', borderRadius: 16,
    padding: '20px 22px', position: 'relative', overflow: 'hidden',
    boxShadow: '0 1px 6px rgba(109,74,255,0.06)',
  }}>
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: '16px 16px 0 0' }} />
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: '#8b8499', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</span>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
    </div>
    <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1722', lineHeight: 1, letterSpacing: '-0.02em' }}>
      {typeof value === 'number' ? value.toLocaleString() : value}
    </div>
    {sub && <div style={{ fontSize: 11, color: '#8b8499', marginTop: 6 }}>{sub}</div>}
    {trend !== undefined && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
        <TrendingUp size={11} style={{ color: trend >= 0 ? '#1D9E75' : '#ef4444' }} />
        <span style={{ fontSize: 10, color: trend >= 0 ? '#1D9E75' : '#ef4444', fontWeight: 600 }}>
          {trend >= 0 ? '+' : ''}{trend}% vs last month
        </span>
      </div>
    )}
  </div>
);

// ─── Area Trend Chart (pure SVG) ─────────────────────────────────────────────
const TrendChart: FC<{ data: { month: string; count: number }[] }> = ({ data }) => {
  if (!data?.length) return null;
  const W = 600; const H = 130; const PAD = { t: 16, r: 20, b: 28, l: 44 };
  const iW = W - PAD.l - PAD.r; const iH = H - PAD.t - PAD.b;
  const max = Math.max(...data.map(d => d.count), 1);
  const pts = data.map((d, i) => ({
    x: PAD.l + (i / (data.length - 1)) * iW,
    y: PAD.t + iH - (d.count / max) * iH,
    ...d,
  }));
  const linePts = pts.map(p => `${p.x},${p.y}`).join(' ');
  const areaPath = `M${PAD.l},${PAD.t + iH} L${pts.map(p => `${p.x},${p.y}`).join(' L')} L${PAD.l + iW},${PAD.t + iH} Z`;
  const yTicks = [0, Math.round(max / 2), max];

  return (
    <div style={{ background: '#fff', border: '1px solid #ece9f0', borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 6px rgba(109,74,255,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#8b8499', textTransform: 'uppercase', letterSpacing: '.08em' }}>Monthly Additions</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1722', letterSpacing: '-0.02em', marginTop: 2 }}>
            {data.reduce((s, d) => s + d.count, 0).toLocaleString()} <span style={{ fontSize: 13, fontWeight: 400, color: '#8b8499' }}>last 6 months</span>
          </div>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity="0.18" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {/* Y grid */}
        {yTicks.map((t, i) => {
          const y = PAD.t + iH - (t / max) * iH;
          return (
            <g key={i}>
              <line x1={PAD.l} y1={y} x2={PAD.l + iW} y2={y} stroke="#ece9f0" strokeWidth="0.8" strokeDasharray="4 3" />
              <text x={PAD.l - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#8b8499">{fmtK(t)}</text>
            </g>
          );
        })}
        {/* Area */}
        <path d={areaPath} fill="url(#areaGrad)" />
        {/* Line */}
        <polyline points={linePts} fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Points + labels */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke={ACCENT} strokeWidth="2" />
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9" fontWeight="600" fill={ACCENT}>{p.count > 0 ? fmtK(p.count) : ''}</text>
            <text x={p.x} y={H - 4} textAnchor="middle" fontSize="9" fill="#8b8499">{p.month}</text>
          </g>
        ))}
      </svg>
    </div>
  );
};

// ─── Donut + Ranked List (pattern 02 from reference) ─────────────────────────
const DonutList: FC<{
  title: string; items: { label: string; count: number }[];
  total?: number; accent?: string; maxItems?: number;
}> = ({ title, items, total, accent = ACCENT, maxItems = 10 }) => {
  const shown = items.slice(0, maxItems);
  const sum   = shown.reduce((s, i) => s + i.count, 0);
  const donutTotal = total ?? sum;
  // Donut: top 5 only
  const donutItems = shown.slice(0, 5);
  const donutSum   = donutItems.reduce((s, i) => s + i.count, 0);
  const R = 52; const STROKE = 14; const CIRC = 2 * Math.PI * R;
  const palette = [accent, '#8a6dff', '#a37cd9', '#c89cdb', '#e0c2eb'];
  let offset = 0;
  const maxCount = shown[0]?.count || 1;

  return (
    <div style={{ background: '#fff', border: '1px solid #ece9f0', borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 6px rgba(109,74,255,0.06)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#8b8499', textTransform: 'uppercase', letterSpacing: '.08em' }}>{title}</div>
        </div>
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#8b8499' }}>{fmtK(donutTotal)} total</span>
      </div>

      {/* Donut */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
        <svg width="124" height="124" style={{ flexShrink: 0 }}>
          <circle cx="62" cy="62" r={R} fill="none" stroke="#f5f3f7" strokeWidth={STROKE} />
          {donutItems.map((item, i) => {
            const pct  = donutSum > 0 ? item.count / donutSum : 0;
            const dash = CIRC * pct;
            const el = (
              <circle key={i} cx="62" cy="62" r={R} fill="none"
                stroke={palette[i % palette.length]} strokeWidth={STROKE}
                strokeDasharray={`${dash} ${CIRC - dash}`}
                strokeDashoffset={-(offset) + CIRC / 4}
                strokeLinecap="butt" />
            );
            offset += dash;
            return el;
          })}
          <text x="62" y="58" textAnchor="middle" fontSize="18" fontWeight="700" fill="#1a1722">{fmtK(donutTotal)}</text>
          <text x="62" y="74" textAnchor="middle" fontSize="9" fill="#8b8499">candidates</text>
        </svg>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {donutItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: palette[i % palette.length], flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#3a3540', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
              <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#8b8499', flexShrink: 0 }}>
                {donutSum > 0 ? Math.round(item.count / donutSum * 100) : 0}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Ranked list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, maxHeight: 240, overflowY: 'auto', paddingRight: 4 }}>
        {shown.map((item, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '16px 1fr 40px', gap: 8, alignItems: 'center' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#c4c0cc', textAlign: 'right' }}>{i + 1}</span>
            <div>
              <div style={{ fontSize: 11, color: '#3a3540', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>{item.label}</div>
              <div style={{ height: 4, background: '#f5f3f7', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(item.count / maxCount) * 100}%`, background: `linear-gradient(90deg, ${accent}, ${accent}aa)`, borderRadius: 2, transition: 'width .5s ease' }} />
              </div>
            </div>
            <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#6b647a', textAlign: 'right' }}>{fmtK(item.count)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Treemap (pattern 03) ─────────────────────────────────────────────────────
const Treemap: FC<{ title: string; items: { label: string; count: number }[] }> = ({ title, items }) => {
  const shown = items.slice(0, 16);
  const total = shown.reduce((s, i) => s + i.count, 0) || 1;
  const palette = ['#6d4aff','#8a6dff','#a37cd9','#b88cff','#9060e0','#7c5cd4','#c4a8f0','#d4befd'];

  // Simple squarified layout: row by row
  const W = 540; const H = 200;
  let remaining = [...shown.map((item, i) => ({ ...item, color: palette[i % palette.length] }))];
  const rects: { x: number; y: number; w: number; h: number; label: string; count: number; color: string }[] = [];

  let x = 0; let y = 0; let rowH = 0;
  let rowW = W;

  while (remaining.length > 0) {
    const rowTotal = remaining.reduce((s, i) => s + i.count, 0);
    let rowItems: typeof remaining = [];
    let rowUsed = 0;

    for (const item of remaining) {
      rowItems.push(item);
      rowUsed += item.count;
      const aspect = ((rowUsed / rowTotal) * rowW) / ((rowUsed / rowTotal) > 0 ? (rowUsed / rowTotal) : 1);
      if (rowItems.length >= 4 || aspect > 2) break;
    }

    rowH = Math.max(30, Math.round((rowUsed / total) * H));
    let rx = x;
    for (const item of rowItems) {
      const rw = Math.round((item.count / rowUsed) * rowW);
      rects.push({ x: rx, y, w: rw, h: rowH, label: item.label, count: item.count, color: item.color });
      rx += rw;
    }
    y += rowH;
    remaining = remaining.slice(rowItems.length);
    if (y >= H) break;
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #ece9f0', borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 6px rgba(109,74,255,0.06)' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#8b8499', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 16 }}>{title}</div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', borderRadius: 10, overflow: 'hidden' }}>
        {rects.map((r, i) => (
          <g key={i}>
            <rect x={r.x + 1} y={r.y + 1} width={Math.max(r.w - 2, 0)} height={Math.max(r.h - 2, 0)}
              fill={r.color} fillOpacity="0.85" rx="4" />
            {r.w > 50 && r.h > 22 && (
              <text x={r.x + r.w / 2} y={r.y + r.h / 2 - 4} textAnchor="middle" fontSize="9" fontWeight="600" fill="#fff" style={{ pointerEvents: 'none' }}>
                {r.label.length > 12 ? r.label.slice(0, 10) + '…' : r.label}
              </text>
            )}
            {r.w > 50 && r.h > 34 && (
              <text x={r.x + r.w / 2} y={r.y + r.h / 2 + 9} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.7)" style={{ pointerEvents: 'none' }}>
                {fmtK(r.count)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};

// ─── Exp × CTC Heatmap ────────────────────────────────────────────────────────
const HeatMap: FC<{ data: { exp: string; ctc: string; count: number }[] }> = ({ data }) => {
  const maxVal = Math.max(...data.map(d => d.count), 1);
  const cellVal = (exp: string, ctc: string) => data.find(d => d.exp === exp && d.ctc === ctc)?.count ?? 0;
  const heatColor = (v: number) => {
    if (v === 0) return '#f5f3f7';
    const t = Math.sqrt(v / maxVal); // sqrt for better visual spread
    const r = Math.round(109 + (200 - 109) * (1 - t)); // 6d4aff → c8a0ff range
    const g = Math.round(74  + (160 - 74)  * (1 - t));
    const b = Math.round(255 + (255 - 255) * (1 - t));
    return `rgba(${r},${g},${b},${0.2 + t * 0.8})`;
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #ece9f0', borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 6px rgba(109,74,255,0.06)' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#8b8499', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>Experience × CTC Heatmap</div>
      <div style={{ fontSize: 11, color: '#8b8499', marginBottom: 16 }}>Darker = more candidates. Click cell to filter.</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 3, tableLayout: 'fixed', minWidth: 440 }}>
          <thead>
            <tr>
              <td style={{ width: 60 }} />
              {CTC_ORDER.map(c => (
                <th key={c} style={{ fontSize: 9, color: '#8b8499', fontWeight: 500, textAlign: 'center', padding: '0 0 6px', letterSpacing: '.04em' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EXP_ORDER.map(exp => (
              <tr key={exp}>
                <td style={{ fontSize: 10, color: '#4a4458', fontWeight: 500, paddingRight: 8, whiteSpace: 'nowrap' }}>{exp}</td>
                {CTC_ORDER.map(ctc => {
                  const v = cellVal(exp, ctc);
                  return (
                    <td key={ctc} title={`${exp} × ${ctc}: ${v} candidates`}
                      style={{ width: 56, height: 36, textAlign: 'center', background: heatColor(v), borderRadius: 6, fontSize: 9, fontWeight: v > 0 ? 600 : 400, color: v > maxVal * 0.4 ? '#fff' : '#4a4458', cursor: v > 0 ? 'pointer' : 'default', transition: 'opacity .15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLTableCellElement).style.outline = `2px solid ${ACCENT}`; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLTableCellElement).style.outline = 'none'; }}
                    >
                      {v > 0 ? fmtK(v) : ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
        <span style={{ fontSize: 9, color: '#8b8499' }}>Fewer</span>
        <div style={{ display: 'flex', gap: 2 }}>
          {[0.1, 0.25, 0.45, 0.65, 0.85, 1.0].map((t, i) => (
            <div key={i} style={{ width: 18, height: 10, borderRadius: 2, background: heatColor(Math.round(t * maxVal)) }} />
          ))}
        </div>
        <span style={{ fontSize: 9, color: '#8b8499' }}>More</span>
      </div>
    </div>
  );
};

// ─── Geo Map (India + world dots) ─────────────────────────────────────────────
const GeoMap: FC<{ items: { label: string; count: number }[] }> = ({ items }) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const total = items.reduce((s, i) => s + i.count, 0) || 1;
  // Approximate SVG positions for Indian cities + world
  const cityCoords: Record<string, [number, number]> = {
    'Bangalore': [252, 285], 'Bengaluru': [252, 285],
    'Hyderabad': [250, 260], 'Chennai': [262, 288],
    'Mumbai': [218, 245], 'Pune': [222, 250],
    'Delhi': [234, 195], 'Gurgaon': [233, 196],
    'Noida': [235, 197], 'Kolkata': [278, 222],
    'Ahmedabad': [210, 228], 'Coimbatore': [245, 295],
    'Kochi': [240, 308], 'Jaipur': [226, 205],
    'Lucknow': [254, 205], 'Bhopal': [237, 222],
    'Chandigarh': [229, 182], 'Nagpur': [248, 238],
    'Indore': [228, 228], 'Surat': [214, 236],
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #ece9f0', borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 6px rgba(109,74,255,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#8b8499', textTransform: 'uppercase', letterSpacing: '.08em' }}>Geographic Distribution</div>
          <div style={{ fontSize: 11, color: '#8b8499', marginTop: 2 }}>Top locations by candidate count</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 16, alignItems: 'start' }}>
        {/* SVG Map */}
        <div style={{ position: 'relative', background: '#faf9fb', borderRadius: 12, overflow: 'hidden', border: '1px solid #ece9f0' }}>
          <svg viewBox="180 160 120 180" width="100%" style={{ display: 'block' }}>
            {/* India outline (simplified polygon) */}
            <polygon
              points="194,175 210,170 228,165 240,167 254,165 266,168 278,175 282,188 280,200 278,215 272,225 268,240 264,255 260,270 255,285 248,300 240,315 232,310 220,300 210,285 204,270 198,255 194,240 190,225 190,210 192,195 194,175"
              fill="#f0edf5" stroke="#d4c8e8" strokeWidth="1.5" />
            {/* Dots */}
            {items.map((item, i) => {
              const coords = cityCoords[item.label];
              if (!coords) return null;
              const [cx, cy] = coords;
              const r = Math.max(3, Math.min(14, 4 + (item.count / total) * 60));
              const isHov = hovered === item.label;
              return (
                <g key={i}
                  onMouseEnter={() => setHovered(item.label)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: 'pointer' }}>
                  <circle cx={cx} cy={cy} r={r + 3} fill={ACCENT} fillOpacity={isHov ? 0.15 : 0} />
                  <circle cx={cx} cy={cy} r={r} fill={ACCENT} fillOpacity={isHov ? 0.9 : 0.65} stroke="#fff" strokeWidth="1.2" />
                  {r > 7 && (
                    <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize="6" fontWeight="700" fill="#fff">{fmtK(item.count)}</text>
                  )}
                  {isHov && (
                    <text x={cx} y={cy - r - 4} textAnchor="middle" fontSize="7" fontWeight="600" fill="#1a1722">
                      {item.label} · {fmtK(item.count)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
        {/* Ranked sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.slice(0, 8).map((item, i) => (
            <div key={i}
              onMouseEnter={() => setHovered(item.label)}
              onMouseLeave={() => setHovered(null)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'default', opacity: hovered && hovered !== item.label ? 0.5 : 1, transition: 'opacity .15s' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#c4c0cc', width: 14, textAlign: 'right' }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: '#3a3540', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</div>
                <div style={{ height: 3, background: '#f0edf5', borderRadius: 2, marginTop: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(item.count / (items[0]?.count || 1)) * 100}%`, background: ACCENT, borderRadius: 2 }} />
                </div>
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#8b8499', flexShrink: 0 }}>{fmtK(item.count)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Source Breakdown ─────────────────────────────────────────────────────────
const SourceBars: FC<{ items: { label: string; count: number }[] }> = ({ items }) => {
  const total = items.reduce((s, i) => s + i.count, 0) || 1;
  const colors = [ACCENT, ACCENT2, ACCENT3, '#2563EB', '#D85A30', '#8b8499'];
  return (
    <div style={{ background: '#fff', border: '1px solid #ece9f0', borderRadius: 16, padding: '22px 24px', boxShadow: '0 1px 6px rgba(109,74,255,0.06)' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#8b8499', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 18 }}>Source Platform</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {items.map((item, i) => {
          const pct = Math.round((item.count / total) * 100);
          return (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: '#3a3540', fontWeight: 500 }}>{item.label || 'Unknown'}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#8b8499' }}>{fmtK(item.count)} · {pct}%</span>
              </div>
              <div style={{ height: 6, background: '#f5f3f7', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: colors[i % colors.length], borderRadius: 4, transition: 'width .6s ease' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Analytics Skeleton ───────────────────────────────────────────────────────
const AnalyticsSkeleton: FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
      {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
    </div>
    <Skeleton className="h-48 rounded-2xl" />
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {[1,2,3,4].map(i => <Skeleton key={i} className="h-72 rounded-2xl" />)}
    </div>
  </div>
);



// ══════════════════════════════════════════════════════════════════════════════
// TABLE COMPONENTS (from original, refactored)
// ══════════════════════════════════════════════════════════════════════════════

const MultiSuggestDrop: FC<{
  placeholder: string; values: string[]; onChange: (vals: string[]) => void;
  options: string[]; icon?: React.ReactNode; isLoading?: boolean;
}> = ({ placeholder, values, onChange, options, icon, isLoading }) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => {
    const lq = q.toLowerCase();
    const all = options.filter(o => o.toLowerCase().includes(lq)).slice(0, 30);
    if (q.trim() && !options.find(o => o.toLowerCase() === lq)) all.unshift(`Use: "${q.trim()}"`);
    return all;
  }, [options, q]);
  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);
  const toggle = (opt: string) => {
    const actual = opt.startsWith('Use: "') ? opt.slice(6, -1) : opt;
    onChange(values.includes(actual) ? values.filter(v => v !== actual) : [...values, actual]);
    setQ('');
  };
  const active = values.length > 0;
  const label = active ? (values.length === 1 ? values[0].slice(0, 14) : `${values[0].slice(0, 10)}…+${values.length - 1}`) : placeholder;
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 9px', height: 30, borderRadius: 7, border: `0.5px solid ${active ? ACCENT : '#D1D5DB'}`, background: active ? '#EDE9FE' : '#F9FAFB', cursor: 'pointer', minWidth: 88, maxWidth: 160 }}>
        {icon && <span style={{ color: active ? ACCENT : '#9CA3AF', flexShrink: 0, display: 'flex' }}>{icon}</span>}
        <span style={{ fontSize: 11, color: active ? '#5B21B6' : '#6B7280', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        {active
          ? <button onClick={e => { e.stopPropagation(); onChange([]); setQ(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: ACCENT, display: 'flex', flexShrink: 0 }}><X size={10} /></button>
          : <ChevronDown size={10} style={{ color: '#9CA3AF', flexShrink: 0 }} />}
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 300, marginTop: 3, width: 230, background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: 9, boxShadow: '0 8px 24px rgba(0,0,0,0.14)', overflow: 'hidden' }}>
          <div style={{ padding: '7px 9px', borderBottom: '0.5px solid #F3F4F6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F9FAFB', borderRadius: 6, padding: '4px 7px' }}>
              <Search size={11} style={{ color: '#9CA3AF', flexShrink: 0 }} />
              <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search or type to add…"
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 11, color: '#111827', width: '100%' }}
                onKeyDown={e => { if (e.key === 'Enter' && q.trim()) toggle(`Use: "${q.trim()}"`); }} />
            </div>
          </div>
          {values.length > 0 && (
            <div style={{ padding: '6px 9px', borderBottom: '0.5px solid #F3F4F6', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {values.map(v => (
                <span key={v} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 8, background: '#EDE9FE', color: '#5B21B6', display: 'flex', alignItems: 'center', gap: 3 }}>
                  {v.length > 16 ? v.slice(0, 14) + '...' : v}
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
                      style={{ padding: '7px 11px', fontSize: 11, color: freeText ? ACCENT : '#374151', cursor: 'pointer', background: sel ? '#EDE9FE' : 'transparent', display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 13, height: 13, borderRadius: 3, border: `1.5px solid ${sel ? ACCENT : '#D1D5DB'}`, background: sel ? ACCENT : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {sel && <span style={{ fontSize: 9, color: '#fff', lineHeight: 1 }}>✓</span>}
                      </div>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: freeText ? 'italic' : 'normal' }}>{opt}</span>
                    </div>
                  );
                })
            }
          </div>
        </div>
      )}
    </div>
  );
};

const Chip: FC<{ label: string; bg: string; col: string; onClear: () => void }> = ({ label, bg, col, onClear }) => (
  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: bg, color: col, display: 'flex', alignItems: 'center', gap: 4 }}>
    {label}<X size={9} style={{ cursor: 'pointer' }} onClick={onClear} />
  </span>
);

const noticeBadge = (n: string | null) => {
  if (!n) return null;
  const lo = n.toLowerCase();
  const imm = lo.includes('immediate') || lo.includes('0 day');
  const sht = lo.includes('15') || lo.includes('30');
  const [bg, col] = imm ? ['#D1FAE5', '#065F46'] : sht ? ['#FEF3C7', '#92400E'] : ['#DBEAFE', '#1E40AF'];
  return <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 8, background: bg, color: col, whiteSpace: 'nowrap', flexShrink: 0 }}>{n.length > 14 ? n.slice(0, 12) + '…' : n}</span>;
};

// ── Job Picker Modal (unchanged from original) ────────────────────────────────
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
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: `linear-gradient(135deg,${ACCENT},#9B59F5)` }}>
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
                style={{ width: '100%', padding: '10px 14px', border: 'none', background: '#fff', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #F9FAFB', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Briefcase size={12} color={ACCENT} /></div>
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

// ── Table Tab Component ───────────────────────────────────────────────────────
const TableTab: FC<{
  organizationId: string; role: string; user: { id: string; organization_id: string } | null;
}> = ({ organizationId, role, user }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm]         = useState<string>(searchParams.get('search') || '');
  const [currentPage, setCurrentPage]       = useState<number>(parseInt(searchParams.get('page') || '1', 10));
  const [itemsPerPage, setItemsPerPage]     = useState<number>(parseInt(searchParams.get('limit') || '20', 10));
  const [filterCreator, setFilterCreator]   = useState<string>('all');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);

  const [selectedJob, setSelectedJob]         = useState<Job | null>(null);
  const [isJobPopoverOpen, setJobPopoverOpen] = useState(false);
  const [jobSearchTerm, setJobSearchTerm]     = useState('');
  const [debouncedJobSearchTerm] = useDebounce(jobSearchTerm, 500);

  const [isAddModalOpen, setAddModalOpen]               = useState(false);
  const [isWishlistModalOpen, setIsWishlistModalOpen]   = useState(false);
  const [isMatchModalOpen, setMatchModalOpen]           = useState(false);
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

  // Team members
const { data: teamMembers } = useQuery({
  queryKey: ['teamMembers', organizationId],
  queryFn: async () => {
    if (!organizationId) return [];

    // 1. get all unique created_by user IDs from the talent pool
    const { data: creators } = await supabase
      .from('hr_talent_pool')
      .select('created_by')
      .eq('organization_id', organizationId)
      .not('created_by', 'is', null);

    if (!creators || creators.length === 0) return [];

    const userIds = [...new Set(creators.map(c => c.created_by))];

    // 2. fetch employee details only for those who have added candidates
    const { data: employees } = await supabase
      .from('hr_employees')
      .select('user_id, first_name, last_name')
      .in('user_id', userIds)
      .eq('organization_id', organizationId);

    return employees || [];
  },
  enabled: !!organizationId && role !== 'employee',
  staleTime: 5 * 60 * 1000,
});

  // Main candidates
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['talentPoolCandidates', role, user?.id, currentPage, itemsPerPage, debouncedSearchTerm, filterCreator, filterExp, filterNotice, filterSource, filterLocations, filterTitles, filterSkills, filterResume],
    queryFn: async () => {
      const from = (currentPage - 1) * itemsPerPage;
      const to   = from + itemsPerPage - 1;
      let q = supabase.from('hr_talent_pool')
        .select(`id,candidate_name,email,phone,suggested_title,created_at,current_salary,current_location,total_experience,current_company,current_designation,notice_period,highest_education,work_experience,created_by:hr_employees!hr_talent_pool_created_by_fkey(first_name,last_name),parsed_experience_years,parsed_current_ctc,source_platform,top_skills,top_skills_lower,resume_text,resume_path`, { count: 'exact' });
      if (organizationId) q = q.eq('organization_id', organizationId);
if (user?.id) {
  if (filterCreator === 'my')
    q = q.eq('created_by', user.id);
  else if (filterCreator !== 'all')
    q = q.eq('created_by', filterCreator);
}
      if (debouncedSearchTerm) { const s = `%${debouncedSearchTerm}%`; q = q.or(`candidate_name.ilike.${s},email.ilike.${s},phone.ilike.${s}`); }
      if (filterExp === 'fresher') q = q.or('total_experience.ilike.%Fresher%,parsed_experience_years.eq.0');
      else if (filterExp === '1-3') q = q.gte('parsed_experience_years', 1).lte('parsed_experience_years', 3);
      else if (filterExp === '3-5') q = q.gte('parsed_experience_years', 3).lte('parsed_experience_years', 5);
      else if (filterExp === '5-10') q = q.gte('parsed_experience_years', 5).lte('parsed_experience_years', 10);
      else if (filterExp === '10+') q = q.gte('parsed_experience_years', 10);
      if (filterNotice.length > 0) q = q.or(filterNotice.map(n => `notice_period.ilike.%${n}%`).join(','));
      if (filterSource !== 'all') q = q.ilike('source_platform', `%${filterSource}%`);
      if (filterLocations.length > 0) q = q.or(filterLocations.map(l => `current_location.ilike.%${l}%`).join(','));
      if (filterTitles.length > 0) q = q.or(filterTitles.flatMap(t => [`suggested_title.ilike.%${t}%`, `current_designation.ilike.%${t}%`]).join(','));
      if (filterSkills.length > 0) filterSkills.forEach(sk => { q = q.contains('top_skills_lower', JSON.stringify([sk.toLowerCase()])); });
      if (filterResume === 'with') q = q.not('resume_path', 'is', null);
      else if (filterResume === 'without') q = q.is('resume_path', null);
      q = q.range(from, to).order('created_at', { ascending: false });
      const { data: d, error, count } = await q;
      if (error) throw new Error(error.message);
      return { candidates: d as TalentPoolCandidate[], totalCount: count ?? 0 };
    },
    enabled: !!user && !!organizationId,
  });

  // Jobs for matching
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

  // Lazy filter options — from the analytics cache (no extra fetch)
  const { data: filterOpts } = useQuery({
    queryKey: ['tp_filter_opts', organizationId],
    queryFn: async () => {
      const [tR, sR, lR] = await Promise.all([
        supabase.from('hr_talent_pool').select('suggested_title,current_designation').eq('organization_id', organizationId).not('suggested_title', 'is', null).limit(5000),
        supabase.from('hr_talent_pool').select('top_skills_lower').eq('organization_id', organizationId).not('top_skills_lower', 'is', null).limit(5000),
        supabase.from('hr_talent_pool').select('current_location').eq('organization_id', organizationId).not('current_location', 'is', null).limit(5000),
      ]);
      const titles  = new Set<string>(); tR.data?.forEach(r => { if (r.suggested_title?.trim()) titles.add(r.suggested_title.trim()); if (r.current_designation?.trim()) titles.add(r.current_designation.trim()); });
      const skills  = new Map<string, number>(); sR.data?.forEach(r => { parseSk(r.top_skills_lower).forEach(s => { const k = String(s).trim(); if (k) skills.set(k, (skills.get(k)||0)+1); }); });
      const locs    = new Set<string>(); lR.data?.forEach(r => { const c = r.current_location?.trim().split(/[,\-\/]/)[0].trim(); if (c && c.length > 1) locs.add(c); });
      return {
        titleOpts: [...titles].sort().slice(0, 100),
        skillOpts: [...skills.entries()].sort((a,b)=>b[1]-a[1]).map(([k])=>k).slice(0, 100),
        locOpts:   [...locs].sort().slice(0, 80),
      };
    },
    enabled: !!organizationId,
    staleTime: 10 * 60 * 1000,
  });

  const paginatedCandidates = data?.candidates ?? [];
  const totalCandidates     = data?.totalCount ?? 0;
  const totalPages          = Math.ceil(totalCandidates / itemsPerPage);

  const handleCandidateAdded     = () => { refetch(); setAddModalOpen(false); };
  const handleItemsPerPageChange = (v: string) => { setItemsPerPage(parseInt(v, 10)); setCurrentPage(1); };
  const toggleSelect = (id: string) => setSelectedIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll    = () => { selectedIds.size === paginatedCandidates.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(paginatedCandidates.map(c => c.id))); };
  const handleSingleInvite      = (c: TalentPoolCandidate) => { setSingleInviteCandidate(c); setSingleInviteJob(null); setShowSingleJobPicker(true); };
  const handleBulkInvite        = () => { if (!selectedIds.size) return; setBulkInviteJob(null); setShowBulkJobPicker(true); };
  const handleBulkJobSelected   = (j: Job) => { setBulkInviteJob(j); setShowBulkJobPicker(false); setShowBulkModal(true); };
  const bulkCandidates: BulkInviteCandidate[] = paginatedCandidates.filter(c => selectedIds.has(c.id)).map(c => ({ id: c.id, name: c.candidate_name, email: c.email, phone: c.phone, candidateId: null, candidateOwnerId: user?.id || '' }));
  const hasFilters = filterExp !== 'all' || filterNotice.length > 0 || filterSource !== 'all' || filterLocations.length > 0 || filterTitles.length > 0 || filterSkills.length > 0 || filterResume !== 'all' || filterCreator !== 'all';
  const clearAll   = () => { setFilterExp('all'); setFilterNotice([]); setFilterSource('all'); setFilterLocations([]); setFilterTitles([]); setFilterSkills([]); setFilterResume('all'); setFilterCreator('all'); setCurrentPage(1); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Add + Shortlist + Match Job bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 12, color: '#6B7280' }}>
            {isLoading ? 'Loading…' : `${totalCandidates.toLocaleString()} candidates`}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          <Button variant="outline" size="sm" onClick={() => setIsWishlistModalOpen(true)} style={{ height: 30, fontSize: 11, borderRadius: 8, gap: 5 }}>
            <Bookmark size={12} />Shortlist
          </Button>
          <button onClick={() => setAddModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 10, paddingRight: 14, height: 30, borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 700, background: `linear-gradient(135deg,#6D28D9,${ACCENT})`, border: 'none', cursor: 'pointer', boxShadow: `0 2px 8px ${ACCENT}40` }}>
            <UserPlus size={13} />Add Candidate
          </button>
          <YohrCsvUploadButton />
          
          
        </div>
      </div>

      {/* Batch Jobs Panel */}
      {/* <BatchJobsPanel organizationId={organizationId} /> */}

      {/* Filter Bar */}
      <div style={{ background: '#FFFFFF', border: '0.5px solid #E5E7EB', borderRadius: 12, padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', height: 32, borderRadius: 8, border: '0.5px solid #D1D5DB', background: '#F9FAFB' }}>
            <Search size={12} style={{ color: '#9CA3AF', flexShrink: 0 }} />
            <input placeholder="Search name, email, phone…" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, color: '#111827', width: '100%' }} />
            {searchTerm && <button onClick={() => { setSearchTerm(''); setCurrentPage(1); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', padding: 0, flexShrink: 0 }}><X size={12} /></button>}
          </div>
          <Popover open={isJobPopoverOpen} onOpenChange={setJobPopoverOpen}>
            <PopoverTrigger asChild>
              <button style={{ height: 32, padding: '0 14px', borderRadius: 8, background: `linear-gradient(135deg,${ACCENT},#A855F7)`, border: 'none', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <Sparkles size={12} /> Match Job
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-3 rounded-xl shadow-xl border-none mt-1" align="end">
              <Command shouldFilter={false}>
                <CommandInput placeholder="Search jobs…" value={jobSearchTerm} onValueChange={setJobSearchTerm} className="h-8 text-xs" />
                <CommandList className="mt-2 max-h-[240px]">
                  <CommandEmpty>{isLoadingJobs ? 'Loading…' : 'No jobs found.'}</CommandEmpty>
                  <CommandGroup>{jobs?.map(j => (<CommandItem key={j.id} value={j.title} onSelect={() => { setSelectedJob(j); setJobPopoverOpen(false); setMatchModalOpen(true); }} className="text-xs py-2 cursor-pointer">{j.title}<ChevronRight size={12} className="ml-auto text-purple-400" /></CommandItem>))}</CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {hasFilters && <button onClick={clearAll} style={{ height: 32, padding: '0 11px', borderRadius: 8, background: '#FEE2E2', border: '0.5px solid #FECACA', color: '#DC2626', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}><X size={11} />Clear</button>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Select value={filterCreator} onValueChange={v => { setFilterCreator(v); setCurrentPage(1); }}>
            <SelectTrigger style={{ height: 30, fontSize: 11, borderRadius: 7, minWidth: 105, maxWidth: 140, border: filterCreator !== 'all' ? `0.5px solid ${ACCENT}` : '0.5px solid #D1D5DB', background: filterCreator !== 'all' ? '#EDE9FE' : '#F9FAFB', color: filterCreator !== 'all' ? '#5B21B6' : '#6B7280' }}>
              <SelectValue placeholder="All team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Candidates</SelectItem>
              <SelectItem value="my" className="text-xs">My Candidates</SelectItem>
              {role !== 'employee' && teamMembers?.map((m: any) => (<SelectItem key={m.user_id} value={m.user_id} className="text-xs">{m.first_name} {m.last_name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filterExp} onValueChange={v => { setFilterExp(v); setCurrentPage(1); }}>
            <SelectTrigger style={{ height: 30, fontSize: 11, borderRadius: 7, minWidth: 96, maxWidth: 130, border: filterExp !== 'all' ? `0.5px solid ${ACCENT}` : '0.5px solid #D1D5DB', background: filterExp !== 'all' ? '#EDE9FE' : '#F9FAFB', color: filterExp !== 'all' ? '#5B21B6' : '#6B7280' }}>
              <SelectValue placeholder="Experience" />
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
          <MultiSuggestDrop placeholder="Notice" values={filterNotice} onChange={v => { setFilterNotice(v); setCurrentPage(1); }} options={filterOpts?.locOpts || []} icon={<ChevronDown size={11} />} />
          <Select value={filterSource} onValueChange={v => { setFilterSource(v); setCurrentPage(1); }}>
            <SelectTrigger style={{ height: 30, fontSize: 11, borderRadius: 7, minWidth: 85, maxWidth: 115, border: filterSource !== 'all' ? `0.5px solid ${ACCENT}` : '0.5px solid #D1D5DB', background: filterSource !== 'all' ? '#EDE9FE' : '#F9FAFB', color: filterSource !== 'all' ? '#5B21B6' : '#6B7280' }}>
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Sources</SelectItem>
              <SelectItem value="naukri" className="text-xs">Naukri</SelectItem>
              <SelectItem value="invite" className="text-xs">Invite</SelectItem>
              <SelectItem value="candidate_search" className="text-xs">People Search</SelectItem>
              <SelectItem value="migration" className="text-xs">Migration</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterResume} onValueChange={v => { setFilterResume(v); setCurrentPage(1); }}>
            <SelectTrigger style={{ height: 30, fontSize: 11, borderRadius: 7, minWidth: 88, maxWidth: 118, border: filterResume !== 'all' ? `0.5px solid ${ACCENT}` : '0.5px solid #D1D5DB', background: filterResume !== 'all' ? '#EDE9FE' : '#F9FAFB', color: filterResume !== 'all' ? '#5B21B6' : '#6B7280' }}>
              <SelectValue placeholder="Resume" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All</SelectItem>
              <SelectItem value="with" className="text-xs">With Resume</SelectItem>
              <SelectItem value="without" className="text-xs">Without Resume</SelectItem>
            </SelectContent>
          </Select>
          <MultiSuggestDrop placeholder="Title" values={filterTitles} onChange={v => { setFilterTitles(v); setCurrentPage(1); }} options={filterOpts?.titleOpts || []} icon={<Briefcase size={11} />} />
          <MultiSuggestDrop placeholder="Skill" values={filterSkills} onChange={v => { setFilterSkills(v); setCurrentPage(1); }} options={filterOpts?.skillOpts || []} icon={<Sparkles size={11} />} />
          <MultiSuggestDrop placeholder="Location" values={filterLocations} onChange={v => { setFilterLocations(v); setCurrentPage(1); }} options={filterOpts?.locOpts || []} icon={<MapPin size={11} />} />
        </div>

        {hasFilters && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', paddingTop: 6, borderTop: '0.5px solid #F3F4F6' }}>
            {filterCreator !== 'all' && <Chip label="Team filter" bg="#EDE9FE" col="#5B21B6" onClear={() => { setFilterCreator('all'); setCurrentPage(1); }} />}
            {filterExp !== 'all' && <Chip label={filterExp === 'fresher' ? 'Fresher' : filterExp + ' yrs'} bg="#DBEAFE" col="#1D4ED8" onClear={() => { setFilterExp('all'); setCurrentPage(1); }} />}
            {filterNotice.map(n => <Chip key={n} label={n.slice(0, 20)} bg="#FEF3C7" col="#92400E" onClear={() => { setFilterNotice(filterNotice.filter(x => x !== n)); setCurrentPage(1); }} />)}
            {filterSource !== 'all' && <Chip label={filterSource} bg="#FEE2E2" col="#991B1B" onClear={() => { setFilterSource('all'); setCurrentPage(1); }} />}
            {filterResume !== 'all' && <Chip label={filterResume === 'with' ? 'With resume' : 'No resume'} bg="#D1FAE5" col="#065F46" onClear={() => { setFilterResume('all'); setCurrentPage(1); }} />}
            {filterTitles.map(t => <Chip key={t} label={t.slice(0, 20)} bg="#EDE9FE" col="#5B21B6" onClear={() => { setFilterTitles(filterTitles.filter(x => x !== t)); setCurrentPage(1); }} />)}
            {filterSkills.map(s => <Chip key={s} label={s.slice(0, 20)} bg="#DBEAFE" col="#1D4ED8" onClear={() => { setFilterSkills(filterSkills.filter(x => x !== s)); setCurrentPage(1); }} />)}
            {filterLocations.map(l => <Chip key={l} label={l.slice(0, 20)} bg="#FEF9C3" col="#854D0E" onClear={() => { setFilterLocations(filterLocations.filter(x => x !== l)); setCurrentPage(1); }} />)}
          </div>
        )}
      </div>

      {/* Bulk bar */}
      {selectedIds.size > 0 && (
        <div style={{ background: '#EDE9FE', border: '0.5px solid #C4B5FD', borderRadius: 10, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <CheckSquare size={13} style={{ color: ACCENT, flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#5B21B6' }}>{selectedIds.size} selected</span>
          <button onClick={handleBulkInvite} style={{ height: 27, padding: '0 11px', borderRadius: 7, background: ACCENT, border: 'none', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Bulk Invite</button>
          <button onClick={() => setSelectedIds(new Set())} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 11, color: ACCENT, cursor: 'pointer' }}>Clear</button>
        </div>
      )}

      {/* Table */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 7 }}>
          Candidates ({totalCandidates.toLocaleString()})
        </div>

        {isLoading ? (
          <div style={{ background: '#FFF', borderRadius: 12, border: '0.5px solid #E5E7EB', overflow: 'hidden' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '0.5px solid #F3F4F6' }}>
                <Skeleton className="h-8 w-8 rounded-full" /><div style={{ flex: 1 }}><Skeleton className="h-3 w-32 mb-1" /><Skeleton className="h-2 w-20" /></div>
                <Skeleton className="h-5 w-16" /><Skeleton className="h-5 w-12" />
              </div>
            ))}
          </div>
        ) : !paginatedCandidates.length ? (
          <div style={{ background: '#FFF', borderRadius: 12, border: '0.5px solid #E5E7EB', padding: 40, textAlign: 'center' }}>
            <Users size={30} style={{ color: '#D1D5DB', margin: '0 auto 8px' }} />
            <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>No candidates found.{searchTerm && ' Try adjusting your search.'}</p>
          </div>
        ) : (
          <div style={{ background: '#FFF', borderRadius: 12, border: '0.5px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
                <thead>
                  <tr style={{ background: `linear-gradient(135deg,#6D28D9,${ACCENT})` }}>
                    <th style={{ width: 32, padding: '9px 8px 9px 12px' }}>
                      <input type="checkbox" checked={selectedIds.size === paginatedCandidates.length && paginatedCandidates.length > 0} onChange={toggleAll} style={{ width: 12, height: 12, accentColor: '#fff', cursor: 'pointer' }} />
                    </th>
                    {['Candidate', 'Skills', 'Exp', 'CTC', 'Notice', 'Location', 'Added', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '9px 8px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '.5px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedCandidates.map((c, idx) => {
                    const ps = calcProfile(c);
                    const isSelected = selectedIds.has(c.id);
                    const allSkills = parseSk(c.top_skills_lower || c.top_skills);
                    const shownSkills = allSkills.slice(0, 2);
                    const extraSkills = allSkills.slice(2);
                    const initials = c.created_by ? `${c.created_by.first_name?.charAt(0) || ''}${c.created_by.last_name?.charAt(0) || ''}`.toUpperCase() : '';
                    const rc = ps.percentage === 100 ? '#10B981' : ps.percentage >= 50 ? '#F59E0B' : '#EF4444';
                    const rcBg = ps.percentage === 100 ? '#ECFDF5' : ps.percentage >= 50 ? '#FFFBEB' : '#FEF2F2';
                    const circ2 = 2 * Math.PI * 17;
                    const hasResume = !!(c.resume_path || (c.resume_text && c.resume_text.trim().length > 20));

                    return (
                      <tr key={c.id}
                        style={{ background: isSelected ? '#F5F3FF' : idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA', borderBottom: '0.5px solid #F3F4F6', transition: 'background .12s' }}
                        onMouseEnter={e => { if (!isSelected)(e.currentTarget as HTMLTableRowElement).style.background = '#F0EEFF'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = isSelected ? '#F5F3FF' : idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA'; }}>
                        <td style={{ padding: '7px 4px 7px 12px', width: 32 }}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(c.id)} style={{ width: 12, height: 12, accentColor: ACCENT, cursor: 'pointer' }} />
                        </td>
                        <td style={{ padding: '7px 8px', minWidth: 185, maxWidth: 225 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div style={{ position: 'relative', flexShrink: 0, cursor: 'default', width: 38, height: 38 }}>
                                  <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: rcBg, border: `2px solid ${rc}` }} />
                                  <div style={{ position: 'absolute', inset: 4, borderRadius: '50%', background: `linear-gradient(135deg,${ACCENT},#4F46E5)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                                    {c.candidate_name?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
                                  <svg width="38" height="38" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
                                    <circle cx="19" cy="19" r="17" fill="none" stroke={rc} strokeWidth="3"
                                      strokeDasharray={`${circ2 * ps.percentage / 100} ${circ2 - (circ2 * ps.percentage / 100)}`}
                                      strokeDashoffset={circ2 / 4} strokeLinecap="round" />
                                  </svg>
                                  <div style={{ position: 'absolute', bottom: -4, right: -4, minWidth: 17, height: 17, borderRadius: 9, background: rc, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', fontSize: 7, fontWeight: 700, color: '#fff', padding: '0 2px' }}>
                                    {ps.percentage}%
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                <div style={{ maxWidth: 180 }}>
                                  <p style={{ fontWeight: 600, fontSize: 11, marginBottom: 4 }}>Profile {ps.percentage}% complete</p>
                                  {ps.missingFields.length > 0 && <><p style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 3 }}>Missing:</p><ul style={{ fontSize: 10, paddingLeft: 14, margin: 0 }}>{ps.missingFields.map(f => <li key={f}>{f}</li>)}</ul></>}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Link to={`/talent-pool/${c.id}`} style={{ fontSize: 11, fontWeight: 600, color: '#6D28D9', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none', maxWidth: 130 }}>
                                  {c.candidate_name || 'N/A'}
                                </Link>
                                {hasResume && <Tooltip><TooltipTrigger asChild>
                                  <span style={{ width: 14, height: 14, borderRadius: 3, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <FileText size={8} style={{ color: '#059669' }} />
                                  </span>
                                </TooltipTrigger><TooltipContent>Has resume</TooltipContent></Tooltip>}
                              </div>
                              <span style={{ fontSize: 9, color: '#9CA3AF', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {c.suggested_title || c.current_designation || c.current_company || '—'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '7px 8px', minWidth: 115 }}>
                          <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'nowrap' }}>
                            {allSkills.length === 0
                              ? <span style={{ fontSize: 10, color: '#D1D5DB' }}>—</span>
                              : <>
                                  {shownSkills.map((s, i) => (<span key={i} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 8, background: '#EDE9FE', color: '#5B21B6', whiteSpace: 'nowrap', maxWidth: 78, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }}>{s}</span>))}
                                  {extraSkills.length > 0 && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 8, background: '#F3F4F6', color: '#6B7280', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, border: '0.5px solid #E5E7EB' }}>+{extraSkills.length}</span>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom">
                                        <div style={{ maxWidth: 220 }}>
                                          <p style={{ fontSize: 10, fontWeight: 600, marginBottom: 5 }}>All {allSkills.length} skills</p>
                                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                            {allSkills.map((s, i) => (<span key={i} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 6, background: '#EDE9FE', color: '#5B21B6' }}>{s}</span>))}
                                          </div>
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </>
                            }
                          </div>
                        </td>
                        <td style={{ padding: '7px 8px', whiteSpace: 'nowrap' }}>
                          {c.parsed_experience_years != null && c.parsed_experience_years >= 0
                            ? <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: '#DBEAFE', color: '#1D4ED8' }}>{c.parsed_experience_years}y</span>
                            : c.total_experience ? <span style={{ fontSize: 9, color: '#6B7280' }}>{String(c.total_experience).slice(0, 14)}</span>
                            : <span style={{ fontSize: 10, color: '#D1D5DB' }}>—</span>}
                        </td>
                        <td style={{ padding: '7px 8px', whiteSpace: 'nowrap' }}>
                          {c.parsed_current_ctc
                            ? <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: '#D1FAE5', color: '#065F46' }}>{fmtL(Number(c.parsed_current_ctc))}</span>
                            : c.current_salary ? <span style={{ fontSize: 9, color: '#6B7280' }}>{String(c.current_salary).slice(0, 10)}</span>
                            : <span style={{ fontSize: 10, color: '#D1D5DB' }}>—</span>}
                        </td>
                        <td style={{ padding: '7px 8px' }}>{noticeBadge(c.notice_period)}</td>
                        <td style={{ padding: '7px 8px', maxWidth: 110 }}>
                          <span style={{ fontSize: 10, color: '#6B7280', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.current_location ? String(c.current_location).split(/[,\/]/)[0].trim() : <span style={{ color: '#D1D5DB' }}>—</span>}
                          </span>
                        </td>
                        <td style={{ padding: '7px 8px', whiteSpace: 'nowrap' }}>
                          {initials ? (
                            <Tooltip><TooltipTrigger asChild>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'default' }}>
                                <div style={{ width: 20, height: 20, borderRadius: '50%', background: `linear-gradient(135deg,#A78BFA,${ACCENT})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials}</div>
                                <span style={{ fontSize: 9, color: '#9CA3AF' }}>{moment(c.created_at).format('DD MMM')}</span>
                              </div>
                            </TooltipTrigger><TooltipContent>{`${c.created_by?.first_name || ''} ${c.created_by?.last_name || ''}`.trim()} · {moment(c.created_at).format('DD MMM YY')}</TooltipContent></Tooltip>
                          ) : <span style={{ fontSize: 9, color: '#9CA3AF' }}>System·{moment(c.created_at).format('DD MMM')}</span>}
                        </td>
                        <td style={{ padding: '7px 6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {[
                              { icon: <History size={11} />, onClick: () => setHistoryCandidate(c), tip: 'History', style: {} },
                              { icon: <ScanSearch size={11} />, onClick: () => setCompareCandidate(c), tip: 'Compare', style: {} },
                              { icon: <Sparkles size={11} />, onClick: () => setEnrichCandidate(c), tip: 'Enrich', style: { background: '#F5F3FF', borderColor: '#DDD6FE', color: ACCENT } },
                            ].map((btn, bi) => (
                              <Tooltip key={bi}><TooltipTrigger asChild>
                                <button onClick={btn.onClick} style={{ width: 24, height: 24, borderRadius: 5, border: '0.5px solid #E5E7EB', background: '#FAFAFA', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', ...btn.style }}>
                                  {btn.icon}
                                </button>
                              </TooltipTrigger><TooltipContent>{btn.tip}</TooltipContent></Tooltip>
                            ))}
                            <CandidateActivityButton candidateId={c.id} candidateName={c.candidate_name} />
                            <div style={{ width: 1, height: 14, background: '#E5E7EB', margin: '0 1px', flexShrink: 0 }} />
                            <Tooltip><TooltipTrigger asChild>
                              <button onClick={() => handleSingleInvite(c)} style={{ width: 24, height: 24, borderRadius: 5, border: `0.5px solid #DDD6FE`, background: '#F5F3FF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACCENT }}>
                                <Send size={11} />
                              </button>
                            </TooltipTrigger><TooltipContent>Invite to Job</TooltipContent></Tooltip>
                            <Tooltip><TooltipTrigger asChild>
                              <button onClick={() => { navigator.clipboard.writeText(c.email); setCopiedId(c.id); setTimeout(() => setCopiedId(null), 1500); }} style={{ width: 24, height: 24, borderRadius: 5, border: '0.5px solid #E5E7EB', background: '#FAFAFA', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
                                <Mail size={11} />
                              </button>
                            </TooltipTrigger><TooltipContent>{copiedId === c.id ? '✓ Copied!' : c.email || 'No email'}</TooltipContent></Tooltip>
                            {c.phone && (
                              <Tooltip><TooltipTrigger asChild>
                                <button onClick={() => setFloatCandidate(c)} style={{ width: 24, height: 24, borderRadius: 5, border: '0.5px solid #A7F3D0', background: '#ECFDF5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                                  <MessageSquare size={11} />
                                </button>
                              </TooltipTrigger><TooltipContent>WhatsApp</TooltipContent></Tooltip>
                            )}
                            {c.phone && (
              <CallButton
                candidatePhone={c.phone}
                candidateId={c.id}
                candidateName={c.candidate_name}
              />
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', borderTop: '0.5px solid #F3F4F6', flexWrap: 'wrap', gap: 8, background: '#FAFAFA' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>Rows</span>
                <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                  <SelectTrigger className="w-[58px] h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{['10', '20', '50', '100'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-3 w-3" /></Button>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#374151', minWidth: 90, textAlign: 'center' }}>Page {currentPage} / {totalPages}</span>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}><ChevronRight className="h-3 w-3" /></Button>
              </div>
              <span style={{ fontSize: 11, color: '#9CA3AF' }}>{((currentPage - 1) * itemsPerPage + 1).toLocaleString()}–{Math.min(currentPage * itemsPerPage, totalCandidates).toLocaleString()} of {totalCandidates.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <JobMatchModal isOpen={isMatchModalOpen && !!selectedJob} onClose={() => { setSelectedJob(null); setMatchModalOpen(false); }} job={selectedJob} organizationId={organizationId} />
      {isAddModalOpen    && <AddCandidateModal isOpen onClose={() => setAddModalOpen(false)} onCandidateAdded={handleCandidateAdded} />}
      {compareCandidate  && <CompareWithJobDialog isOpen onClose={() => setCompareCandidate(null)} candidateId={compareCandidate.id} />}
      {historyCandidate  && <AnalysisHistoryDialog isOpen onClose={() => setHistoryCandidate(null)} candidateId={historyCandidate.id} candidateName={historyCandidate.candidate_name ?? ''} />}
      {enrichCandidate   && <EnrichDataDialog isOpen onClose={() => setEnrichCandidate(null)} candidate={enrichCandidate} />}
      <WishlistModal isOpen={isWishlistModalOpen} onClose={() => setIsWishlistModalOpen(false)} />
      <JobPickerModal isOpen={showSingleJobPicker} onClose={() => setShowSingleJobPicker(false)} onSelect={j => { setSingleInviteJob(j); setShowSingleJobPicker(false); }} organizationId={organizationId} title="Select job for this invite" />

      {singleInviteJob && singleInviteCandidate && (
        <InviteCandidateModal isOpen onClose={() => { setSingleInviteCandidate(null); setSingleInviteJob(null); }}
          jobId={singleInviteJob.id} job={singleInviteJob as any}
          prefillEmail={singleInviteCandidate.email || ''} prefillName={singleInviteCandidate.candidate_name || ''} prefillPhone={singleInviteCandidate.phone || ''}
          candidateId={null} candidateOwnerId={user?.id || ''} inviteSource="talentpool" />
      )}
      <JobPickerModal isOpen={showBulkJobPicker} onClose={() => setShowBulkJobPicker(false)} onSelect={handleBulkJobSelected} organizationId={organizationId} title={`Select job for ${selectedIds.size} candidate${selectedIds.size !== 1 ? 's' : ''}`} />
      {showBulkModal && bulkInviteJob && (
        <BulkInviteReviewModal isOpen onClose={() => { setShowBulkModal(false); setSelectedIds(new Set()); }}
          candidates={bulkCandidates} jobId={bulkInviteJob.id} jobTitle={bulkInviteJob.title} inviteSource="talentpool" job={bulkInviteJob as any} />
      )}
      {floatCandidate?.phone && (
        <V2WhatsAppFloat candidateId={floatCandidate.id} candidateName={floatCandidate.candidate_name || 'Candidate'} candidatePhone={floatCandidate.phone} />
      )}
      
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
const TalentPoolPage: FC = () => {
  const { role, user } = useSelector((state: RootState) => state.auth);
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const [activeTab, setActiveTab] = useState<'analytics' | 'table'>('table');

  return (
    <TooltipProvider delayDuration={80}>
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 0, background: '#faf9fb', minHeight: '100vh' }}>

        {/* ── Page header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1722', margin: 0, letterSpacing: '-0.02em' }}>Talent Pool</h1>
            <p style={{ fontSize: 11, color: '#8b8499', marginTop: 3 }}>Manage and analyse your candidate database</p>
          </div>
        </div>

        {/* ── Tab switcher ── */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: '#fff', border: '1px solid #ece9f0', borderRadius: 10, padding: 3, width: 'fit-content', boxShadow: '0 1px 4px rgba(109,74,255,0.06)' }}>
          {([
            { key: 'table', icon: <Table2 size={13} />, label: 'Candidates' },
            { key: 'analytics', icon: <BarChart2 size={13} />, label: 'Analytics' },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 7,
                border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all .15s',
                background: activeTab === tab.key ? ACCENT : 'transparent',
                color: activeTab === tab.key ? '#fff' : '#6b647a',
                boxShadow: activeTab === tab.key ? `0 2px 8px ${ACCENT}40` : 'none',
              }}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        {activeTab === 'analytics'
          ? <AnalyticsTab organizationId={organizationId} />
          : <TableTab organizationId={organizationId} role={role} user={user} />
        }
      </div>
    </TooltipProvider>
  );
};

export default TalentPoolPage;