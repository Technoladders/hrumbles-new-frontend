// src/components/sales/contact-detail/ContactCompanyPanel.tsx
// ✅ NEW FILE — Flat overview, no sub-tabs · All company data from raw JSON + enrichment tables
import React, { useState } from 'react';
import {
  Building2, Globe, Linkedin, Twitter, Facebook,
  MapPin, Users, DollarSign, Calendar, TrendingUp,
  Code2, Tag, Zap, ExternalLink, ChevronRight,
  BarChart2, Award, Layers, RefreshCw
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';

// ── Helpers ────────────────────────────────────────────────────────────────────
const formatNum = (n: any): string => {
  if (!n) return '—';
  const num = typeof n === 'string' ? parseInt(n.replace(/[^0-9]/g, '')) : n;
  if (isNaN(num)) return String(n);
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
};

// ── Section ────────────────────────────────────────────────────────────────────
const Section = ({
  icon: Icon, title, badge, children, noPad, aside
}: {
  icon: React.FC<any>; title: string; badge?: string | number;
  children: React.ReactNode; noPad?: boolean; aside?: React.ReactNode;
}) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
    <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon size={13} className="text-slate-400" />
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</span>
        {badge !== undefined && (
          <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">{badge}</span>
        )}
      </div>
      {aside}
    </div>
    <div className={noPad ? '' : 'p-5'}>{children}</div>
  </div>
);

// ── Stat tile ──────────────────────────────────────────────────────────────────
const StatTile = ({
  icon: Icon, value, label, accent
}: {
  icon: React.FC<any>; value: string; label: string; accent: string;
}) => (
  <div className={`rounded-xl p-3.5 border flex-1 min-w-0 ${accent}`}>
    <Icon size={13} className="text-current opacity-50 mb-2" />
    <p className="text-[16px] font-black leading-none font-mono">{value}</p>
    <p className="text-[9px] font-bold uppercase tracking-widest mt-1.5 opacity-60">{label}</p>
  </div>
);

// ── Tech badge colors ──────────────────────────────────────────────────────────
const TECH_COLORS = [
  'bg-blue-50 text-blue-700', 'bg-emerald-50 text-emerald-700',
  'bg-violet-50 text-violet-700', 'bg-amber-50 text-amber-700',
  'bg-sky-50 text-sky-700', 'bg-rose-50 text-rose-700',
];

const PIE_COLORS = [
  '#7C3AED', '#2563EB', '#059669', '#D97706',
  '#DC2626', '#0891B2', '#7C3AED', '#BE185D',
];

// ── Main Component ─────────────────────────────────────────────────────────────
export const ContactCompanyPanel: React.FC<{ contact: any }> = ({ contact }) => {
  const [showAllTech, setShowAllTech] = useState(false);
  const [showAllKeywords, setShowAllKeywords] = useState(false);
  const [showAllFunding, setShowAllFunding] = useState(false);

  // Company data extraction — multiple sources
  const rawPerson = contact?.enrichment_raw_responses?.[0]?.raw_json?.person || null;
  const rawOrg = rawPerson?.organization || null;
  const enrichOrg = contact?.enrichment_people?.[0]?.enrichment_organizations;
  const companyRecord = contact?.companies;

  // Merge data — raw JSON is richest, fall back to enrichment tables, then company record
  const org = {
    name:           rawOrg?.name || enrichOrg?.name || companyRecord?.name || 'Unknown Company',
    logoUrl:        rawOrg?.logo_url || enrichOrg?.logo_url || companyRecord?.logo_url,
    website:        rawOrg?.website_url || enrichOrg?.website_url || companyRecord?.website || companyRecord?.domain,
    linkedinUrl:    rawOrg?.linkedin_url || enrichOrg?.linkedin_url || companyRecord?.linkedin_url,
    twitterUrl:     rawOrg?.twitter_url || enrichOrg?.twitter_url || companyRecord?.twitter_url,
    facebookUrl:    rawOrg?.facebook_url || enrichOrg?.facebook_url || companyRecord?.facebook_url,
    industry:       rawOrg?.industry || enrichOrg?.industry || companyRecord?.industry,
    industries:     rawOrg?.industries || enrichOrg?.industries || [],
    description:    rawOrg?.short_description || rawOrg?.seo_description || enrichOrg?.short_description || companyRecord?.about || companyRecord?.description,
    city:           rawOrg?.city || enrichOrg?.city,
    state:          rawOrg?.state || enrichOrg?.state,
    country:        rawOrg?.country || enrichOrg?.country,
    address:        rawOrg?.raw_address || enrichOrg?.raw_address,
    employees:      rawOrg?.estimated_num_employees || enrichOrg?.estimated_num_employees || companyRecord?.employee_count,
    foundedYear:    rawOrg?.founded_year || enrichOrg?.founded_year || companyRecord?.founded_year,
    annualRevenue:  rawOrg?.annual_revenue_printed || enrichOrg?.annual_revenue_printed || companyRecord?.revenue,
    totalFunding:   rawOrg?.total_funding_printed || enrichOrg?.total_funding_printed,
    fundingStage:   rawOrg?.latest_funding_stage || enrichOrg?.latest_funding_stage,
    marketCap:      rawOrg?.market_cap || rawOrg?.market_cap_printed,
    tradingSymbol:  rawOrg?.publicly_traded_symbol || enrichOrg?.publicly_traded_symbol,
    tradingExchange:rawOrg?.publicly_traded_exchange || enrichOrg?.publicly_traded_exchange,
    phone:          rawOrg?.primary_phone?.number || enrichOrg?.primary_phone || companyRecord?.phone,
    ownedBy:        rawOrg?.owned_by_organization,
    subOrgs:        rawOrg?.num_suborganizations || 0,
    languages:      rawOrg?.languages || enrichOrg?.languages || [],
    sicCodes:       rawOrg?.sic_codes || enrichOrg?.sic_codes || [],
    naicsCodes:     rawOrg?.naics_codes || enrichOrg?.naics_codes || [],
    // Rich data only in raw
    keywords: [
      ...(rawOrg?.keywords || []),
      ...(enrichOrg?.enrichment_org_keywords?.map((k: any) => k.keyword) || [])
    ].filter((v, i, a) => a.indexOf(v) === i),
    technologies: [
      ...(rawOrg?.current_technologies || []),
      ...(enrichOrg?.enrichment_org_technologies || [])
    ].filter((t: any, i: number, a: any[]) => {
      const name = t.name || t;
      return a.findIndex((x: any) => (x.name || x) === name) === i;
    }),
    departments: enrichOrg?.enrichment_org_departments || rawOrg?.departments || [],
    fundingEvents: [
      ...(rawOrg?.funding_events || []),
      ...(enrichOrg?.enrichment_org_funding_events || [])
    ].sort((a: any, b: any) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    }),
    lastSynced: companyRecord?.intelligence_last_synced,
  };

  const location = [org.city, org.state, org.country].filter(Boolean).join(', ');
  const websiteUrl = org.website ? (org.website.startsWith('http') ? org.website : `https://${org.website}`) : null;

  // ── Department bar chart data ──────────────────────────────────────────────
  const deptData = org.departments
    .filter((d: any) => (d.head_count || d.headcount || 0) > 0)
    .map((d: any) => ({
      name: (d.department_name || d.name || 'Unknown').replace(/_/g, ' '),
      count: d.head_count || d.headcount || 0,
    }))
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 8);

  // ── Pie chart for dept split ──────────────────────────────────────────────
  const pieData = deptData.slice(0, 6);
  const otherCount = deptData.slice(6).reduce((s: number, d: any) => s + d.count, 0);
  if (otherCount > 0) pieData.push({ name: 'Other', count: otherCount });

  return (
    <div className="p-5 space-y-4 max-w-3xl">

      {/* ── 1. Company Identity Header ───────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
        {/* Gradient stripe */}
        <div className="h-1.5 bg-gradient-to-r from-violet-500 via-blue-500 to-emerald-500" />

        <div className="p-5">
          <div className="flex items-start gap-4">
            {/* Logo */}
            <div className="w-14 h-14 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex-shrink-0 flex items-center justify-center">
              {org.logoUrl
                ? <img src={org.logoUrl} alt={org.name} className="w-full h-full object-contain p-1" />
                : <Building2 size={24} className="text-slate-300" />
              }
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[18px] font-black text-slate-900 leading-tight">{org.name}</h2>
                {org.tradingSymbol && (
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-mono">
                    {org.tradingExchange?.toUpperCase()}: {org.tradingSymbol}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-1">
                {org.industry && (
                  <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                    <Building2 size={10} />{org.industry}
                  </span>
                )}
                {location && (
                  <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                    <MapPin size={10} />{location}
                  </span>
                )}
                {org.foundedYear && (
                  <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                    <Calendar size={10} />Est. {org.foundedYear}
                  </span>
                )}
              </div>

              {/* Social links */}
              <div className="flex items-center gap-2 mt-2">
                {websiteUrl && (
                  <a href={websiteUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 transition-colors">
                    <Globe size={11} />
                    <span className="max-w-[120px] truncate">
                      {org.website?.replace(/^https?:\/\/(www\.)?/, '')}
                    </span>
                    <ExternalLink size={9} />
                  </a>
                )}
                {org.linkedinUrl && (
                  <a href={org.linkedinUrl} target="_blank" rel="noreferrer"
                    className="p-1.5 rounded-lg bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20 transition-colors">
                    <Linkedin size={12} className="text-[#0A66C2]" />
                  </a>
                )}
                {org.twitterUrl && (
                  <a href={org.twitterUrl} target="_blank" rel="noreferrer"
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
                    <Twitter size={12} className="text-slate-700" />
                  </a>
                )}
                {org.facebookUrl && (
                  <a href={org.facebookUrl} target="_blank" rel="noreferrer"
                    className="p-1.5 rounded-lg bg-[#1877F2]/10 hover:bg-[#1877F2]/20 transition-colors">
                    <Facebook size={12} className="text-[#1877F2]" />
                  </a>
                )}
              </div>
            </div>

            {/* Last synced */}
            {org.lastSynced && (
              <div className="text-right flex-shrink-0">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Last Synced</p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  {format(parseISO(org.lastSynced), 'MMM d, yyyy')}
                </p>
                <p className="text-[10px] text-slate-400">
                  {formatDistanceToNow(parseISO(org.lastSynced), { addSuffix: true })}
                </p>
              </div>
            )}
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-4 gap-2.5 mt-4">
            <StatTile
              icon={Users}
              value={org.employees ? formatNum(org.employees) : '—'}
              label="Employees"
              accent="bg-blue-50 border-blue-100 text-blue-800"
            />
            <StatTile
              icon={DollarSign}
              value={org.annualRevenue || '—'}
              label="Annual Revenue"
              accent="bg-emerald-50 border-emerald-100 text-emerald-800"
            />
            <StatTile
              icon={TrendingUp}
              value={org.totalFunding || '—'}
              label="Total Funding"
              accent="bg-violet-50 border-violet-100 text-violet-800"
            />
            <StatTile
              icon={Award}
              value={org.fundingStage || '—'}
              label="Funding Stage"
              accent="bg-amber-50 border-amber-100 text-amber-800"
            />
          </div>
        </div>
      </div>

      {/* ── 2. About ─────────────────────────────────────────────────── */}
      {org.description && (
        <Section icon={Building2} title="About">
          <p className="text-[13px] text-slate-600 leading-relaxed">{org.description}</p>

          {/* Additional details grid */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
            {org.phone && (
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">HQ Phone</p>
                <p className="text-[12px] font-mono text-slate-600">{org.phone}</p>
              </div>
            )}
            {org.ownedBy && (
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Parent Company</p>
                <p className="text-[12px] font-semibold text-slate-700">{org.ownedBy.name}</p>
              </div>
            )}
            {org.subOrgs > 0 && (
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Subsidiaries</p>
                <p className="text-[12px] font-semibold text-slate-700">{org.subOrgs}</p>
              </div>
            )}
            {org.languages.length > 0 && (
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Languages</p>
                <p className="text-[12px] text-slate-600">{[...new Set(org.languages)].join(', ')}</p>
              </div>
            )}
            {org.sicCodes.length > 0 && (
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">SIC Codes</p>
                <div className="flex gap-1">
                  {org.sicCodes.map((c: string, i: number) => (
                    <span key={i} className="text-[10px] font-mono font-bold bg-slate-900 text-white px-1.5 py-0.5 rounded">{c}</span>
                  ))}
                </div>
              </div>
            )}
            {org.naicsCodes.length > 0 && (
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">NAICS Codes</p>
                <div className="flex gap-1">
                  {org.naicsCodes.map((c: string, i: number) => (
                    <span key={i} className="text-[10px] font-mono font-bold bg-slate-700 text-white px-1.5 py-0.5 rounded">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ── 3. Team Breakdown (departments) ─────────────────────────── */}
      {deptData.length > 0 && (
        <Section icon={BarChart2} title="Team Breakdown">
          <div className="grid grid-cols-[1fr_200px] gap-6">
            {/* Bar chart */}
            <div className="space-y-2.5">
              {deptData.map((dept: any, i: number) => {
                const max = deptData[0].count;
                const pct = (dept.count / max) * 100;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium text-slate-600 capitalize">{dept.name}</span>
                      <span className="text-[11px] font-bold text-slate-800 font-mono">{dept.count.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pie chart */}
            <div className="h-[160px] flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%" cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={2}
                  >
                    {pieData.map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '10px', border: '1px solid #e2e8f0',
                      fontSize: 11, boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Section>
      )}

      {/* ── 4. Tech Stack ────────────────────────────────────────────── */}
      {org.technologies.length > 0 && (
        <Section icon={Code2} title="Technology Stack" badge={org.technologies.length}>
          <div>
            <div className="flex flex-wrap gap-1.5">
              {(showAllTech ? org.technologies : org.technologies.slice(0, 12)).map((tech: any, i: number) => {
                const name = tech.name || tech;
                const cat = tech.category;
                const colorClass = TECH_COLORS[i % TECH_COLORS.length];
                return (
                  <span
                    key={i}
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg ${colorClass}`}
                    title={cat ? `Category: ${cat}` : ''}
                  >
                    {name}
                    {cat && <span className="opacity-50 ml-1">· {cat}</span>}
                  </span>
                );
              })}
            </div>
            {org.technologies.length > 12 && (
              <button
                onClick={() => setShowAllTech(!showAllTech)}
                className="mt-3 text-[11px] font-semibold text-violet-600 hover:text-violet-700"
              >
                {showAllTech ? '↑ Show less' : `↓ Show all ${org.technologies.length} technologies`}
              </button>
            )}
          </div>
        </Section>
      )}

      {/* ── 5. Keywords / Intent ─────────────────────────────────────── */}
      {org.keywords.length > 0 && (
        <Section icon={Tag} title="Keywords & Topics" badge={org.keywords.length}>
          <div>
            <div className="flex flex-wrap gap-1.5">
              {(showAllKeywords ? org.keywords : org.keywords.slice(0, 16)).map((kw: string, i: number) => (
                <span key={i} className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                  {kw}
                </span>
              ))}
            </div>
            {org.keywords.length > 16 && (
              <button
                onClick={() => setShowAllKeywords(!showAllKeywords)}
                className="mt-3 text-[11px] font-semibold text-violet-600 hover:text-violet-700"
              >
                {showAllKeywords ? '↑ Show less' : `↓ ${org.keywords.length - 16} more keywords`}
              </button>
            )}
          </div>
        </Section>
      )}

      {/* ── 6. Funding History ───────────────────────────────────────── */}
      {org.fundingEvents.length > 0 && (
        <Section
          icon={DollarSign}
          title="Funding History"
          badge={org.fundingEvents.length}
          aside={org.totalFunding && (
            <div className="text-right">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Raised</p>
              <p className="text-[15px] font-black text-emerald-700 font-mono">{org.totalFunding}</p>
            </div>
          )}
        >
          <div className="space-y-2">
            {(showAllFunding ? org.fundingEvents : org.fundingEvents.slice(0, 4)).map((event: any, i: number) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-violet-200 transition-all duration-150"
              >
                {/* Round type */}
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                  <DollarSign size={13} className="text-emerald-600" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md">
                      {event.type || event.funding_type || 'Funding Round'}
                    </span>
                    {event.date && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {format(new Date(event.date), 'MMM yyyy')}
                      </span>
                    )}
                  </div>
                  {event.investors && (
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">{event.investors}</p>
                  )}
                </div>

                {/* Amount */}
                {(event.amount || event.amount_raised) && (
                  <span className="text-[14px] font-black text-slate-800 font-mono flex-shrink-0">
                    {event.currency || '$'}{formatNum(event.amount || event.amount_raised)}
                  </span>
                )}
              </div>
            ))}
          </div>
          {org.fundingEvents.length > 4 && (
            <button
              onClick={() => setShowAllFunding(!showAllFunding)}
              className="mt-3 text-[11px] font-semibold text-violet-600 hover:text-violet-700"
            >
              {showAllFunding ? '↑ Show less' : `↓ ${org.fundingEvents.length - 4} more rounds`}
            </button>
          )}
        </Section>
      )}

      {/* ── Empty state if no company data found ─────────────────────── */}
      {!org.description && !org.employees && org.technologies.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
          <Building2 size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-400">No company intelligence available</p>
          <p className="text-xs text-slate-300 mt-1">Enrich this contact to pull company data from Apollo</p>
        </div>
      )}
    </div>
  );
};

export default ContactCompanyPanel;