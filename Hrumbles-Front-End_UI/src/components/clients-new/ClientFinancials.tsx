// src/components/clients-new/ClientFinancials.tsx
// Light mode — compact mini visualizations, white cards, violet accent

import React from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { ClientMetrics, MonthlyData, HiresByMonth, RecruiterPerformance, PipelineStage } from './ClientTypes';
import { TrendingUp, TrendingDown, IndianRupee, Users, Percent, Activity } from 'lucide-react';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
const formatK = (v: number) => v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`;

const LightTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2.5 text-xs">
      <p className="font-semibold text-gray-600 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {formatK(p.value)}</p>
      ))}
    </div>
  );
};

// Reusable mini card
const MiniCard = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 ${className}`}>{children}</div>
);

const MiniTitle = ({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) => (
  <div className="flex items-center gap-1.5 mb-3">
    <div className="w-1 h-3.5 rounded-full bg-gradient-to-b from-violet-500 to-violet-700" />
    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{children}</span>
    {icon && <span className="ml-auto text-gray-300">{icon}</span>}
  </div>
);

// Spark stat row for KPIs
const StatChip = ({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) => (
  <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
    <div className="flex items-center gap-2">
      <div className="p-1.5 rounded-md" style={{ background: `${color}15` }}>
        <div style={{ color, width: 12, height: 12 }}>{icon}</div>
      </div>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
    <span className="text-sm font-bold text-gray-800">{value}</span>
  </div>
);

// Inline sparkline
const Sparkline = ({ data, dataKey, color }: { data: any[]; dataKey: string; color: string }) => (
  <ResponsiveContainer width="100%" height={40}>
    <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
      <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} dot={false} />
    </LineChart>
  </ResponsiveContainer>
);

// Progress bar
const ProgressBar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mb-2.5 last:mb-0">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] text-gray-500">{label}</span>
        <span className="text-[11px] font-bold" style={{ color }}>{formatK(value)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
};

const PIE_COLORS = ['#7B43F1', '#06B6D4'];

interface ClientFinancialsProps {
  metrics: ClientMetrics; monthlyData: MonthlyData[]; hiresByMonth: HiresByMonth[];
  allCandidatesCount?: number; recruiterPerformance?: RecruiterPerformance[]; pipelineStages?: PipelineStage[];
}

const ClientFinancials: React.FC<ClientFinancialsProps> = ({ metrics, monthlyData, hiresByMonth }) => {
  const totalRevenue = metrics.candidateRevenue + metrics.employeeRevenueINR;
  const totalProfit = metrics.candidateProfit + metrics.employeeProfitINR;
  const profitMarginPct = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';
  const costAmount = totalRevenue - totalProfit;
  const maxRevenue = Math.max(metrics.candidateRevenue, metrics.employeeRevenueINR, 1);

  const pieData = [
    { name: 'Permanent', value: metrics.candidateRevenue },
    { name: 'Contractual', value: metrics.employeeRevenueINR },
  ].filter(d => d.value > 0);

  const profitTrendData = monthlyData.map(d => ({
    ...d,
    margin: d.revenue > 0 ? parseFloat(((d.profit / d.revenue) * 100).toFixed(1)) : 0,
  }));

  const latestMonthRevenue = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].revenue : 0;
  const prevMonthRevenue = monthlyData.length > 1 ? monthlyData[monthlyData.length - 2].revenue : 0;
  const revTrend = latestMonthRevenue >= prevMonthRevenue;

  return (
    <div className="space-y-4">
      {/* ── Row 1: 4 stat chips ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <MiniCard>
          <div className="flex items-start justify-between mb-1">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Total Revenue</p>
            <div className="p-1.5 rounded-lg bg-violet-50"><IndianRupee size={12} className="text-violet-600" /></div>
          </div>
          <p className="text-xl font-bold text-gray-800">{formatK(totalRevenue)}</p>
          {monthlyData.length > 1 && (
            <div className={`flex items-center gap-1 mt-1 text-[11px] font-medium ${revTrend ? 'text-green-600' : 'text-red-500'}`}>
              {revTrend ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              vs last month
            </div>
          )}
        </MiniCard>
        <MiniCard>
          <div className="flex items-start justify-between mb-1">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Total Profit</p>
            <div className="p-1.5 rounded-lg bg-cyan-50"><TrendingUp size={12} className="text-cyan-600" /></div>
          </div>
          <p className="text-xl font-bold text-gray-800">{formatK(totalProfit)}</p>
          <p className="text-[11px] text-gray-400 mt-1">{profitMarginPct}% margin</p>
        </MiniCard>
      </div>

      {/* ── Row 2: Revenue over time (compact area) + Hires bar ──── */}
      <div className="grid grid-cols-2 gap-3">
        <MiniCard>
          <MiniTitle icon={<Activity size={12} />}>Revenue Trend</MiniTitle>
          {monthlyData.length > 0 ? (
            <div className="h-[90px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cfRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7B43F1" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#7B43F1" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="cfProfGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="month" tick={{ fontSize: 8, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 8, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={formatK} width={36} />
                  <RechartsTooltip content={<LightTooltip />} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#7B43F1" strokeWidth={1.5} fill="url(#cfRevGrad)" />
                  <Area type="monotone" dataKey="profit" name="Profit" stroke="#06B6D4" strokeWidth={1.5} fill="url(#cfProfGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[90px] flex items-center justify-center"><p className="text-xs text-gray-300">No data</p></div>
          )}
        </MiniCard>

        <MiniCard>
          <MiniTitle icon={<Users size={12} />}>Hires / Month</MiniTitle>
          {hiresByMonth.length > 0 ? (
            <div className="h-[90px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hiresByMonth} margin={{ top: 2, right: 4, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cfBarGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7B43F1" stopOpacity={1} />
                      <stop offset="100%" stopColor="#6D28D9" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="month" tick={{ fontSize: 8, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 8, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="hires" name="Hires" fill="url(#cfBarGrad)" radius={[3, 3, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[90px] flex items-center justify-center"><p className="text-xs text-gray-300">No hires</p></div>
          )}
        </MiniCard>
      </div>

      {/* ── Row 3: Revenue breakdown + Profit margin trend ──────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Revenue contribution donut + progress bars */}
        <MiniCard>
          <MiniTitle>Revenue Split</MiniTitle>
          {pieData.length > 0 ? (
            <div className="flex items-center gap-3">
              <div className="w-[70px] h-[70px] flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={20} outerRadius={32} paddingAngle={3} dataKey="value" stroke="none">
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                {pieData.map((entry, i) => (
                  <div key={entry.name}>
                    <div className="flex justify-between items-center mb-0.5">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-[10px] text-gray-500">{entry.name}</span>
                      </div>
                      <span className="text-[10px] font-bold text-gray-700">{totalRevenue > 0 ? Math.round((entry.value / totalRevenue) * 100) : 0}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-gray-100">
                      <div className="h-full rounded-full" style={{ width: `${totalRevenue > 0 ? (entry.value / totalRevenue) * 100 : 0}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-xs text-gray-300 text-center py-4">No revenue data</p>}
        </MiniCard>

        {/* Profit margin over time sparkline */}
        <MiniCard>
          <MiniTitle icon={<Percent size={12} />}>Profit Margin %</MiniTitle>
          {profitTrendData.length > 0 ? (
            <>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-xl font-bold text-gray-800">{profitMarginPct}%</span>
                <span className="text-xs text-gray-400">overall</span>
              </div>
              <div className="h-[55px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={profitTrendData} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="marginGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="margin" name="Margin %" stroke="#10B981" strokeWidth={1.5} fill="url(#marginGrad)" dot={false} />
                    <RechartsTooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 10 }} formatter={(v: any) => [`${v}%`, 'Margin']} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : <p className="text-xs text-gray-300 text-center py-4">No margin data</p>}
        </MiniCard>
      </div>

      {/* ── Row 4: Revenue source breakdown progress bars ─────────── */}
      <MiniCard>
        <MiniTitle>Revenue Sources</MiniTitle>
        <div className="grid grid-cols-2 gap-x-6">
          <div>
            <ProgressBar label="Permanent (FTE)" value={metrics.candidateRevenue} max={totalRevenue} color="#7B43F1" />
            <ProgressBar label="Contractual" value={metrics.employeeRevenueINR} max={totalRevenue} color="#06B6D4" />
          </div>
          <div>
            <ProgressBar label="Profit" value={totalProfit} max={totalRevenue} color="#10B981" />
            <ProgressBar label="Cost" value={costAmount} max={totalRevenue} color="#F59E0B" />
          </div>
        </div>
      </MiniCard>
    </div>
  );
};

export default ClientFinancials;