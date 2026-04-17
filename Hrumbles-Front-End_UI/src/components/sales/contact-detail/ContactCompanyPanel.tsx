// src/components/sales/contact-detail/ContactCompanyPanel.tsx
// Inline-editable company fields (writes to companies table), smart enrichment empty states, purple/pink theme
import React, { useState, useRef, useEffect } from 'react';
import {
  Building2, Globe, Linkedin, Twitter, Facebook,
  MapPin, Users, Calendar, TrendingUp,
  Code2, Tag, ExternalLink,
  BarChart2, Award, RefreshCw, Pencil, Check, X,
  Loader2, AlertCircle, Sparkles, Info, Coins, Banknote
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer
} from 'recharts';

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatNum = (n: any): string => {
  if (!n) return '—';
  const num = typeof n === 'string' ? parseInt(n.replace(/[^0-9]/g, '')) : n;
  if (isNaN(num)) return String(n);
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
};

const TECH_COLORS = [
  'bg-slate-100 text-slate-700 border-slate-200',
  'bg-violet-50 text-violet-600 border-violet-100',
  'bg-slate-100 text-slate-700 border-slate-200',
  'bg-violet-50 text-violet-600 border-violet-100',
  'bg-slate-100 text-slate-700 border-slate-200',
  'bg-violet-50 text-violet-600 border-violet-100',
  'bg-slate-100 text-slate-700 border-slate-200',
  'bg-violet-50 text-violet-600 border-violet-100',
];

const PIE_COLORS = ['#7C3AED', '#a78bfa', '#c084fc', '#818cf8', '#6366f1', '#8b5cf6', '#9333ea'];

// ── Shared card wrapper ───────────────────────────────────────────────────────
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("bg-white rounded-2xl border border-slate-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden", className)}>
    {children}
  </div>
);

const CardHeader: React.FC<{
  icon: React.ElementType;
  title: string;
  badge?: string | number;
  aside?: React.ReactNode;
}> = ({ icon: Icon, title, badge, aside }) => (
  <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Icon size={12} className="text-slate-400" />
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</span>
      {badge !== undefined && (
        <span className="text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">{badge}</span>
      )}
    </div>
    {aside}
  </div>
);

// ── Stat tile ─────────────────────────────────────────────────────────────────
const StatTile: React.FC<{
  icon: React.ElementType;
  value: string;
  label: string;
  accent: string;
}> = ({ icon: Icon, value, label, accent }) => (
  <div className={cn("rounded-lg p-2.5 border flex-1 min-w-0", accent)}>
    <Icon size={12} className="text-current opacity-40 mb-1.5" />
    <p className="text-[13px] font-black leading-none font-mono mt-1">{value}</p>
    <p className="text-[8px] font-bold uppercase tracking-widest mt-1 opacity-50">{label}</p>
  </div>
);

// ── Inline editable text field ────────────────────────────────────────────────
const EditableText: React.FC<{
  value: string;
  onSave: (v: string) => Promise<void>;
  isSaving?: boolean;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
}> = ({ value, onSave, isSaving, placeholder, className, multiline }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => { if (editing) (inputRef.current as any)?.focus(); }, [editing]);
  useEffect(() => { setDraft(value); }, [value]);

  const commit = async () => {
    if (draft.trim() !== value) await onSave(draft.trim());
    setEditing(false);
  };
  const cancel = () => { setDraft(value); setEditing(false); };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className={cn('group flex items-start gap-1 w-full text-left hover:opacity-80 transition-opacity', className)}
      >
        <span className="flex-1 min-w-0">
          {value || <span className="text-slate-300 italic text-[11px]">{placeholder || 'Click to edit'}</span>}
        </span>
        <Pencil size={10} className="opacity-0 group-hover:opacity-40 mt-0.5 text-slate-400 flex-shrink-0 transition-opacity" />
      </button>
    );
  }

  return (
    <div className="flex items-start gap-1.5 w-full">
      <div className="flex-1 rounded-lg p-[1px] bg-gradient-to-r from-purple-500 to-pink-500">
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={draft}
            rows={3}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') cancel(); }}
            className="w-full bg-white rounded-[7px] px-2 py-1.5 text-[13px] focus:outline-none resize-none"
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
            className="w-full bg-white rounded-[7px] px-2 py-1 text-[13px] focus:outline-none"
          />
        )}
      </div>
      <div className="flex flex-col gap-1 flex-shrink-0 mt-0.5">
        <button
          onClick={commit}
          disabled={isSaving}
          className="p-1 rounded-md bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90"
        >
          {isSaving ? <Loader2 size={9} className="animate-spin" /> : <Check size={9} />}
        </button>
        <button onClick={cancel} className="p-1 rounded-md bg-gray-100 text-gray-500 hover:bg-gray-200">
          <X size={9} />
        </button>
      </div>
    </div>
  );
};

// ── Detail row ────────────────────────────────────────────────────────────────
const DetailRow: React.FC<{
  label: string;
  value: string;
  field: string;
  onSave: (field: string, value: string) => Promise<void>;
  isSaving?: boolean;
  placeholder?: string;
  href?: string;
}> = ({ label, value, field, onSave, isSaving, placeholder, href }) => (
  <div>
    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    {href && value ? (
      <a href={href} target="_blank" rel="noreferrer"
        className="text-[12px] font-medium text-violet-600 hover:underline flex items-center gap-1">
        {value}<ExternalLink size={9} />
      </a>
    ) : (
      <EditableText
        value={value}
        onSave={v => onSave(field, v)}
        isSaving={isSaving}
        placeholder={placeholder}
        className="text-[12px] font-medium text-slate-700"
      />
    )}
  </div>
);

// ── Empty state ───────────────────────────────────────────────────────────────
const EmptyState: React.FC<{ message: string; sub?: string }> = ({ message, sub }) => (
  <div className="flex flex-col items-center py-8 px-4 text-center">
    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-2">
      <AlertCircle size={16} className="text-slate-300" />
    </div>
    <p className="text-xs font-medium text-slate-500 mb-0.5">{message}</p>
    {sub && <p className="text-[10px] text-slate-400 max-w-[200px] leading-relaxed">{sub}</p>}
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
interface Props {
  contact: any;
  onCompanyFieldSave: (field: string, value: any) => Promise<void>;
  isSaving: boolean;
}

export const ContactCompanyPanel: React.FC<Props> = ({ contact, onCompanyFieldSave, isSaving }) => {
  const [showAllTech, setShowAllTech] = useState(false);
  const [showAllKeywords, setShowAllKeywords] = useState(false);
  const [showAllFunding, setShowAllFunding] = useState(false);

  // Data extraction
  const rawPerson = contact?.enrichment_raw_responses?.[0]?.raw_json?.person || null;
  const rawOrg = rawPerson?.organization || null;
  const enrichOrg = contact?.enrichment_people?.[0]?.enrichment_organizations;
  const companyRecord = contact?.companies;
  const isEnriched = !!contact.apollo_person_id;
  const hasCompany = !!companyRecord?.id;

  const org = {
    name:            rawOrg?.name || enrichOrg?.name || companyRecord?.name || 'Unknown Company',
    logoUrl:         rawOrg?.logo_url || enrichOrg?.logo_url || companyRecord?.logo_url,
    website:         rawOrg?.website_url || enrichOrg?.website_url || companyRecord?.website,
    linkedinUrl:     rawOrg?.linkedin || enrichOrg?.linkedin || companyRecord?.linkedin,
    twitterUrl:      rawOrg?.twitter_url || enrichOrg?.twitter_url || companyRecord?.twitter_url,
    facebookUrl:     rawOrg?.facebook_url || enrichOrg?.facebook_url || companyRecord?.facebook_url,
    industry:        rawOrg?.industry || enrichOrg?.industry || companyRecord?.industry,
    description:     rawOrg?.short_description || rawOrg?.seo_description || enrichOrg?.short_description || companyRecord?.description || companyRecord?.about,
    city:            rawOrg?.city || enrichOrg?.city,
    state:           rawOrg?.state || enrichOrg?.state,
    country:         rawOrg?.country || enrichOrg?.country,
    employees:       rawOrg?.estimated_num_employees || enrichOrg?.estimated_num_employees || companyRecord?.employee_count,
    foundedYear:     rawOrg?.founded_year || enrichOrg?.founded_year || companyRecord?.founded_year,
    annualRevenue:   rawOrg?.annual_revenue_printed || enrichOrg?.annual_revenue_printed || companyRecord?.revenue,
    totalFunding:    rawOrg?.total_funding_printed || enrichOrg?.total_funding_printed,
    fundingStage:    rawOrg?.latest_funding_stage || enrichOrg?.latest_funding_stage,
    marketCap:       rawOrg?.market_cap || rawOrg?.market_cap_printed,
    tradingSymbol:   rawOrg?.publicly_traded_symbol || enrichOrg?.publicly_traded_symbol,
    tradingExchange: rawOrg?.publicly_traded_exchange || enrichOrg?.publicly_traded_exchange,
    phone:           rawOrg?.primary_phone?.number || enrichOrg?.primary_phone || companyRecord?.phone,
    ownedBy:         rawOrg?.owned_by_organization,
    subOrgs:         rawOrg?.num_suborganizations || 0,
    languages:       rawOrg?.languages || enrichOrg?.languages || [],
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
    ].sort((a: any, b: any) => (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0)),
    lastSynced: companyRecord?.intelligence_last_synced,
  };

  const location = [org.city, org.state, org.country].filter(Boolean).join(', ');
  const websiteUrl = org.website ? (org.website.startsWith('http') ? org.website : `https://${org.website}`) : null;

  const deptData = org.departments
    .filter((d: any) => (d.head_count || d.headcount || 0) > 0)
    .map((d: any) => ({
      name: (d.department_name || d.name || 'Unknown').replace(/_/g, ' '),
      count: d.head_count || d.headcount || 0,
    }))
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 8);

  const pieData = [...deptData.slice(0, 6)];
  const otherCount = deptData.slice(6).reduce((s: number, d: any) => s + d.count, 0);
  if (otherCount > 0) pieData.push({ name: 'Other', count: otherCount });

  return (
    <div className="p-3 space-y-3 max-w-3xl">

      {/* ── 1. Company Identity Header ─────────────────────────────── */}
      <Card>
        <div className="h-[2px] bg-gradient-to-r from-purple-500 to-pink-500 opacity-60" />
        <div className="p-3.5">
          <div className="flex items-start gap-4">
            {/* Logo */}
            <div className="w-14 h-14 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm">
              {org.logoUrl
                ? <img src={org.logoUrl} alt={org.name} className="w-full h-full object-contain p-1.5" />
                : <Building2 size={22} className="text-slate-300" />
              }
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Editable company name */}
                <EditableText
                  value={hasCompany ? (companyRecord.name || '') : ''}
                  onSave={v => onCompanyFieldSave('name', v)}
                  isSaving={isSaving}
                  placeholder={hasCompany ? 'Company name' : 'No company linked'}
                  className="text-[17px] font-black text-slate-900 leading-tight"
                />
                {org.tradingSymbol && (
                  <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-mono">
                    {org.tradingExchange?.toUpperCase()}: {org.tradingSymbol}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-1">
                {/* Editable industry */}
                <EditableText
                  value={hasCompany ? (companyRecord.industry || '') : (org.industry || '')}
                  onSave={v => onCompanyFieldSave('industry', v)}
                  isSaving={isSaving}
                  placeholder="Industry"
                  className="text-[11px] font-medium text-slate-500 flex items-center gap-1"
                />
                {location && (
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <MapPin size={10} />{location}
                  </span>
                )}
                {org.foundedYear && (
                  <span className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Calendar size={10} />Est. {org.foundedYear}
                  </span>
                )}
              </div>

              {/* Editable website + socials */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <EditableText
                  value={hasCompany ? (companyRecord.website || '') : (org.website || '')}
                  onSave={v => onCompanyFieldSave('website', v)}
                  isSaving={isSaving}
                  placeholder="Website URL"
                  className="text-[11px] text-violet-500"
                />
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
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Synced</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">{format(parseISO(org.lastSynced), 'MMM d, yyyy')}</p>
                <p className="text-[9px] text-slate-400">{formatDistanceToNow(parseISO(org.lastSynced), { addSuffix: true })}</p>
              </div>
            )}
          </div>

          {/* KPI tiles */}
          <div className="grid grid-cols-4 gap-1.5 mt-3">
            <StatTile icon={Users} value={org.employees ? formatNum(org.employees) : '—'} label="Employees" accent="bg-slate-50 border-slate-200 text-slate-700" />
            <StatTile icon={Coins} value={org.annualRevenue || '—'} label="Revenue" accent="bg-slate-50 border-slate-200 text-slate-700" />
            <StatTile icon={TrendingUp} value={org.totalFunding || '—'} label="Total Funding" accent="bg-slate-50 border-slate-200 text-slate-700" />
            <StatTile icon={Award} value={org.fundingStage || '—'} label="Stage" accent="bg-slate-50 border-slate-200 text-slate-700" />
          </div>
        </div>
      </Card>

      {/* ── 2. About (editable) ─────────────────────────────────────── */}
      <Card>
        <CardHeader icon={Building2} title="About" />
        <div className="p-3.5">
          {hasCompany ? (
            <EditableText
              value={companyRecord.description || companyRecord.about || ''}
              onSave={v => onCompanyFieldSave('description', v)}
              isSaving={isSaving}
              placeholder="Add a company description…"
              className="text-[13px] text-slate-600 leading-relaxed"
              multiline
            />
          ) : !isEnriched ? (
            <EmptyState message="No company linked" sub="Enrich this contact to get company intelligence from Apollo" />
          ) : !org.description ? (
            <EmptyState message="No description available" sub="Apollo enrichment didn't return a description for this company" />
          ) : (
            <p className="text-[13px] text-slate-600 leading-relaxed">{org.description}</p>
          )}

          {/* Additional editable details */}
          {hasCompany && (
            <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-100">
              <DetailRow
                label="HQ Phone"
                value={companyRecord.phone || org.phone || ''}
                field="phone"
                onSave={onCompanyFieldSave}
                isSaving={isSaving}
                placeholder="Add phone"
              />
              <DetailRow
                label="Founded Year"
                value={companyRecord.founded_year?.toString() || org.foundedYear?.toString() || ''}
                field="founded_year"
                onSave={onCompanyFieldSave}
                isSaving={isSaving}
                placeholder="e.g. 2010"
              />
              <DetailRow
                label="Employee Count"
                value={companyRecord.employee_count?.toString() || ''}
                field="employee_count"
                onSave={onCompanyFieldSave}
                isSaving={isSaving}
                placeholder="e.g. 500"
              />
              {org.ownedBy && (
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Parent Company</p>
                  <p className="text-[12px] font-semibold text-slate-700">{org.ownedBy.name}</p>
                </div>
              )}
              {org.languages.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Languages</p>
                  <p className="text-[12px] text-slate-600">{[...new Set(org.languages)].join(', ')}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* ── 3. Team Breakdown ──────────────────────────────────────── */}
      {deptData.length > 0 ? (
        <Card>
          <CardHeader icon={BarChart2} title="Team Breakdown" />
          <div className="p-3.5">
            <div className="grid grid-cols-[1fr_150px] gap-4">
              <div className="space-y-2">
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
                          style={{ width: `${pct}%`, background: '#7C3AED' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="h-[130px] flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={2}>
                      {pieData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <RTooltip contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </Card>
      ) : isEnriched ? (
        <Card>
          <CardHeader icon={BarChart2} title="Team Breakdown" />
          <EmptyState message="No department data found" sub="Apollo enrichment didn't return headcount breakdown for this company" />
        </Card>
      ) : null}

      {/* ── 4. Tech Stack ──────────────────────────────────────────── */}
      {org.technologies.length > 0 ? (
        <Card>
          <CardHeader icon={Code2} title="Technology Stack" badge={org.technologies.length} />
          <div className="p-3.5">
            <div className="flex flex-wrap gap-1.5">
              {(showAllTech ? org.technologies : org.technologies.slice(0, 12)).map((tech: any, i: number) => {
                const name = tech.name || tech;
                const cat = tech.category;
                return (
                  <span key={i} className={cn("text-[10px] font-semibold px-2.5 py-1 rounded-lg border", TECH_COLORS[i % TECH_COLORS.length])}
                    title={cat ? `Category: ${cat}` : ''}>
                    {name}
                    {cat && <span className="opacity-40 ml-1">· {cat}</span>}
                  </span>
                );
              })}
            </div>
            {org.technologies.length > 12 && (
              <button onClick={() => setShowAllTech(!showAllTech)}
                className="mt-3 text-[11px] font-semibold text-violet-600 hover:text-violet-700 transition-colors">
                {showAllTech ? '↑ Show less' : `↓ Show all ${org.technologies.length} technologies`}
              </button>
            )}
          </div>
        </Card>
      ) : isEnriched ? (
        <Card>
          <CardHeader icon={Code2} title="Technology Stack" />
          <EmptyState message="No tech stack data found" sub="Apollo enrichment didn't return technology data for this company" />
        </Card>
      ) : null}

      {/* ── 5. Keywords ────────────────────────────────────────────── */}
      {org.keywords.length > 0 ? (
        <Card>
          <CardHeader icon={Tag} title="Keywords & Topics" badge={org.keywords.length} />
          <div className="p-3.5">
            <div className="flex flex-wrap gap-1.5">
              {(showAllKeywords ? org.keywords : org.keywords.slice(0, 16)).map((kw: string, i: number) => (
                <span key={i} className="text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 rounded-lg hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200 transition-all cursor-default">
                  {kw}
                </span>
              ))}
            </div>
            {org.keywords.length > 16 && (
              <button onClick={() => setShowAllKeywords(!showAllKeywords)}
                className="mt-3 text-[11px] font-semibold text-violet-600 hover:text-violet-700 transition-colors">
                {showAllKeywords ? '↑ Show less' : `↓ ${org.keywords.length - 16} more keywords`}
              </button>
            )}
          </div>
        </Card>
      ) : isEnriched ? (
        <Card>
          <CardHeader icon={Tag} title="Keywords & Topics" />
          <EmptyState message="No keywords data" sub="Apollo enrichment didn't return keyword signals for this company" />
        </Card>
      ) : null}

      {/* ── 6. Funding History ─────────────────────────────────────── */}
      {org.fundingEvents.length > 0 ? (
        <Card>
          <CardHeader
            icon={Coins}
            title="Funding History"
            badge={org.fundingEvents.length}
            aside={org.totalFunding && (
              <div className="text-right">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Raised</p>
                <p className="text-[14px] font-black text-slate-800 font-mono">{org.totalFunding}</p>
              </div>
            )}
          />
          <div className="p-3.5 space-y-2">
            {(showAllFunding ? org.fundingEvents : org.fundingEvents.slice(0, 4)).map((event: any, i: number) => (
              <div key={i}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-violet-200 transition-all">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                  <Coins size={13} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                      {event.type || event.funding_type || 'Funding Round'}
                    </span>
                    {event.date && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {format(new Date(event.date), 'MMM yyyy')}
                      </span>
                    )}
                  </div>
                  {event.investors && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{event.investors}</p>}
                </div>
                {(event.amount || event.amount_raised) && (
                  <span className="text-[14px] font-black text-slate-800 font-mono flex-shrink-0">
                    {event.currency || '$'}{formatNum(event.amount || event.amount_raised)}
                  </span>
                )}
              </div>
            ))}
            {org.fundingEvents.length > 4 && (
              <button onClick={() => setShowAllFunding(!showAllFunding)}
                className="mt-1 text-[11px] font-semibold text-violet-600 hover:text-violet-700 transition-colors">
                {showAllFunding ? '↑ Show less' : `↓ ${org.fundingEvents.length - 4} more rounds`}
              </button>
            )}
          </div>
        </Card>
      ) : isEnriched ? (
        <Card>
          <CardHeader icon={Coins} title="Funding History" />
          <EmptyState message="No funding data" sub="Apollo enrichment didn't return funding rounds for this company" />
        </Card>
      ) : null}

      {/* ── Not enriched at all ─────────────────────────────────────── */}
      {!isEnriched && (
        <Card>
          <div className="flex flex-col items-center py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-3">
              <Building2 size={22} className="text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-500 mb-1">No company intelligence available</p>
            <p className="text-xs text-slate-400 max-w-[200px] leading-relaxed">
              Enrich this contact to pull tech stack, funding history, and team data from Apollo
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

// Twitter icon (not in lucide-react default set)
const Twitter: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.73-8.835L1.254 2.25H8.08l4.259 5.63z" />
  </svg>
);

const Facebook: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

export default ContactCompanyPanel;