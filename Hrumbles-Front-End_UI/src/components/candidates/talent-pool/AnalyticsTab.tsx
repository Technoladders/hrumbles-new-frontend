import { useState, useRef, useEffect, FC, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, FileText, Calendar, Zap, TrendingUp, Award, MapPin, DollarSign, Briefcase, Sparkles, BarChart2 } from 'lucide-react';

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

// ─── Constants ────────────────────────────────────────────────────────────────
const V = '#6d4aff'; // violet primary
const V2 = '#8a6dff';
const V3 = '#b69cff';
const G  = '#1D9E75'; // green
const A  = '#D97706'; // amber
const EXP_ORDER = ['Fresher','1–3 yrs','3–5 yrs','5–10 yrs','10+ yrs','Unknown'];
const CTC_ORDER = ['<2L','2–5L','5–8L','8–12L','12–20L','20–35L','>35L'];
const DONUT_PAL = [V, V2, V3, G, A, '#D85A30', '#2563EB', '#c89cdb'];

const fmtK = (n: number) => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1).replace(/\.0$/,'')}K` : String(n ?? 0);

// ─── Tiny Sparkline SVG (inline, no deps) ────────────────────────────────────
const MiniSpark: FC<{ data: number[]; color?: string; w?: number; h?: number }> = ({ data, color = V, w = 56, h = 20 }) => {
  if (!data?.length || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => `${Math.round((i / (data.length - 1)) * w)},${Math.round(h - (v / max) * (h - 3) - 1)}`).join(' ');
  const area = `M0,${h} L${pts.split(' ').join(' L')} L${w},${h} Z`;
  return (
    <svg width={w} height={h} style={{ display: 'block', flexShrink: 0 }}>
      <defs>
        <linearGradient id={`sg${color.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg${color.slice(1)})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ─── KPI Strip ────────────────────────────────────────────────────────────────
const KpiStrip: FC<{ d: AnalyticsData; trend: number[] }> = ({ d, trend }) => {
  const items = [
    { label: 'Total', value: d.total, icon: <Users size={11}/>, color: V, spark: trend },
    { label: 'Today', value: d.added_today, icon: <Zap size={11}/>, color: '#D85A30' },
    { label: 'This Week', value: d.added_this_week, icon: <Calendar size={11}/>, color: A },
    { label: 'This Month', value: d.added_this_month, icon: <TrendingUp size={11}/>, color: G },
    { label: 'With Resume', value: d.with_resume, icon: <FileText size={11}/>, color: G, sub: `${d.total > 0 ? Math.round(d.with_resume/d.total*100) : 0}%` },
    { label: 'No Resume', value: d.without_resume, icon: <Award size={11}/>, color: '#8b8499' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8 }}>
      {items.map((it, i) => (
        <div key={i} style={{ background: '#fff', border: '1px solid #ece9f0', borderRadius: 10, padding: '10px 12px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: it.color, borderRadius: '10px 10px 0 0' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: '#8b8499', textTransform: 'uppercase', letterSpacing: '.07em' }}>{it.label}</span>
            <span style={{ color: it.color, opacity: 0.7 }}>{it.icon}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1722', lineHeight: 1, letterSpacing: '-0.02em' }}>{fmtK(it.value)}</div>
              {it.sub && <div style={{ fontSize: 10, color: it.color, fontWeight: 600, marginTop: 2 }}>{it.sub} coverage</div>}
            </div>
            {it.spark && <MiniSpark data={it.spark} color={it.color} />}
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Interactive Area Chart (Chart.js via CDN, loaded once) ──────────────────
const TrendAreaChart: FC<{ data: { month: string; count: number }[] }> = ({ data }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const inst = useRef<any>(null);
  const [hov, setHov] = useState<{ x: number; y: number; label: string; val: number } | null>(null);

  useEffect(() => {
    if (!data?.length || !ref.current) return;
    const draw = () => {
      if (inst.current) { try { inst.current.destroy(); } catch {} }
      const W = (window as any).Chart;
      if (!W) return;
      const ctx = ref.current!.getContext('2d');
      const grad = ctx!.createLinearGradient(0, 0, 0, 160);
      grad.addColorStop(0, 'rgba(109,74,255,0.22)');
      grad.addColorStop(1, 'rgba(109,74,255,0.01)');
      inst.current = new W(ctx, {
        type: 'line',
        data: {
          labels: data.map(d => d.month),
          datasets: [{
            data: data.map(d => d.count),
            borderColor: V,
            backgroundColor: grad,
            borderWidth: 2.5,
            pointBackgroundColor: '#fff',
            pointBorderColor: V,
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            fill: true,
            tension: 0.38,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 700, easing: 'easeOutQuart' },
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              enabled: true,
              backgroundColor: '#1a1722',
              titleColor: '#fff',
              bodyColor: '#b69cff',
              padding: 10,
              cornerRadius: 8,
              displayColors: false,
              callbacks: {
                title: (items: any[]) => items[0].label,
                label: (item: any) => ` ${fmtK(item.parsed.y)} candidates added`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: { color: '#8b8499', font: { size: 10 } },
            },
            y: {
              grid: { color: 'rgba(109,74,255,0.07)', drawBorder: false },
              border: { display: false, dash: [4,4] },
              ticks: { color: '#8b8499', font: { size: 10 }, callback: (v: any) => fmtK(Number(v)) },
              beginAtZero: true,
            },
          },
        },
      });
    };
    const id = 'chartjs-cdn-tp';
    if (document.getElementById(id)) { draw(); return; }
    const s = document.createElement('script');
    s.id = id;
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
    s.onload = draw;
    document.head.appendChild(s);
    return () => { if (inst.current) { try { inst.current.destroy(); } catch {} } };
  }, [data]);

  const total6m = data.reduce((s, d) => s + d.count, 0);
  const peak    = data.reduce((a, b) => b.count > a.count ? b : a, data[0] || { month: '', count: 0 });

  return (
    <div style={{ background: '#fff', border: '1px solid #ece9f0', borderRadius: 12, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#8b8499', textTransform: 'uppercase', letterSpacing: '.07em' }}>Monthly Additions · last 6 months</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1722', letterSpacing: '-0.02em', marginTop: 2 }}>
            {fmtK(total6m)} <span style={{ fontSize: 11, fontWeight: 400, color: '#8b8499' }}>total added</span>
          </div>
        </div>
        {peak.count > 0 && (
          <div style={{ background: `${V}12`, border: `1px solid ${V}30`, borderRadius: 8, padding: '4px 10px', textAlign: 'right' }}>
            <div style={{ fontSize: 9, color: V, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Peak</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1722' }}>{fmtK(peak.count)}</div>
            <div style={{ fontSize: 9, color: '#8b8499' }}>{peak.month}</div>
          </div>
        )}
      </div>
      <div style={{ position: 'relative', height: 140 }}>
        <canvas ref={ref} />
      </div>
    </div>
  );
};

// ─── Compact Donut + Ranked list ──────────────────────────────────────────────
const DonutRank: FC<{
  title: string; icon?: React.ReactNode;
  items: { label: string; count: number }[];
  total: number; rows?: number; accent?: string;
  showDonut?: boolean;
}> = ({ title, icon, items, total, rows = 7, accent = V, showDonut = true }) => {
  const shown = items.slice(0, rows);
  const maxC  = shown[0]?.count || 1;
  const sum5  = shown.slice(0, 5).reduce((s, i) => s + i.count, 0);
  const R = 38; const SW = 11; const CIRC = 2 * Math.PI * R;
  let offset = 0;
  const pal = [accent, V2, V3, G, A, '#D85A30', '#2563EB', '#c89cdb'];

  return (
    <div style={{ background: '#fff', border: '1px solid #ece9f0', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {icon && <span style={{ color: accent, opacity: 0.8 }}>{icon}</span>}
          <span style={{ fontSize: 10, fontWeight: 700, color: '#3a3540', textTransform: 'uppercase', letterSpacing: '.07em' }}>{title}</span>
        </div>
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#8b8499' }}>{fmtK(total)}</span>
      </div>

      {/* Donut row */}
      {showDonut && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="90" height="90" style={{ flexShrink: 0 }}>
            <circle cx="45" cy="45" r={R} fill="none" stroke="#f5f3f7" strokeWidth={SW} />
            {shown.slice(0, 5).map((item, i) => {
              const pct  = sum5 > 0 ? item.count / sum5 : 0;
              const dash = CIRC * pct;
              const el = (
                <circle key={i} cx="45" cy="45" r={R} fill="none"
                  stroke={pal[i % pal.length]} strokeWidth={SW}
                  strokeDasharray={`${dash} ${CIRC - dash}`}
                  strokeDashoffset={-(offset) + CIRC / 4}
                  strokeLinecap="butt" style={{ transition: 'stroke-dasharray .6s ease' }} />
              );
              offset += dash;
              return el;
            })}
            <text x="45" y="42" textAnchor="middle" fontSize="14" fontWeight="700" fill="#1a1722">{fmtK(total)}</text>
            <text x="45" y="54" textAnchor="middle" fontSize="8" fill="#8b8499">total</text>
          </svg>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
            {shown.slice(0, 5).map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: 1, background: pal[i % pal.length], flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: '#4a4458', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#8b8499', flexShrink: 0 }}>
                  {sum5 > 0 ? Math.round(item.count / sum5 * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ranked bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {shown.map((item, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '14px 1fr 36px', gap: 6, alignItems: 'center' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 8, color: '#c4c0cc', textAlign: 'right' }}>{i + 1}</span>
            <div>
              <div style={{ fontSize: 10, color: '#3a3540', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{item.label}</div>
              <div style={{ height: 3, background: '#f0edf5', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(item.count / maxC) * 100}%`, background: `linear-gradient(90deg,${pal[i % pal.length]},${pal[(i+1) % pal.length]}80)`, borderRadius: 2, transition: 'width .6s ease' }} />
              </div>
            </div>
            <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#6b647a', textAlign: 'right' }}>{fmtK(item.count)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Skills Bubble Cloud (SVG) ────────────────────────────────────────────────
const SkillBubbles: FC<{ items: { label: string; count: number }[] }> = ({ items }) => {
  const shown = items.slice(0, 18);
  const max   = shown[0]?.count || 1;
  const pal   = [V, V2, V3, G, A, '#D85A30', '#2563EB', '#c89cdb', '#9060e0', '#b88cff'];
  const [hov, setHov] = useState<string | null>(null);

  // Simple force-layout approximation: place in rows
  const W = 320; const H = 180;
  const placed: { x: number; y: number; r: number; label: string; count: number; color: string }[] = [];
  shown.forEach((item, i) => {
    const r = Math.max(14, Math.min(38, 14 + (item.count / max) * 30));
    // Attempt placement in a grid-ish spiral
    const angle  = (i / shown.length) * 2 * Math.PI;
    const spread = 80 + i * 8;
    let x = W / 2 + Math.cos(angle) * (spread * 0.55);
    let y = H / 2 + Math.sin(angle) * (spread * 0.38);
    x = Math.max(r + 4, Math.min(W - r - 4, x));
    y = Math.max(r + 4, Math.min(H - r - 4, y));
    placed.push({ x, y, r, label: item.label, count: item.count, color: pal[i % pal.length] });
  });

  return (
    <div style={{ background: '#fff', border: '1px solid #ece9f0', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
        <Sparkles size={11} style={{ color: V, opacity: 0.8 }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#3a3540', textTransform: 'uppercase', letterSpacing: '.07em' }}>Top Skills</span>
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#8b8499', marginLeft: 'auto' }}>{fmtK(items.reduce((s,i)=>s+i.count,0))}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
        {placed.map((p, i) => {
          const isHov = hov === p.label;
          return (
            <g key={i} style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHov(p.label)}
              onMouseLeave={() => setHov(null)}>
              <circle cx={p.x} cy={p.y} r={p.r + (isHov ? 3 : 0)}
                fill={p.color} fillOpacity={isHov ? 0.92 : 0.72}
                stroke={p.color} strokeWidth={isHov ? 2 : 0.5} strokeOpacity={0.4}
                style={{ transition: 'all .2s ease' }} />
              {p.r >= 20 && (
                <text x={p.x} y={p.y + 1} textAnchor="middle" dominantBaseline="middle"
                  fontSize={Math.max(7, Math.min(10, p.r * 0.38))} fontWeight="600" fill="#fff"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  {p.label.length > 9 ? p.label.slice(0, 8) + '…' : p.label}
                </text>
              )}
              {p.r < 20 && (
                <text x={p.x} y={p.y + 1} textAnchor="middle" dominantBaseline="middle"
                  fontSize="6" fontWeight="600" fill="#fff"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  {p.label.slice(0, 4)}
                </text>
              )}
              {isHov && (
                <g>
                  <rect x={p.x - 44} y={p.y - p.r - 26} width={88} height={20} rx="5" fill="#1a1722" />
                  <text x={p.x} y={p.y - p.r - 16} textAnchor="middle" fontSize="9" fill="#fff" fontWeight="600">
                    {p.label} · {fmtK(p.count)}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      {/* Legend row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
        {shown.slice(0, 10).map((item, i) => (
          <span key={i} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 10, background: `${pal[i % pal.length]}18`, color: pal[i % pal.length], fontWeight: 600, border: `1px solid ${pal[i % pal.length]}30`, whiteSpace: 'nowrap' }}>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
};

// ─── CTC Horizontal Bar Chart ─────────────────────────────────────────────────
const CtcBars: FC<{ items: { label: string; count: number }[]; total: number }> = ({ items, total }) => {
  const max  = Math.max(...items.map(i => i.count), 1);
  const pal  = [V, V2, V3, G, A, '#D85A30', '#2563EB'];
  const [hov, setHov] = useState<string | null>(null);

  return (
    <div style={{ background: '#fff', border: '1px solid #ece9f0', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 12 }}>
        <DollarSign size={11} style={{ color: G, opacity: 0.8 }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#3a3540', textTransform: 'uppercase', letterSpacing: '.07em' }}>CTC Distribution</span>
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#8b8499', marginLeft: 'auto' }}>{fmtK(total)}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {items.map((item, i) => {
          const pct  = Math.round((item.count / total) * 100);
          const barW = max > 0 ? (item.count / max) * 100 : 0;
          const isH  = hov === item.label;
          return (
            <div key={i}
              onMouseEnter={() => setHov(item.label)}
              onMouseLeave={() => setHov(null)}
              style={{ cursor: 'default' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: isH ? '#1a1722' : '#4a4458', fontWeight: isH ? 600 : 400, transition: 'all .15s' }}>{item.label}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#8b8499' }}>{fmtK(item.count)} · {pct}%</span>
              </div>
              <div style={{ height: 7, background: '#f5f3f7', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${barW}%`, borderRadius: 4, transition: 'width .6s ease, opacity .15s',
                  background: `linear-gradient(90deg,${pal[i % pal.length]},${pal[i % pal.length]}aa)`,
                  opacity: hov && !isH ? 0.45 : 1,
                  boxShadow: isH ? `0 0 0 1px ${pal[i % pal.length]}40` : 'none',
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Real World Map with Leaflet (loaded dynamically) ─────────────────────────
const GeoMapReal: FC<{ items: { label: string; count: number }[] }> = ({ items }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInst = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<{ label: string; count: number } | null>(null);

  // Hardcoded coords for common Indian cities + world cities
  const COORDS: Record<string, [number, number]> = {
    'New Delhi': [28.6139, 77.2090], 'Delhi': [28.6139, 77.2090],
    'Gurgaon': [28.4595, 77.0266], 'Gurugram': [28.4595, 77.0266], 'Gurgaon/Gurugram': [28.4595, 77.0266],
    'Noida': [28.5355, 77.3910],
    'Mumbai': [19.0760, 72.8777],
    'Pune': [18.5204, 73.8567],
    'Bangalore': [12.9716, 77.5946], 'Bengaluru': [12.9716, 77.5946], 'Bangalore/Bengaluru': [12.9716, 77.5946],
    'Hyderabad': [17.3850, 78.4867], 'Hyderabad/Secunderabad': [17.3850, 78.4867],
    'Chennai': [13.0827, 80.2707],
    'Kolkata': [22.5726, 88.3639],
    'Ahmedabad': [23.0225, 72.5714],
    'Jaipur': [26.9124, 75.7873],
    'Coimbatore': [11.0168, 76.9558],
    'Kochi': [9.9312, 76.2673],
    'Chandigarh': [30.7333, 76.7794],
    'Lucknow': [26.8467, 80.9462],
    'Bhopal': [23.2599, 77.4126],
    'Indore': [22.7196, 75.8577],
    'Nagpur': [21.1458, 79.0882],
    'Surat': [21.1702, 72.8311],
    'Visakhapatnam': [17.6868, 83.2185],
    'Bhubaneswar': [20.2961, 85.8245],
    'Patna': [25.5941, 85.1376],
    'Dehradun': [30.3165, 78.0322],
    // World cities
    'Singapore': [1.3521, 103.8198],
    'Dubai': [25.2048, 55.2708],
    'London': [51.5074, -0.1278],
    'New York': [40.7128, -74.0060],
    'San Francisco': [37.7749, -122.4194],
    'Toronto': [43.6532, -79.3832],
    'Sydney': [-33.8688, 151.2093],
    'Berlin': [52.5200, 13.4050],
    'Abu Dhabi': [24.4539, 54.3773],
    'Riyadh': [24.7136, 46.6753],
  };

  useEffect(() => {
    if (!mapRef.current) return;
    const loadLeaflet = async () => {
      // Load Leaflet CSS
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
        document.head.appendChild(link);
      }
      // Load Leaflet JS
      await new Promise<void>((resolve) => {
        if ((window as any).L) { resolve(); return; }
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
        s.onload = () => resolve();
        document.head.appendChild(s);
      });
      const L = (window as any).L;
      if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; }
      if (!mapRef.current) return;

      const map = L.map(mapRef.current, {
        center: [20, 80], zoom: 4,
        zoomControl: true,
        attributionControl: false,
        scrollWheelZoom: false,
      });
      mapInst.current = map;

      // Tile layer — clean light style
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map);

      const maxCount = Math.max(...items.map(i => i.count), 1);

      items.forEach((item) => {
        const coords = COORDS[item.label];
        if (!coords) return;
        const r = Math.max(10, Math.min(36, 10 + (item.count / maxCount) * 32));
        const pct = Math.round((item.count / maxCount) * 100);
        // Custom circle marker
        const circle = L.circleMarker(coords, {
          radius: r * 0.7,
          fillColor: V,
          fillOpacity: 0.2 + (item.count / maxCount) * 0.6,
          color: V,
          weight: 1.5,
          opacity: 0.7,
        }).addTo(map);

        circle.bindTooltip(
          `<div style="font-family:system-ui;font-size:12px;font-weight:600;color:#1a1722;">${item.label}</div>
           <div style="font-family:monospace;font-size:11px;color:${V};">${fmtK(item.count)} candidates</div>`,
          { permanent: false, direction: 'top', className: 'tp-geo-tip' }
        );
      });

      setReady(true);
    };
    loadLeaflet();
    return () => { if (mapInst.current) { mapInst.current.remove(); mapInst.current = null; } };
  }, [items]);

  const known = items.filter(i => COORDS[i.label]);
  const unknown = items.filter(i => !COORDS[i.label]);

  return (
    <div style={{ background: '#fff', border: '1px solid #ece9f0', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
        <MapPin size={11} style={{ color: A, opacity: 0.8 }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#3a3540', textTransform: 'uppercase', letterSpacing: '.07em' }}>Geographic Distribution</span>
        <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#8b8499', marginLeft: 'auto' }}>Hover to explore</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 12, alignItems: 'start' }}>
        {/* Real Map */}
        <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid #ece9f0', height: 210 }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
          {!ready && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9f8fc', borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: '#8b8499' }}>Loading map…</div>
            </div>
          )}
        </div>
        {/* Ranked sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {known.slice(0, 8).map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 8, color: '#c4c0cc', width: 12, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: '#3a3540', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</div>
                <div style={{ height: 3, background: '#f0edf5', borderRadius: 2, marginTop: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(item.count / (known[0]?.count || 1)) * 100}%`, background: V, borderRadius: 2, transition: 'width .6s ease' }} />
                </div>
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#8b8499', flexShrink: 0 }}>{fmtK(item.count)}</span>
            </div>
          ))}
          {unknown.length > 0 && (
            <div style={{ fontSize: 9, color: '#c4c0cc', marginTop: 4, fontStyle: 'italic' }}>+{unknown.length} unmapped locations</div>
          )}
        </div>
      </div>
      <style>{`.tp-geo-tip { background:#fff !important; border:1px solid #ece9f0 !important; border-radius:8px !important; box-shadow:0 4px 16px rgba(0,0,0,0.1) !important; padding:6px 10px !important; } .tp-geo-tip::before { display:none !important; }`}</style>
    </div>
  );
};

// ─── Exp × CTC Heatmap ────────────────────────────────────────────────────────
const HeatMap: FC<{ data: { exp: string; ctc: string; count: number }[] }> = ({ data }) => {
  const maxVal = Math.max(...data.map(d => d.count), 1);
  const [hov, setHov] = useState<string | null>(null);
  const cellVal = (exp: string, ctc: string) => data.find(d => d.exp === exp && d.ctc === ctc)?.count ?? 0;
  const heatColor = (v: number) => {
    if (v === 0) return '#f5f3f7';
    const t = Math.sqrt(v / maxVal);
    return `rgba(109,74,255,${0.12 + t * 0.82})`;
  };
  return (
    <div style={{ background: '#fff', border: '1px solid #ece9f0', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
        <BarChart2 size={11} style={{ color: V, opacity: 0.8 }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#3a3540', textTransform: 'uppercase', letterSpacing: '.07em' }}>Experience × CTC Heatmap</span>
        <span style={{ fontSize: 9, color: '#8b8499', marginLeft: 'auto' }}>darker = more candidates</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 3, width: '100%', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <td style={{ width: 58 }} />
              {CTC_ORDER.map(c => (
                <th key={c} style={{ fontSize: 8, color: '#8b8499', fontWeight: 500, textAlign: 'center', paddingBottom: 5, whiteSpace: 'nowrap' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EXP_ORDER.filter(e => e !== 'Unknown').map(exp => (
              <tr key={exp}>
                <td style={{ fontSize: 9, color: '#4a4458', fontWeight: 500, paddingRight: 6, whiteSpace: 'nowrap' }}>{exp}</td>
                {CTC_ORDER.map(ctc => {
                  const v   = cellVal(exp, ctc);
                  const key = `${exp}|${ctc}`;
                  const isH = hov === key;
                  return (
                    <td key={ctc}
                      onMouseEnter={() => setHov(key)}
                      onMouseLeave={() => setHov(null)}
                      title={`${exp} × ${ctc}: ${v} candidates`}
                      style={{
                        height: 26, textAlign: 'center', borderRadius: 5,
                        background: isH ? V : heatColor(v),
                        fontSize: 8, fontWeight: v > 0 ? 700 : 400,
                        color: isH ? '#fff' : v > maxVal * 0.4 ? '#fff' : '#4a4458',
                        cursor: v > 0 ? 'pointer' : 'default',
                        transition: 'background .15s, color .15s',
                        outline: isH ? `2px solid ${V}` : 'none',
                      }}>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <span style={{ fontSize: 8, color: '#8b8499' }}>Fewer</span>
        <div style={{ display: 'flex', gap: 2 }}>
          {[0.08, 0.2, 0.38, 0.58, 0.78, 1.0].map((t, i) => (
            <div key={i} style={{ width: 14, height: 8, borderRadius: 2, background: `rgba(109,74,255,${0.12 + t * 0.82})` }} />
          ))}
        </div>
        <span style={{ fontSize: 8, color: '#8b8499' }}>More</span>
      </div>
    </div>
  );
};

// ─── Source Compact ───────────────────────────────────────────────────────────
const SourceCompact: FC<{ items: { label: string; count: number }[] }> = ({ items }) => {
  const total = items.reduce((s, i) => s + i.count, 0) || 1;
  const pal   = [V, G, A, '#D85A30', '#2563EB', '#8b8499', V3];
  return (
    <div style={{ background: '#fff', border: '1px solid #ece9f0', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
        <TrendingUp size={11} style={{ color: V, opacity: 0.8 }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#3a3540', textTransform: 'uppercase', letterSpacing: '.07em' }}>Source Platform</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.slice(0, 7).map((item, i) => {
          const pct = Math.round((item.count / total) * 100);
          return (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: '#3a3540', fontWeight: 500 }}>{item.label || 'Unknown'}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#8b8499' }}>{fmtK(item.count)} · {pct}%</span>
              </div>
              <div style={{ height: 5, background: '#f5f3f7', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: pal[i % pal.length], borderRadius: 3, transition: 'width .6s ease' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Analytics Skeleton ───────────────────────────────────────────────────────
const Skel: FC<{ h?: number; r?: number }> = ({ h = 100, r = 12 }) => (
  <div style={{ background: '#f5f3f7', borderRadius: r, height: h, animation: 'pulse 1.5s ease-in-out infinite' }}>
    <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// MAIN ANALYTICS TAB
// ══════════════════════════════════════════════════════════════════════════════
const AnalyticsTab: FC<{ organizationId: string }> = ({ organizationId }) => {
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

  if (isLoading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8 }}>{Array(6).fill(0).map((_, i) => <Skel key={i} h={72} />)}</div>
      <Skel h={180} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>{Array(3).fill(0).map((_, i) => <Skel key={i} h={240} />)}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 10 }}>{Array(2).fill(0).map((_, i) => <Skel key={i} h={240} />)}</div>
    </div>
  );

  if (error || !analytics) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#8b8499', fontSize: 13, background: '#fff', borderRadius: 12, border: '1px solid #ece9f0' }}>
      Could not load analytics — ensure the <code style={{ background: '#f5f3f7', padding: '1px 5px', borderRadius: 4 }}>get_talent_pool_analytics</code> RPC is deployed.
    </div>
  );

  const trend    = (analytics.monthly_trend || []).map(d => d.count);
  const byTitle  = analytics.by_title  || [];
  const bySkill  = analytics.by_skill  || [];
  const byLoc    = analytics.by_location || [];
  const byExp    = analytics.by_experience || [];
  const byCtc    = analytics.by_ctc    || [];
  const bySrc    = analytics.by_source || [];
  const heatData = analytics.exp_ctc_heatmap || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* KPI Strip */}
      <KpiStrip d={analytics} trend={trend} />

      {/* Trend chart */}
      <TrendAreaChart data={analytics.monthly_trend || []} />

      {/* Row 2: Title + Skills + Exp */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <DonutRank title="By Title" icon={<Briefcase size={11}/>} items={byTitle} total={analytics.total} rows={8} accent={V} />
        <SkillBubbles items={bySkill} />
        <DonutRank title="Experience Mix" icon={<Users size={11}/>} items={byExp} total={analytics.total} rows={6} accent="#7C3AED" />
      </div>

      {/* Row 3: Geo map + Source + CTC */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
        <GeoMapReal items={byLoc} />
        <SourceCompact items={bySrc} />
        <CtcBars items={byCtc} total={analytics.total} />
      </div>

      {/* Row 4: Heatmap + Top Locations */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 10 }}>
        {heatData.length > 0 && <HeatMap data={heatData} />}
        <DonutRank title="Top Locations" icon={<MapPin size={11}/>} items={byLoc} total={analytics.total} rows={8} accent={A} showDonut={false} />
      </div>

    </div>
  );
};

export default AnalyticsTab;