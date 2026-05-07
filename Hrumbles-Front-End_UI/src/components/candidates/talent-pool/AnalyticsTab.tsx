// Hrumbles-Front-End_UI\src\components\candidates\talent-pool\AnalyticsTab.tsx

import { useState, useRef, useEffect, FC, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, FileText, Calendar, Zap, TrendingUp, Award, 
  MapPin, DollarSign, Briefcase, Sparkles, BarChart2,
  ChevronUp, ChevronDown, Search
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
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

interface LocationData {
  locations: { label: string; count: number }[];
}

// ─── Theme: Indigo-Violet-Purple-Fuchsia-Pink ────────────────────────────────
const T = {
  indigo:   '#4F46E5',
  violet:   '#7C3AED',
  purple:   '#A855F7',
  fuchsia:  '#D946EF',
  pink:     '#EC4899',
  bg:       '#FAFAFA',
  cardBg:   '#FFFFFF',
  border:   '#F0EDF5',
  textPrimary: '#1A1722',
  textSecondary: '#8B8499',
  textMuted: '#C4C0CC',
};

const PALETTE = [T.violet, T.purple, T.fuchsia, T.pink, T.indigo, '#8B5CF6', '#C084FC', '#E879F9', '#F472B6', '#A78BFA'];

const CTC_DISPLAY_ORDER = ['<2L','2-5L','5-8L','8-12L','12-20L','20-35L','>35L'];
const EXP_DISPLAY_ORDER = ['Fresher','1-3 yrs','3-5 yrs','5-10 yrs','10+ yrs'];

const normalizeLabel = (s: string) => s.replace(/–/g, '-').trim();
const buildLookup = (items: { label: string; count: number }[]) => {
  const map = new Map<string, number>();
  items.forEach(item => map.set(normalizeLabel(item.label), item.count));
  return map;
};

const fmtK = (n: number) => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1).replace(/\.0$/,'')}K` : String(n ?? 0);

// ─── Count Up Hook ────────────────────────────────────────────────────────────
const useCountUp = (end: number, duration: number = 800) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime: number, raf: number;
    const animate = (t: number) => {
      if (!startTime) startTime = t;
      const p = Math.min((t - startTime) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * end));
      if (p < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [end]);
  return count;
};

// ─── KPI Card (unchanged) ─────────────────────────────────────────────────────
const KpiCard: FC<{
  label: string; value: number; icon: React.ReactNode; color: string; sub?: string;
}> = ({ label, value, icon, color, sub }) => {
  const [h, setH] = useState(false);
  const v = useCountUp(value);
  return (
    <div
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '11px 14px',
        position: 'relative', overflow: 'hidden', cursor: 'default',
        transition: 'all 0.25s ease', transform: h ? 'translateY(-2px)' : 'none',
        boxShadow: h ? `0 6px 16px ${color}18` : `0 1px 3px ${T.border}`,
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color, borderRadius: '10px 10px 0 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: T.textSecondary, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</span>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: T.textPrimary, lineHeight: 1, letterSpacing: '-.02em' }}>{fmtK(v)}</div>
      {sub && <div style={{ fontSize: 10, color, fontWeight: 600, marginTop: 3 }}>{sub}</div>}
    </div>
  );
};

// ─── Donut + Stats (REDESIGNED - Bigger Donut, Centered, Better Proportions) ──
const DonutWithStats: FC<{
  title: string; icon?: React.ReactNode; items: { label: string; count: number }[];
  total: number; maxItems?: number; accent?: string;
}> = ({ title, icon, items = [], total, maxItems = 10, accent = T.violet }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const shown = items.slice(0, maxItems);
  const donutItems = shown;
  const donutSum = donutItems.reduce((s, i) => s + i.count, 0) || 1;
  
  // Larger donut dimensions
  const R = 52, SW = 14, CIRC = 2 * Math.PI * R;
  const SVG_SIZE = 120;
  const CENTER = SVG_SIZE / 2;
  
  let offset = 0;
  const titleLabel = title.toLowerCase().includes('skill') ? 'skills' : 'titles';

  return (
    <div style={{
      background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 10,
      padding: '14px 16px', boxShadow: `0 1px 3px ${T.border}`, height: '100%',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {icon && <span style={{ color: accent, opacity: 0.8 }}>{icon}</span>}
          <span style={{ fontSize: 11, fontWeight: 700, color: T.textPrimary, textTransform: 'uppercase', letterSpacing: '.05em' }}>{title}</span>
        </div>
        <span style={{ fontSize: 9, color: T.textSecondary, background: T.bg, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
          {shown.length} {titleLabel} · {fmtK(total)}
        </span>
      </div>

      {/* Content: Donut (40%) + Stats (60%) */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',  // Changed from 'flex-start' to 'center' for vertical centering
        gap: 12, 
        flex: 1,
        minHeight: 0,
      }}>
        {/* Donut Chart - 40% width, centered */}
        <div style={{ 
          width: '40%',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{ position: 'relative', width: SVG_SIZE, height: SVG_SIZE }}>
            <svg width={SVG_SIZE} height={SVG_SIZE} style={{ display: 'block' }}>
              {/* Background circle */}
              <circle 
                cx={CENTER} 
                cy={CENTER} 
                r={R} 
                fill="none" 
                stroke={T.border} 
                strokeWidth={SW} 
              />
              
              {/* Donut segments */}
              {donutItems.map((item, i) => {
                const pct = item.count / donutSum;
                const dash = CIRC * pct;
                const gap = donutItems.length > 1 ? 0.005 * CIRC : 0;
                const actualDash = Math.max(0, dash - gap);
                
                const segment = (
                  <circle 
                    key={i} 
                    cx={CENTER} 
                    cy={CENTER} 
                    r={R} 
                    fill="none"
                    stroke={PALETTE[i % PALETTE.length]} 
                    strokeWidth={SW}
                    strokeDasharray={`${actualDash} ${CIRC - actualDash}`}
                    strokeDashoffset={-(offset) + CIRC / 4}
                    strokeLinecap="butt"
                    style={{ 
                      transition: 'all 0.4s ease', 
                      opacity: hoveredIndex !== null && hoveredIndex !== i ? 0.3 : 1, 
                      strokeWidth: hoveredIndex === i ? SW + 2 : SW,
                      filter: hoveredIndex === i ? `drop-shadow(0 0 4px ${PALETTE[i % PALETTE.length]}40)` : 'none',
                    }}
                  />
                );
                offset += dash;
                return segment;
              })}
              
              {/* Center text */}
              <text x={CENTER} y={CENTER - 5} textAnchor="middle" fontSize="16" fontWeight="700" fill={T.textPrimary}>
                {fmtK(total)}
              </text>
              <text x={CENTER} y={CENTER + 11} textAnchor="middle" fontSize="8" fill={T.textSecondary} fontWeight="500">
                TOTAL
              </text>
            </svg>
            
            {/* Hover indicator ring */}
            {hoveredIndex !== null && (
              <div style={{
                position: 'absolute',
                inset: -4,
                borderRadius: '50%',
                border: `2px solid ${PALETTE[hoveredIndex % PALETTE.length]}20`,
                pointerEvents: 'none',
                animation: 'pulse-ring 1.5s ease-out infinite',
              }} />
            )}
          </div>
        </div>
        
        {/* Stats List - 60% width, scrollable */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 4, 
          maxHeight: 210, 
          overflowY: 'auto', 
          paddingRight: 4, 
          minWidth: 0,
        }}>
          {shown.map((item, i) => {
            const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
            const isHov = hoveredIndex === i;
            const maxCount = shown[0]?.count || 1;
            const barWidth = (item.count / maxCount) * 100;
            
            return (
              <div key={i}
                onMouseEnter={() => setHoveredIndex(i)} 
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: 3, 
                  padding: '5px 8px', 
                  borderRadius: 6,
                  cursor: 'default', 
                  transition: 'all 0.2s ease',
                  background: isHov ? `${PALETTE[i % PALETTE.length]}0A` : 'transparent',
                  transform: isHov ? 'translateX(2px)' : 'none',
                  border: isHov ? `1px solid ${PALETTE[i % PALETTE.length]}15` : '1px solid transparent',
                }}
              >
                {/* Top row: color indicator + label + count */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {/* Color dot */}
                  <div style={{ 
                    width: 7, 
                    height: 7, 
                    borderRadius: 2, 
                    background: PALETTE[i % PALETTE.length], 
                    flexShrink: 0, 
                    transition: 'transform 0.2s', 
                    transform: isHov ? 'scale(1.3)' : 'scale(1)',
                    boxShadow: isHov ? `0 0 6px ${PALETTE[i % PALETTE.length]}40` : 'none',
                  }} />
                  
                  {/* Label */}
                  <span style={{ 
                    fontSize: 10, 
                    color: T.textPrimary, 
                    flex: 1, 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap', 
                    fontWeight: isHov ? 600 : 500,
                    transition: 'color 0.2s',
                  }}>
                    {item.label}
                  </span>
                  
                  {/* Count */}
                  <span style={{ 
                    fontSize: 9, 
                    color: T.textSecondary, 
                    fontFamily: 'monospace', 
                    fontWeight: isHov ? 600 : 400,
                    flexShrink: 0,
                  }}>
                    {item.count.toLocaleString()}
                  </span>
                </div>
                
                {/* Bottom row: progress bar + percentage */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 13 }}>
                  {/* Mini progress bar */}
                  <div style={{ 
                    flex: 1,
                    height: 3, 
                    background: T.border, 
                    borderRadius: 2, 
                    overflow: 'hidden',
                  }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${barWidth}%`, 
                      background: isHov 
                        ? PALETTE[i % PALETTE.length]
                        : `linear-gradient(90deg, ${PALETTE[i % PALETTE.length]}80, ${PALETTE[i % PALETTE.length]}30)`,
                      borderRadius: 2, 
                      transition: 'width 0.6s ease, background 0.2s',
                    }} />
                  </div>
                  
                  {/* Percentage */}
                  <span style={{ 
                    fontSize: 9, 
                    fontWeight: 700, 
                    color: isHov ? PALETTE[i % PALETTE.length] : T.textMuted, 
                    minWidth: 32, 
                    textAlign: 'right',
                    transition: 'color 0.2s',
                  }}>
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.15); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

// ─── CTC Distribution Bar Chart (unchanged) ───────────────────────────────────
const CtcDistribution: FC<{ items: { label: string; count: number }[]; total: number }> = ({ items = [], total }) => {
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);
  const lookup = useMemo(() => buildLookup(items), [items]);
  
  const orderedItems = CTC_DISPLAY_ORDER.map(label => ({
    label,
    count: lookup.get(normalizeLabel(label)) || 0,
  }));
  
  const maxCount = Math.max(...orderedItems.map(i => i.count), 1);
  
  const getBarHeight = (count: number) => {
    if (count === 0) return 1.5;
    const ratio = count / maxCount;
    const minVisible = 8;
    return minVisible + ratio * (100 - minVisible);
  };
  
  return (
    <div style={{
      background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 10,
      padding: '14px 16px', boxShadow: `0 1px 3px ${T.border}`, height: '100%',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
         
          <span style={{ fontSize: 11, fontWeight: 700, color: T.textPrimary, textTransform: 'uppercase', letterSpacing: '.05em' }}>CTC Distribution</span>
        </div>
        <span style={{ fontSize: 9, color: T.textSecondary, background: T.bg, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>{fmtK(total)} PROFILES</span>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, paddingLeft: 4, paddingRight: 4 }}>
        <span style={{ fontSize: 7, color: T.textMuted }}>{fmtK(maxCount)}</span>
        <span style={{ fontSize: 7, color: T.textMuted }}>{fmtK(Math.round(maxCount / 2))}</span>
        <span style={{ fontSize: 7, color: T.textMuted }}>0</span>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 180, paddingBottom: 20, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 20, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, borderTop: `1px dashed ${T.border}` }} />
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: `1px dashed ${T.border}` }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderTop: `1px solid ${T.border}` }} />
        </div>
        
        {orderedItems.map((item, i) => {
          const height = getBarHeight(item.count);
          const isHov = hoveredBar === item.label;
          const color = PALETTE[i % PALETTE.length];
          
          return (
            <div key={item.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', cursor: 'default', zIndex: 1 }}
              onMouseEnter={() => setHoveredBar(item.label)} onMouseLeave={() => setHoveredBar(null)}>
              {isHov && (
                <div style={{
                  position: 'absolute', bottom: `calc(${height}% + 24px)`, left: '50%', transform: 'translateX(-50%)',
                  background: T.textPrimary, color: '#fff', padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                  whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 10,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}>
                  {fmtK(item.count)} candidates
                  <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `5px solid ${T.textPrimary}` }} />
                </div>
              )}
              <div style={{ fontSize: 8, fontWeight: 700, color: isHov ? color : T.textSecondary, marginBottom: 3, transition: 'all 0.3s', minHeight: 11, textAlign: 'center' }}>
                {item.count > 0 ? fmtK(item.count) : ''}
              </div>
              <div style={{
                width: '100%', maxWidth: 36, height: `${height}%`,
                background: isHov ? `linear-gradient(180deg, ${color} 0%, ${color}CC 100%)` : item.count > 0 ? `linear-gradient(180deg, ${color}CC 0%, ${color}66 100%)` : T.border,
                borderRadius: '4px 4px 2px 2px', transition: 'all 0.35s ease', transform: isHov ? 'scaleY(1.04)' : 'scaleY(1)', transformOrigin: 'bottom',
                boxShadow: isHov ? `0 3px 8px ${color}30` : 'none', minHeight: item.count > 0 ? 8 : 2, position: 'relative',
              }}>
                {isHov && item.count > 0 && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '35%', background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)', borderRadius: '4px 4px 0 0' }} />}
              </div>
              <div style={{ fontSize: 8, fontWeight: isHov ? 600 : 500, color: isHov ? T.textPrimary : T.textMuted, marginTop: 5, whiteSpace: 'nowrap' }}>{item.label}</div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 8, color: T.textMuted, textAlign: 'center' }}>INR · LPA</div>
    </div>
  );
};

// ─── Monthly Trend (unchanged) ────────────────────────────────────────────────
const TrendAreaChart: FC<{ data: { month: string; count: number }[] }> = ({ data = [] }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const inst = useRef<any>(null);
  const totalPeriod = data.reduce((s, d) => s + d.count, 0);
  const prevPeriod = data.slice(0, Math.max(0, data.length - 3)).reduce((s, d) => s + d.count, 0);
  const change = prevPeriod > 0 ? Math.round(((totalPeriod - prevPeriod) / prevPeriod) * 100) : 0;
  
  useEffect(() => {
    if (!data.length || !ref.current) return;
    const draw = () => {
      if (inst.current) { try { inst.current.destroy(); } catch {} }
      const W = (window as any).Chart;
      if (!W) return;
      const ctx = ref.current!.getContext('2d');
      const grad = ctx!.createLinearGradient(0, 0, 0, 140);
      grad.addColorStop(0, 'rgba(168,85,247,0.22)');
      grad.addColorStop(0.75, 'rgba(168,85,247,0.06)');
      grad.addColorStop(1, 'rgba(168,85,247,0.01)');
      
      inst.current = new W(ctx, {
        type: 'line',
        data: {
          labels: data.map(d => d.month),
          datasets: [{
            data: data.map(d => d.count),
            borderColor: T.purple,
            backgroundColor: grad,
            borderWidth: 2.5,
            pointBackgroundColor: '#fff',
            pointBorderColor: T.purple,
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 7,
            fill: true,
            tension: 0.4,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          animation: { duration: 800, easing: 'easeOutQuart' },
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false }, border: { display: false }, ticks: { color: T.textMuted, font: { size: 9 }, padding: 4 } },
            y: { grid: { color: 'rgba(168,85,247,0.06)' }, border: { display: false }, ticks: { color: T.textMuted, font: { size: 9 }, callback: (v: any) => fmtK(Number(v)), padding: 4 }, beginAtZero: true },
          },
        },
      });
    };
    const id = 'chartjs-cdn-tp';
    if (document.getElementById(id)) { draw(); return; }
    const s = document.createElement('script');
    s.id = id; s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
    s.onload = draw; document.head.appendChild(s);
    return () => { if (inst.current) { try { inst.current.destroy(); } catch {} } };
  }, [data]);
  
  return (
    <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '14px 16px', boxShadow: `0 1px 3px ${T.border}`, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textPrimary, textTransform: 'uppercase', letterSpacing: '.05em' }}>Talent Pool Overview</div>
          <div style={{ fontSize: 9, color: T.textSecondary, marginTop: 1 }}>Monthly additions trend</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.textPrimary, lineHeight: 1 }}>{fmtK(totalPeriod)}</div>
          {change !== 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end', marginTop: 1 }}>
              {change < 0 ? <ChevronDown size={10} color="#EF4444" /> : <ChevronUp size={10} color={T.violet} />}
              <span style={{ fontSize: 9, fontWeight: 600, color: change < 0 ? '#EF4444' : T.violet }}>{Math.abs(change)}% qtr</span>
            </div>
          )}
        </div>
      </div>
      <div style={{ height: 220 }}><canvas ref={ref} /></div>
    </div>
  );
};

// ─── Heatmap (unchanged) ──────────────────────────────────────────────────────
const HeatMap: FC<{ data: { exp: string; ctc: string; count: number }[] }> = ({ data = [] }) => {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);
  
  const cellVal = (exp: string, ctc: string): number => {
    const match = data.find(d => normalizeLabel(d.exp) === normalizeLabel(exp) && normalizeLabel(d.ctc) === normalizeLabel(ctc));
    return match?.count ?? 0;
  };
  
  const allValues = data.map(d => d.count);
  const maxVal = Math.max(...allValues, 1);
  
  const heatColor = (v: number) => {
    if (v === 0) return 'transparent';
    const t = Math.pow(v / maxVal, 0.55);
    return `rgba(168,85,247,${0.14 + t * 0.78})`;
  };
  
  return (
    <div style={{ background: T.cardBg, border: `1px solid ${T.border}`, borderRadius: 10, padding: '14px 16px', boxShadow: `0 1px 3px ${T.border}`, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.textPrimary, textTransform: 'uppercase', letterSpacing: '.05em' }}>Expertise × CTC</div>
          <div style={{ fontSize: 9, color: T.textSecondary }}>Profile density heatmap</div>
        </div>
      </div>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 3, width: '100%' }}>
          <thead>
            <tr>
              <td style={{ width: 52 }} />
              {CTC_DISPLAY_ORDER.map(c => (
                <th key={c} style={{ fontSize: 8, color: T.textMuted, fontWeight: 500, textAlign: 'center', paddingBottom: 4, whiteSpace: 'nowrap' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EXP_DISPLAY_ORDER.map(exp => (
              <tr key={exp}>
                <td style={{ fontSize: 9, color: T.textPrimary, fontWeight: 600, paddingRight: 4, whiteSpace: 'nowrap' }}>{exp}</td>
                {CTC_DISPLAY_ORDER.map(ctc => {
                  const v = cellVal(exp, ctc);
                  const key = `${exp}|${ctc}`;
                  const isHov = hoveredCell === key;
                  return (
                    <td key={ctc} style={{ padding: 0 }}>
                      <div
                        onMouseEnter={() => v > 0 && setHoveredCell(key)}
                        onMouseLeave={() => setHoveredCell(null)}
                        style={{
                          height: 30, minWidth: 42, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: 5, cursor: v > 0 ? 'pointer' : 'default',
                          background: isHov ? T.fuchsia : heatColor(v),
                          color: (isHov || v > maxVal * 0.5) ? '#fff' : v > 0 ? T.textPrimary : T.textMuted,
                          fontSize: 9, fontWeight: v > 0 ? 700 : 400,
                          transition: 'all 0.2s ease', transform: isHov ? 'scale(1.08)' : 'scale(1)',
                          boxShadow: isHov ? `0 4px 12px ${T.fuchsia}40` : 'none',
                          border: v === 0 ? `1px dashed ${T.border}` : 'none',
                          zIndex: isHov ? 5 : 1, position: 'relative',
                        }}
                        title={`${exp} × ${ctc}: ${v} candidates`}
                      >
                        {v > 0 ? fmtK(v) : ''}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}>
        <span style={{ fontSize: 8, color: T.textMuted }}>LESS</span>
        {[0, 0.15, 0.3, 0.5, 0.7, 0.9, 1.0].map((t, i) => (
          <div key={i} style={{ width: 14, height: 6, borderRadius: 2, background: t === 0 ? 'transparent' : `rgba(168,85,247,${0.14 + t * 0.78})`, border: t === 0 ? `1px dashed ${T.border}` : 'none' }} />
        ))}
        <span style={{ fontSize: 8, color: T.textMuted }}>MORE</span>
      </div>
      <div style={{ textAlign: 'center', fontSize: 7, color: T.textMuted, marginTop: 4 }}>Experience × CTC (LPA)</div>
    </div>
  );
};

// ─── Geographic Map with ALL Locations (UPDATED) ──────────────────────────────
const GeoMapReal: FC<{ items: { label: string; count: number }[] }> = ({ items = [] }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInst = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedLocation, setHighlightedLocation] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  
  const COORDS: Record<string, [number, number]> = {
    'New Delhi': [28.6139, 77.2090], 'Delhi': [28.6139, 77.2090],
    'Gurgaon': [28.4595, 77.0266], 'Gurugram': [28.4595, 77.0266],
    'Noida': [28.5355, 77.3910], 'Greater Noida': [28.4744, 77.5040],
    'Mumbai': [19.0760, 72.8777], 'Navi Mumbai': [19.0330, 73.0297],
    'Pune': [18.5204, 73.8567], 'Bangalore': [12.9716, 77.5946], 
    'Bengaluru': [12.9716, 77.5946], 'Hyderabad': [17.3850, 78.4867],
    'Secunderabad': [17.4399, 78.4983], 'Chennai': [13.0827, 80.2707],
    'Kolkata': [22.5726, 88.3639], 'Ahmedabad': [23.0225, 72.5714],
    'Gandhinagar': [23.2156, 72.6369], 'Jaipur': [26.9124, 75.7873],
    'Coimbatore': [11.0168, 76.9558], 'Kochi': [9.9312, 76.2673],
    'Cochin': [9.9312, 76.2673], 'Chandigarh': [30.7333, 76.7794],
    'Lucknow': [26.8467, 80.9462], 'Bhopal': [23.2599, 77.4126],
    'Indore': [22.7196, 75.8577], 'Nagpur': [21.1458, 79.0882],
    'Surat': [21.1702, 72.8311], 'Visakhapatnam': [17.6868, 83.2185],
    'Vizag': [17.6868, 83.2185], 'India': [20.5937, 78.9629],
    'Bhubaneswar': [20.2961, 85.8245], 'Patna': [25.5941, 85.1376],
    'Dehradun': [30.3165, 78.0322], 'Raipur': [21.2514, 81.6296],
    'Ranchi': [23.3441, 85.3096], 'Guwahati': [26.1445, 91.7362],
    'Thiruvananthapuram': [8.5241, 76.9366], 'Trivandrum': [8.5241, 76.9366],
    'Mysore': [12.2958, 76.6394], 'Mysuru': [12.2958, 76.6394],
    'Mangalore': [12.9141, 74.8560], 'Goa': [15.2993, 74.1240],
    'Panaji': [15.4909, 73.8278], 'Vadodara': [22.3072, 73.1812],
    'Baroda': [22.3072, 73.1812], 'Rajkot': [22.3039, 70.8022],
    'Jodhpur': [26.2389, 73.0243], 'Udaipur': [24.5854, 73.7125],
    'Agra': [27.1767, 78.0081], 'Varanasi': [25.3176, 82.9739],
    'Ludhiana': [30.9010, 75.8573], 'Amritsar': [31.6340, 74.8723],
    'Singapore': [1.3521, 103.8198], 'Dubai': [25.2048, 55.2708],
    'London': [51.5074, -0.1278], 'New York': [40.7128, -74.0060],
    'San Francisco': [37.7749, -122.4194], 'Toronto': [43.6532, -79.3832],
    'Sydney': [-33.8688, 151.2093],
  };
  
  // Filter locations based on search
  const filteredLocations = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item => item.label.toLowerCase().includes(term));
  }, [items, searchTerm]);
  
  const knownLocations = items.filter(i => COORDS[i.label]);
  const totalCandidateCount = items.reduce((sum, i) => sum + i.count, 0);
  
  useEffect(() => {
    if (!mapRef.current || items.length === 0) return;
    const loadLeaflet = async () => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link'); link.id = 'leaflet-css';
        link.rel = 'stylesheet'; link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
        document.head.appendChild(link);
      }
      await new Promise<void>(res => {
        if ((window as any).L) { res(); return; }
        const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
        s.onload = () => res(); document.head.appendChild(s);
      });
      const L = (window as any).L;
      if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; }
      if (!mapRef.current) return;
      
      const map = L.map(mapRef.current, { 
        center: [20, 80], 
        zoom: 4, 
        zoomControl: true,
        attributionControl: false, 
        scrollWheelZoom: true,
        doubleClickZoom: true,
      });
      map.zoomControl.setPosition('bottomright');
      mapInst.current = map;
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
      
      const maxCount = Math.max(...items.map(i => i.count), 1);
      items.forEach((item, idx) => {
        const coords = COORDS[item.label];
        if (!coords) return;
        const r = 4 + (item.count / maxCount) * 18;
        const marker = L.circleMarker(coords, {
          radius: r, fillColor: T.fuchsia, fillOpacity: 0.25 + (item.count / maxCount) * 0.55,
          color: T.fuchsia, weight: 1.5, opacity: 0.7,
        }).addTo(map);
        
        marker.bindTooltip(
          `<div style="font-family:system-ui;font-size:11px;font-weight:600;color:${T.textPrimary};">${item.label}</div><div style="font-family:monospace;font-size:10px;color:${T.fuchsia};">${fmtK(item.count)} candidates</div>`, 
          { direction: 'top', className: 'tp-geo-tip' }
        );
        
        // Highlight on hover from list
        marker.on('mouseover', () => setHighlightedLocation(item.label));
        marker.on('mouseout', () => setHighlightedLocation(null));
      });
      
      // Style zoom controls
      setTimeout(() => {
        const zoomInBtn = mapRef.current?.querySelector('.leaflet-control-zoom-in');
        const zoomOutBtn = mapRef.current?.querySelector('.leaflet-control-zoom-out');
        if (zoomInBtn) {
          (zoomInBtn as HTMLElement).style.cssText = `
            background: ${T.cardBg} !important; color: ${T.violet} !important;
            border: 1px solid ${T.border} !important; border-radius: 6px 6px 0 0 !important;
            width: 28px !important; height: 28px !important; line-height: 26px !important;
            font-size: 16px !important; font-weight: 600 !important; cursor: pointer !important;
          `;
        }
        if (zoomOutBtn) {
          (zoomOutBtn as HTMLElement).style.cssText = `
            background: ${T.cardBg} !important; color: ${T.violet} !important;
            border: 1px solid ${T.border} !important; border-top: none !important;
            border-radius: 0 0 6px 6px !important; width: 28px !important;
            height: 28px !important; line-height: 26px !important;
            font-size: 16px !important; font-weight: 600 !important; cursor: pointer !important;
          `;
        }
        const zoomControl = mapRef.current?.querySelector('.leaflet-control-zoom');
        if (zoomControl) {
          (zoomControl as HTMLElement).style.cssText = `
            border: none !important; box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important;
            border-radius: 6px !important;
          `;
        }
      }, 100);
      
      setReady(true);
    };
    loadLeaflet();
    return () => { if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; } };
  }, [items]);
  
  return (
    <div style={{ 
      background: T.cardBg, 
      border: `1px solid ${T.border}`, 
      borderRadius: 10, 
      padding: '14px 16px', 
      boxShadow: `0 1px 3px ${T.border}`,
      marginBottom: 16,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MapPin size={13} style={{ color: T.pink }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: T.textPrimary, textTransform: 'uppercase', letterSpacing: '.05em' }}>Geographic Distribution</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9, color: T.textSecondary, fontWeight: 500 }}>🖱 Scroll to zoom · Double-click to zoom in</span>
          <span style={{ fontSize: 9, color: T.textSecondary, background: T.bg, padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
            {knownLocations.length} locations · {totalCandidateCount.toLocaleString()} candidates
          </span>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 10 }}>
        {/* Map */}
        <div style={{ 
          borderRadius: 8, 
          overflow: 'hidden', 
          border: `1px solid ${T.border}`, 
          height: 320,
          position: 'relative',
          background: T.bg,
        }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          {!ready && (
            <div style={{ 
              position: 'absolute', inset: 0, display: 'flex', 
              alignItems: 'center', justifyContent: 'center', 
              background: T.bg, fontSize: 10, color: T.textSecondary,
              zIndex: 10,
            }}>
              Loading map...
            </div>
          )}
        </div>
        
        {/* ALL Locations List - Scrollable with Search */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          height: 320,
        }}>
          {/* Search input */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 4, 
            padding: '4px 8px',
            background: T.bg,
            borderRadius: 6,
            border: `1px solid ${T.border}`,
            marginBottom: 8,
            flexShrink: 0,
          }}>
            <Search size={11} style={{ color: T.textMuted, flexShrink: 0 }} />
            <input 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Filter locations..."
              style={{
                border: 'none', background: 'transparent', outline: 'none',
                fontSize: 10, color: T.textPrimary, width: '100%',
                padding: '2px 0',
              }}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: T.textMuted, fontSize: 12, lineHeight: 1 }}
              >
                ×
              </button>
            )}
          </div>
          
          {/* Scrollable list */}
          <div 
            ref={listRef}
            style={{ 
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              paddingRight: 4,
            }}
          >
            {filteredLocations.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '20px 8px', 
                fontSize: 10, 
                color: T.textMuted 
              }}>
                {searchTerm ? 'No matching locations' : 'No location data available'}
              </div>
            ) : (
              filteredLocations.map((item, i) => {
                const isKnown = !!COORDS[item.label];
                const isHighlighted = highlightedLocation === item.label;
                const maxCount = filteredLocations[0]?.count || 1;
                const barWidth = (item.count / maxCount) * 100;
                
                return (
                  <div 
                    key={i}
                    onMouseEnter={() => setHighlightedLocation(item.label)}
                    onMouseLeave={() => setHighlightedLocation(null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 8px',
                      borderRadius: 6,
                      cursor: isKnown ? 'pointer' : 'default',
                      transition: 'all 0.15s ease',
                      background: isHighlighted ? `${T.fuchsia}10` : 'transparent',
                      border: isHighlighted ? `1px solid ${T.fuchsia}20` : '1px solid transparent',
                      opacity: isKnown ? 1 : 0.4,
                    }}
                    title={isKnown ? 'Click to view on map' : 'Coordinates not available'}
                  >
                    {/* Rank */}
                    <span style={{ 
                      fontSize: 8, 
                      color: T.textMuted, 
                      width: 18,
                      textAlign: 'right',
                      fontFamily: 'monospace',
                      flexShrink: 0,
                    }}>
                      {i + 1}
                    </span>
                    
                    {/* Location info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        marginBottom: 2,
                      }}>
                        <span style={{ 
                          fontSize: 10, 
                          fontWeight: 500, 
                          color: T.textPrimary,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {item.label}
                          {!isKnown && <span style={{ fontSize: 7, color: T.textMuted, marginLeft: 4 }}>unmapped</span>}
                        </span>
                        <span style={{ 
                          fontSize: 9, 
                          fontWeight: 600,
                          color: isHighlighted ? T.fuchsia : T.textSecondary,
                          fontFamily: 'monospace',
                          flexShrink: 0,
                          marginLeft: 4,
                        }}>
                          {item.count.toLocaleString()}
                        </span>
                      </div>
                      
                      {/* Bar */}
                      <div style={{ 
                        height: 3, 
                        background: T.border, 
                        borderRadius: 2, 
                        overflow: 'hidden',
                      }}>
                        <div style={{ 
                          height: '100%', 
                          width: `${barWidth}%`, 
                          background: isHighlighted 
                            ? `linear-gradient(90deg, ${T.fuchsia}, ${T.pink})` 
                            : `linear-gradient(90deg, ${T.fuchsia}80, ${T.pink}40)`,
                          borderRadius: 2,
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          {/* Footer stats */}
          <div style={{ 
            flexShrink: 0,
            marginTop: 6,
            padding: '4px 8px',
            background: T.bg,
            borderRadius: 6,
            fontSize: 8,
            color: T.textMuted,
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <span>Total: {items.length} locations</span>
            <span>Mapped: {knownLocations.length}</span>
            <span>Unmapped: {items.length - knownLocations.length}</span>
          </div>
        </div>
      </div>
      
      <style>{`
        .tp-geo-tip {
          background: #fff !important;
          border: 1px solid ${T.border} !important;
          border-radius: 6px !important;
          box-shadow: 0 3px 12px rgba(0,0,0,0.1) !important;
          padding: 4px 8px !important;
        }
        .tp-geo-tip::before {
          display: none !important;
        }
        .leaflet-control-zoom-in:hover,
        .leaflet-control-zoom-out:hover {
          background: ${T.violet}15 !important;
        }
      `}</style>
    </div>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skel: FC<{ h?: number }> = ({ h = 80 }) => (
  <div style={{ background: `linear-gradient(90deg, ${T.bg} 25%, #EEE8F5 50%, ${T.bg} 75%)`, backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: 10, height: h }} />
);

// ══════════════════════════════════════════════════════════════════════════════
// MAIN ANALYTICS TAB
// ══════════════════════════════════════════════════════════════════════════════
const AnalyticsTab: FC<{ organizationId: string }> = ({ organizationId }) => {
  // Main analytics query
  const { data: analytics, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ['tp_analytics_v3', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_talent_pool_analytics', { p_org_id: organizationId });
      if (error) throw error;
      return data as AnalyticsData;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Separate query for ALL locations
  const { data: locationData, isLoading: isLocationsLoading } = useQuery<LocationData>({
    queryKey: ['tp_all_locations', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_talent_pool_locations', { p_org_id: organizationId });
      if (error) throw error;
      return data as LocationData;
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  if (isLoading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8 }}>{Array(6).fill(0).map((_, i) => <Skel key={i} h={68} />)}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{Array(2).fill(0).map((_, i) => <Skel key={i} h={220} />)}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{Array(2).fill(0).map((_, i) => <Skel key={i} h={180} />)}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{Array(2).fill(0).map((_, i) => <Skel key={i} h={160} />)}</div>
      <Skel h={340} />
    </div>
  );

  if (error || !analytics) return (
    <div style={{ padding: 32, textAlign: 'center', color: T.textSecondary, fontSize: 12, background: T.cardBg, borderRadius: 10, border: `1px solid ${T.border}` }}>
      Could not load analytics — ensure <code style={{ background: T.bg, padding: '1px 6px', borderRadius: 4, color: T.purple }}>get_talent_pool_analytics</code> RPC is deployed.
    </div>
  );

  const byExp = (analytics.by_experience || []).filter(e => normalizeLabel(e.label) !== 'unknown');
  const byCtc = analytics.by_ctc || [];
  const heatData = analytics.exp_ctc_heatmap || [];
  
  // Use full location data if available, otherwise fall back to analytics data
  const allLocations = locationData?.locations || analytics.by_location || [];

  return (
    <>
      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        * { scrollbar-width: thin; scrollbar-color: ${T.border} transparent; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 3px; }
      `}</style>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        
        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
          <KpiCard label="Total" value={analytics.total} icon={<Users size={13} />} color={T.indigo} />
          <KpiCard label="Today" value={analytics.added_today} icon={<Zap size={13} />} color={T.fuchsia} />
          <KpiCard label="This Week" value={analytics.added_this_week} icon={<Calendar size={13} />} color={T.pink} />
          <KpiCard label="This Month" value={analytics.added_this_month} icon={<TrendingUp size={13} />} color={T.violet} />
          <KpiCard label="With Resume" value={analytics.with_resume} icon={<FileText size={13} />} color={T.purple}
            sub={`${analytics.total > 0 ? Math.round(analytics.with_resume / analytics.total * 100) : 0}% coverage`} />
          <KpiCard label="No Resume" value={analytics.without_resume} icon={<Award size={13} />} color={T.fuchsia} />
        </div>
        
        {/* By Title + Top Skills */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <DonutWithStats title="By Title" icon={<Briefcase size={12} />} items={analytics.by_title || []} total={analytics.total} maxItems={10} accent={T.violet} />
          <DonutWithStats title="Top Skills" icon={<Sparkles size={12} />} items={analytics.by_skill || []} total={(analytics.by_skill || []).reduce((s, i) => s + i.count, 0)} maxItems={10} accent={T.fuchsia} />
        </div>
        
        {/* Experience Mix + CTC Distribution */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <DonutWithStats title="Experience Mix" icon={<Users size={12} />} items={byExp} total={byExp.reduce((s, i) => s + i.count, 0)} maxItems={8} accent={T.purple} />
          <CtcDistribution items={byCtc} total={analytics.total} />
        </div>
        
        {/* Trend + Heatmap */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <TrendAreaChart data={analytics.monthly_trend || []} />
          <HeatMap data={heatData} />
        </div>
        
        {/* Geographic - with ALL locations from separate RPC */}
        <GeoMapReal items={allLocations} />
        
      </div>
    </>
  );
};

export default AnalyticsTab;