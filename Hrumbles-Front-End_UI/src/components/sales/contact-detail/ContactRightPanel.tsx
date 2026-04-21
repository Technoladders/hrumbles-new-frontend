// Hrumbles-Front-End_UI/src/components/sales/contact-detail/ContactRightPanel.tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  Building2, Globe, Linkedin, MapPin, Users, Calendar,
  TrendingUp, Code2, Tag, ExternalLink, Coins, AlertCircle,
  Loader2, ChevronDown, ChevronUp, Pencil, Check, X,
  DatabaseZap, Search, Sparkles, Phone, Mail,
  ChevronLeft, ChevronRight, ListPlus,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import ReactDOM from 'react-dom';
import { saveDiscoveryToCRM } from '@/services/sales/discoveryService';
import { AddToListModal } from '@/components/sales/contacts-table/AddToListModal';
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer,
} from 'recharts';

// ── Twitter/Facebook SVG icons ────────────────────────────────────────────────
const TwitterIcon: React.FC<{ size?: number; className?: string }> = ({ size = 12, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.73-8.835L1.254 2.25H8.08l4.259 5.63z" />
  </svg>
);
const FacebookIcon: React.FC<{ size?: number; className?: string }> = ({ size = 12, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const PIE_COLORS = ['#7C3AED', '#a78bfa', '#c084fc', '#818cf8', '#6366f1', '#8b5cf6', '#9333ea'];

interface Props {
  contact: any;
  onCompanyFieldSave: (field: string, value: any) => Promise<void>;
  isSaving: boolean;
  organizationId: string;
  userId: string;
}

// ── Inline editable text ──────────────────────────────────────────────────────
const EditText: React.FC<{
  value: string; onSave: (v: string) => void;
  isSaving?: boolean; placeholder?: string; className?: string; multiline?: boolean;
}> = ({ value, onSave, isSaving, placeholder, className, multiline }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = React.useRef<any>(null);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  useEffect(() => { setDraft(value); }, [value]);
  const commit = async () => { if (draft.trim() !== value) await onSave(draft.trim()); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className={cn('group flex items-start gap-1 w-full text-left hover:opacity-80', className)}>
        <span className="flex-1 min-w-0">{value || <span className="text-slate-300 italic text-[10px]">{placeholder || 'Click to edit'}</span>}</span>
        <Pencil size={9} className="opacity-0 group-hover:opacity-40 text-slate-400 flex-shrink-0 mt-0.5" />
      </button>
    );
  }
  return (
    <div className="flex items-start gap-1.5 w-full">
      <div className="flex-1 rounded-lg p-[1px] bg-gradient-to-r from-purple-500 to-pink-500">
        {multiline
          ? <textarea ref={ref} value={draft} rows={3} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Escape' && cancel()} className="w-full bg-white rounded-[7px] px-2 py-1 text-xs focus:outline-none resize-none" />
          : <input ref={ref} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }} className="w-full bg-white rounded-[7px] px-2 py-0.5 text-xs focus:outline-none" />
        }
      </div>
      <button onClick={commit} disabled={isSaving} className="p-0.5 rounded bg-gradient-to-r from-purple-600 to-pink-600 text-white mt-0.5">
        {isSaving ? <Loader2 size={8} className="animate-spin" /> : <Check size={8} />}
      </button>
      <button onClick={cancel} className="p-0.5 rounded bg-slate-100 text-slate-500 mt-0.5"><X size={8} /></button>
    </div>
  );
};

// ── Social icon (click to open, pencil to edit) ───────────────────────────────
const SocialIcon: React.FC<{
  url: string | null; icon: React.ElementType; label: string;
  iconColor?: string; bgColor?: string;
  onEdit: () => void;
}> = ({ url, icon: Icon, label, iconColor = 'text-slate-500', bgColor = 'bg-slate-100', onEdit }) => (
  <div className="relative group">
    <button title={url ? `Open ${label}` : `Add ${label}`}
      onClick={() => { if (url) window.open(url, '_blank', 'noopener,noreferrer'); else onEdit(); }}
      className={cn(
        'flex h-6 w-6 items-center justify-center rounded-md transition-all',
        url ? cn(bgColor, 'hover:opacity-80') : 'bg-slate-50 border border-dashed border-slate-200 text-slate-300 hover:border-slate-400'
      )}>
      <Icon size={11} className={url ? iconColor : 'text-slate-300'} />
    </button>
    <button onClick={e => { e.stopPropagation(); onEdit(); }}
      className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-white border border-slate-200 rounded-full items-center justify-center hidden group-hover:flex shadow-sm">
      <Pencil size={7} className="text-slate-500" />
    </button>
  </div>
);

// ── Social edit portal ────────────────────────────────────────────────────────
const SocialEditPortal: React.FC<{
  open: boolean; onClose: () => void; label: string; value: string;
  onSave: (v: string) => void; isSaving?: boolean; placeholder?: string;
}> = ({ open, onClose, label, value, onSave, isSaving, placeholder }) => {
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (open) setDraft(value); }, [open, value]);
  if (!open) return null;
  const commit = () => { onSave(draft.trim()); onClose(); };
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/30" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-[300px] overflow-hidden">
        <div className="px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 flex items-center gap-2">
          <Pencil size={12} className="text-white/80" />
          <p className="text-xs font-bold text-white">Edit {label}</p>
        </div>
        <div className="p-4 space-y-3">
          <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onClose(); }}
            placeholder={placeholder || `Enter ${label} URL`}
            className="w-full h-8 px-3 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:border-purple-400" />
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 h-8 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={commit} disabled={isSaving} className="flex-1 h-8 text-xs rounded-lg text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90">
              {isSaving ? <Loader2 size={10} className="animate-spin mx-auto" /> : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ── Number formatter ──────────────────────────────────────────────────────────
const fmtNum = (n: any): string => {
  if (!n) return '—';
  const num = typeof n === 'string' ? parseInt(n.replace(/[^0-9]/g, '')) : n;
  if (isNaN(num)) return String(n);
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000)     return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000)         return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
};

// ── Seniority tabs for similar prospects ─────────────────────────────────────
const SENIORITY_TABS = [
  { id: 'all',      label: 'All' },
  { id: 'cxo',      label: 'CXO',      apiValues: ['owner', 'founder', 'c_suite', 'partner'] },
  { id: 'vp',       label: 'VP',        apiValues: ['vp', 'head'] },
  { id: 'director', label: 'Director',  apiValues: ['director'] },
  { id: 'manager',  label: 'Manager',   apiValues: ['manager'] },
  { id: 'senior',   label: 'Senior',    apiValues: ['senior'] },
];

// ── Main Component ────────────────────────────────────────────────────────────
export const ContactRightPanel: React.FC<Props> = ({ contact, onCompanyFieldSave, isSaving, organizationId, userId }) => {
  const { toast }    = useToast();
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const isEnriched   = !!contact.apollo_person_id;

  // Company data extraction
  const rawPerson  = contact?.enrichment_raw_responses?.[0]?.raw_json?.person || null;
  const rawOrg     = rawPerson?.organization || null;
  const enrichOrg  = contact?.enrichment_people?.[0]?.enrichment_organizations;
  const companyRec = contact?.companies;
  const hasCompany = !!companyRec?.id;

  // apollo_org_id from multiple sources
  const apolloOrgId = contact.apollo_org_id || rawOrg?.id || enrichOrg?.apollo_org_id || null;

  // Pull richer company data from enrichment_organizations table
  const { data: enrichOrgRow } = useQuery({
    queryKey: ['enrichment-org', apolloOrgId],
    queryFn: async () => {
      if (!apolloOrgId) return null;
      const { data } = await supabase
        .from('enrichment_organizations')
        .select('*')
        .eq('apollo_org_id', apolloOrgId)
        .maybeSingle();
      return data;
    },
    enabled: !!apolloOrgId,
    staleTime: 10 * 60 * 1000,
  });

  const org = {
    name:         rawOrg?.name           || enrichOrg?.name           || enrichOrgRow?.name           || companyRec?.name           || contact.company_name || 'Unknown Company',
    logoUrl:      rawOrg?.logo_url       || enrichOrg?.logo_url       || enrichOrgRow?.logo_url       || companyRec?.logo_url,
    website:      rawOrg?.website_url    || enrichOrg?.website_url    || enrichOrgRow?.website_url    || companyRec?.website,
    linkedinUrl:  rawOrg?.linkedin       || enrichOrg?.linkedin       || enrichOrgRow?.linkedin_url   || companyRec?.linkedin,
    twitterUrl:   rawOrg?.twitter_url    || enrichOrg?.twitter_url    || enrichOrgRow?.twitter_url    || companyRec?.twitter,
    facebookUrl:  rawOrg?.facebook_url   || enrichOrg?.facebook_url   || enrichOrgRow?.facebook_url   || companyRec?.facebook,
    industry:     rawOrg?.industry       || enrichOrg?.industry       || enrichOrgRow?.industry       || companyRec?.industry,
    // enrichment_organizations has short_description + seo_description — use both
    description:  rawOrg?.short_description || enrichOrg?.short_description || enrichOrgRow?.short_description || enrichOrgRow?.seo_description || companyRec?.description || companyRec?.about,
    city:         rawOrg?.city           || enrichOrg?.city           || enrichOrgRow?.city,
    state:        rawOrg?.state          || enrichOrg?.state          || enrichOrgRow?.state,
    country:      rawOrg?.country        || enrichOrg?.country        || enrichOrgRow?.country,
    employees:    rawOrg?.estimated_num_employees || enrichOrg?.estimated_num_employees || enrichOrgRow?.estimated_num_employees || companyRec?.employee_count,
    foundedYear:  rawOrg?.founded_year   || enrichOrg?.founded_year   || enrichOrgRow?.founded_year   || companyRec?.founded_year,
    annualRevenue: rawOrg?.annual_revenue_printed || enrichOrg?.annual_revenue_printed || enrichOrgRow?.annual_revenue_printed || companyRec?.revenue,
    totalFunding: rawOrg?.total_funding_printed   || enrichOrg?.total_funding_printed   || enrichOrgRow?.total_funding_printed,
    fundingStage: rawOrg?.latest_funding_stage    || enrichOrg?.latest_funding_stage    || enrichOrgRow?.latest_funding_stage,
    phone:        rawOrg?.primary_phone?.number   || enrichOrg?.primary_phone           || enrichOrgRow?.sanitized_phone || enrichOrgRow?.primary_phone || companyRec?.phone,
    marketCap:    enrichOrgRow?.market_cap,
    keywords:     [...(rawOrg?.keywords || []), ...(enrichOrg?.enrichment_org_keywords?.map((k: any) => k.keyword) || [])].filter((v, i, a) => a.indexOf(v) === i),
    technologies: [...(rawOrg?.current_technologies || []), ...(enrichOrg?.enrichment_org_technologies || [])].filter((t: any, i, a) => a.findIndex((x: any) => (x.name || x) === (t.name || t)) === i),
    departments:  enrichOrg?.enrichment_org_departments || rawOrg?.departments || [],
    fundingEvents: [...(rawOrg?.funding_events || []), ...(enrichOrg?.enrichment_org_funding_events || [])].sort((a: any, b: any) => (b.date ? new Date(b.date).getTime() : 0) - (a.date ? new Date(a.date).getTime() : 0)),
  };

  const location = [org.city, org.state, org.country].filter(Boolean).join(', ');

  // Company tab state
  const [companyTab, setCompanyTab] = useState<'tech' | 'keywords' | 'funding'>('tech');
  const [showAllTech, setShowAllTech] = useState(false);
  const [showAllKeywords, setShowAllKeywords] = useState(false);
  const [showAllFunding, setShowAllFunding] = useState(false);
  const [socialEdit, setSocialEdit] = useState<{ field: string; label: string; value: string; placeholder: string } | null>(null);

  // Similar prospects state
  const [activeSeniority, setActiveSeniority] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [listModalPerson, setListModalPerson] = useState<any>(null);
  const PAGE_SIZE = 10;

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchTerm); setCurrentPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset page when seniority changes
  useEffect(() => { setCurrentPage(1); }, [activeSeniority]);

  // Similar prospects query — paginated, across ALL companies by title keyword
  const { data: similarData, isLoading: similarLoading } = useQuery({
    queryKey: ['similar-prospects-apollo', contact.job_title, activeSeniority, debouncedSearch, currentPage],
    queryFn: async () => {
      const filters: any = {};

      // Seniority filter
      if (activeSeniority !== 'all') {
        const tab = SENIORITY_TABS.find(t => t.id === activeSeniority);
        if (tab?.apiValues) filters.person_seniorities = tab.apiValues;
      }

      // q_keywords only — person_titles is too strict
      const kw = (debouncedSearch || contact.job_title || '').trim();
      if (kw) filters.q_keywords = kw;

      if (!kw && activeSeniority === 'all') {
        return { people: [], total_entries: 0, total_pages: 0, source: 'empty' };
      }

      try {
        const { data, error } = await supabase.functions.invoke('apollo-people-search-v1', {
          body: { filters, page: currentPage, per_page: PAGE_SIZE }
        });
        if (error) throw new Error(error.message);
        return { ...(data || {}), source: 'apollo' };
      } catch (err) {
        // Fallback: CRM contacts with similar title
        const titleWord = kw.split(' ')[0] || '';
        const from = (currentPage - 1) * PAGE_SIZE;
        const { data, count } = await supabase
          .from('contacts')
          .select('id, name, job_title, company_name, photo_url, contact_stage, email, mobile', { count: 'exact' })
          .eq('organization_id', organizationId)
          .neq('id', contact.id)
          .ilike('job_title', `%${titleWord}%`)
          .range(from, from + PAGE_SIZE - 1);
        const total = count || 0;
        return {
          people: (data || []).map(c => ({ ...c, is_crm: true })),
          total_entries: total,
          total_pages: Math.ceil(total / PAGE_SIZE),
          source: 'crm_fallback',
        };
      }
    },
    enabled: !!(contact.job_title || debouncedSearch),
    staleTime: 60 * 1000,
  });

  const handleSaveTocrm = async (person: any) => {
    try {
      const savedContact = await saveDiscoveryToCRM(person.original_data || person, organizationId, userId);
      toast({ title: 'Lead Captured', description: `${person.name || person.first_name} added to CRM.` });
      queryClient.invalidateQueries({ queryKey: ['contacts-unified'] });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message });
    }
  };

  const similarPeople = useMemo(() => {
    if (!similarData?.people) return [];
    return similarData.people
      .filter((p: any) => p.id !== contact.apollo_person_id && p.id !== contact.id)
      .slice(0, 10);
  }, [similarData, contact]);

  const deptData = useMemo(() =>
    org.departments
      .filter((d: any) => (d.head_count || d.headcount || 0) > 0)
      .map((d: any) => ({ name: (d.department_name || d.name || 'Unknown').replace(/_/g, ' '), count: d.head_count || d.headcount || 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    [org.departments]
  );

  const companyTabContent = {
    tech: (
      org.technologies.length > 0 ? (
        <div>
          <div className="flex flex-wrap gap-1">
            {(showAllTech ? org.technologies : org.technologies.slice(0, 12)).map((tech: any, i: number) => {
              const name = tech.name || tech;
              return (
                <span key={i} className={cn('text-[9px] font-medium px-2 py-0.5 rounded-md border', i % 2 === 0 ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600' : 'text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600')}>
                  {name}
                </span>
              );
            })}
          </div>
          {org.technologies.length > 12 && (
            <button onClick={() => setShowAllTech(v => !v)} className="mt-2 text-[10px] font-semibold text-violet-600 hover:text-violet-700">
              {showAllTech ? '↑ Show less' : `↓ ${org.technologies.length - 12} more`}
            </button>
          )}
        </div>
      ) : <p className="text-[10px] text-slate-400 italic">{isEnriched ? 'No technology data found' : 'Enrich to reveal tech stack'}</p>
    ),
    keywords: (
      org.keywords.length > 0 ? (
        <div>
          <div className="flex flex-wrap gap-1">
            {(showAllKeywords ? org.keywords : org.keywords.slice(0, 16)).map((kw: string, i: number) => (
              <span key={i} className="text-[9px] font-medium text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 border border-slate-200 px-2 py-0.5 rounded-md hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200 transition-all cursor-default">
                {kw}
              </span>
            ))}
          </div>
          {org.keywords.length > 16 && (
            <button onClick={() => setShowAllKeywords(v => !v)} className="mt-2 text-[10px] font-semibold text-violet-600">{showAllKeywords ? '↑ Show less' : `↓ ${org.keywords.length - 16} more`}</button>
          )}
        </div>
      ) : <p className="text-[10px] text-slate-400 italic">{isEnriched ? 'No keywords found' : 'Enrich to reveal keywords'}</p>
    ),
    funding: (
      org.fundingEvents.length > 0 ? (
        <div className="space-y-1.5">
          {(showAllFunding ? org.fundingEvents : org.fundingEvents.slice(0, 3)).map((event: any, i: number) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 bg-slate-50 hover:bg-white hover:border-violet-200 transition-all">
              <Coins size={11} className="text-emerald-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-semibold text-slate-600">{event.type || event.funding_type || 'Funding Round'}</span>
                {event.date && <span className="text-[9px] text-slate-400 ml-1.5">{format(new Date(event.date), 'MMM yyyy')}</span>}
              </div>
              {(event.amount || event.amount_raised) && (
                <span className="text-[11px] font-bold text-slate-800 font-mono flex-shrink-0">
                  {event.currency || '$'}{fmtNum(event.amount || event.amount_raised)}
                </span>
              )}
            </div>
          ))}
          {org.fundingEvents.length > 3 && (
            <button onClick={() => setShowAllFunding(v => !v)} className="text-[10px] font-semibold text-violet-600">{showAllFunding ? '↑ Show less' : `↓ ${org.fundingEvents.length - 3} more`}</button>
          )}
        </div>
      ) : <p className="text-[10px] text-slate-400 italic">{isEnriched ? 'No funding data found' : 'Enrich to reveal funding history'}</p>
    ),
  };

  return (
    <div className="p-3 space-y-3">

      {/* ── Company Card ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="h-[2px] bg-gradient-to-r from-violet-500 to-purple-400 opacity-60" />
        <div className="p-3">
          {/* Company header row */}
          <div className="flex items-start gap-3 mb-2.5">
            {/* Logo — bigger (h-12 w-12) */}
            <div className="w-12 h-12 rounded-lg border border-slate-200 bg-slate-50 flex-shrink-0 flex items-center justify-center overflow-hidden shadow-sm">
              {org.logoUrl
                ? <img src={org.logoUrl} alt={org.name} className="w-full h-full object-contain p-1" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                : <Building2 size={20} className="text-slate-300" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <EditText
                  value={hasCompany ? (companyRec.name || '') : org.name}
                  onSave={v => onCompanyFieldSave('name', v)}
                  isSaving={isSaving}
                  placeholder="Company name"
                  className="text-sm font-bold text-slate-900 leading-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600"
                />
              </div>
              {/* Industry + location + founded */}
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <EditText
                  value={hasCompany ? (companyRec.industry || '') : (org.industry || '')}
                  onSave={v => onCompanyFieldSave('industry', v)}
                  isSaving={isSaving}
                  placeholder="Industry"
                  className="text-[10px] text-slate-500"
                />
                {location && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><MapPin size={8} />{location}</span>
                )}
                {org.foundedYear && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-0.5"><Calendar size={8} />Est. {org.foundedYear}</span>
                )}
              </div>
              {/* Social icons row */}
              <div className="flex items-center gap-1 mt-1.5">
                <SocialIcon
                  url={org.linkedinUrl} icon={Linkedin} label="LinkedIn"
                  iconColor="text-[#0A66C2]" bgColor="bg-[#0A66C2]/10"
                  onEdit={() => setSocialEdit({ field: 'linkedin', label: 'LinkedIn', value: org.linkedinUrl || '', placeholder: 'https://linkedin.com/company/...' })}
                />
                <SocialIcon
                  url={org.twitterUrl} icon={TwitterIcon} label="Twitter"
                  iconColor="text-slate-700" bgColor="bg-slate-100"
                  onEdit={() => setSocialEdit({ field: 'twitter', label: 'Twitter', value: org.twitterUrl || '', placeholder: 'https://twitter.com/company' })}
                />
                <SocialIcon
                  url={org.facebookUrl} icon={FacebookIcon} label="Facebook"
                  iconColor="text-[#1877F2]" bgColor="bg-[#1877F2]/10"
                  onEdit={() => setSocialEdit({ field: 'facebook', label: 'Facebook', value: org.facebookUrl || '', placeholder: 'https://facebook.com/company' })}
                />
                {org.website && (
                  <SocialIcon
                    url={org.website.startsWith('http') ? org.website : `https://${org.website}`}
                    icon={Globe} label="Website"
                    iconColor="text-slate-600" bgColor="bg-slate-100"
                    onEdit={() => setSocialEdit({ field: 'website', label: 'Website', value: org.website || '', placeholder: 'https://example.com' })}
                  />
                )}
              </div>
            </div>
            {/* KPI chips */}
            <div className="flex flex-col gap-1 text-right flex-shrink-0">
              {org.employees && (
                <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <Users size={8} />{fmtNum(org.employees)}
                </span>
              )}
              {org.annualRevenue && (
                <span className="text-[9px] bg-green-50 text-green-700 border border-green-100 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <TrendingUp size={8} />{org.annualRevenue}
                </span>
              )}
              {org.marketCap && (
                <span className="text-[9px] bg-violet-50 text-violet-700 border border-violet-100 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <Coins size={8} />{org.marketCap}
                </span>
              )}
              {org.fundingStage && (
                <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-full">
                  {org.fundingStage}
                </span>
              )}
            </div>
          </div>

          {/* About — always use org.description which has full fallback chain:
               rawOrg → enrichOrg → enrichOrgRow.short_description → enrichOrgRow.seo_description → companyRec.description */}
          {org.description ? (
            <div className="mb-2.5">
              <EditText
                value={org.description}
                onSave={v => onCompanyFieldSave('description', v)}
                isSaving={isSaving}
                placeholder="Add company description…"
                className="text-[11px] text-slate-600 leading-relaxed"
                multiline
              />
            </div>
          ) : hasCompany ? (
            <div className="mb-2.5">
              <EditText
                value=""
                onSave={v => onCompanyFieldSave('description', v)}
                isSaving={isSaving}
                placeholder="Add company description…"
                className="text-[11px] text-slate-600 leading-relaxed"
                multiline
              />
            </div>
          ) : null}

          {/* Phone */}
          {org.phone && (
            <div className="flex items-center gap-1.5 mb-2.5">
              <Phone size={10} className="text-slate-400" />
              <span className="text-[11px] text-slate-600 font-mono">{org.phone}</span>
            </div>
          )}

          {/* Dept breakdown mini */}
          {deptData.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-2.5">
              <div className="space-y-1">
                {deptData.slice(0, 4).map((dept: any, i: number) => {
                  const max = deptData[0].count;
                  const pct = (dept.count / max) * 100;
                  return (
                    <div key={i}>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[9px] text-slate-500 capitalize truncate">{dept.name}</span>
                        <span className="text-[9px] font-bold text-slate-700 font-mono">{dept.count.toLocaleString()}</span>
                      </div>
                      <div className="h-1 bg-slate-100 rounded-full">
                        <div className="h-1 rounded-full" style={{ width: `${pct}%`, background: '#7C3AED' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="h-[80px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={deptData} dataKey="count" cx="50%" cy="50%" innerRadius={20} outerRadius={36} paddingAngle={2}>
                      {deptData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Underline tabs: Tech Stack / Keywords / Funding */}
          <div className="border-t border-slate-100">
            {/* Tab header row */}
            <div className="flex border-b border-slate-100 -mb-px">
              {([
                { id: 'tech', label: 'Tech Stack', icon: Code2 },
                { id: 'keywords', label: 'Keywords', icon: Tag },
                { id: 'funding', label: 'Funding', icon: Coins },
              ] as const).map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setCompanyTab(id)}
                  className={cn(
                    'flex items-center gap-1 px-3 py-2 text-[10px] font-semibold transition-all whitespace-nowrap border-b-2',
                    companyTab === id
                      ? 'border-violet-600 text-violet-700 bg-white'
                      : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300 bg-transparent'
                  )}>
                  <Icon size={9} className={companyTab === id ? 'text-violet-500' : 'text-slate-300'} />
                  {label}
                </button>
              ))}
            </div>
            {/* Tab content */}
            <div className="pt-2.5">
              {companyTabContent[companyTab]}
            </div>
          </div>
        </div>
      </div>

      {/* ── Similar Prospects — with company, pagination, add to list ─── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-2 border-b border-slate-100 flex items-center gap-2 flex-wrap">
          <Users size={11} className="text-white" />
          <span className="text-[10px] font-bold text-white uppercase tracking-widest">Similar Prospects</span>
          <span className="text-[9px] text-white"> by title &amp; seniority</span>
          {/* {similarData?.source === 'apollo' && (
            <span className="ml-auto flex items-center gap-1 text-[9px] font-medium text-violet-600 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded-full">
              <Sparkles size={8} />Cloud
            </span>
          )} */}
        </div>

        {/* Filters row */}
        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 flex-wrap flex-1">
            {SENIORITY_TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveSeniority(tab.id)}
                className={cn(
                  'px-2 py-0.5 text-[9px] font-semibold rounded-full transition-all',
                  activeSeniority === tab.id ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                )}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={9} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search title..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="h-6 pl-5 pr-2 text-[10px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-purple-400 w-32" />
          </div>
        </div>

        {/* Column header */}
        <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 px-3 py-1 bg-slate-50/80 border-b border-slate-100">
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Person</span>
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Company</span>
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider w-10 text-center">Data</span>
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider w-16 text-right">Action</span>
        </div>

        {/* People rows */}
        <div>
          {similarLoading ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <Loader2 size={16} className="animate-spin text-slate-300" />
              <span className="text-[11px] text-slate-400">Searching...</span>
            </div>
          ) : similarPeople.length === 0 ? (
            <div className="py-8 text-center">
              <Users size={16} className="text-slate-200 mx-auto mb-1.5" />
              <p className="text-[11px] text-slate-400">No similar people found</p>
              <p className="text-[10px] text-slate-300 mt-0.5">Try adjusting seniority or search term</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {similarPeople.map((person: any, i: number) => {
                const isCrm      = !!person.is_crm;
                const name       = person.name || [person.first_name, person.last_name_obfuscated].filter(Boolean).join(' ') || 'Unknown';
                const title      = person.job_title || person.title || '';
                const company    = person.company_name || person.organization?.name || '';
                const compLogo   = person.organization?.logo_url || person.company_logo_url || '';
                const compDomain = person.organization?.primary_domain || person.organization?.website_url?.replace(/^https?:\/\//, '').split('/')[0] || '';
                const photoUrl   = person.photo_url;
                const initials   = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                const hasEmail   = !!(person.email || person.has_email);
                const hasPhone   = !!(person.mobile || person.has_direct_phone === 'Yes' || person.has_direct_phone === true);
                const phoneIsMaybe = !hasPhone && typeof person.has_direct_phone === 'string' && person.has_direct_phone.toLowerCase().includes('maybe');

                return (
                  <div key={person.id || i}
                    className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center px-3 py-2 hover:bg-slate-50 transition-colors group">
                    {/* Person col */}
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-6 w-6 flex-shrink-0 rounded-lg border border-slate-100">
                        <AvatarImage src={photoUrl} />
                        <AvatarFallback className={cn('text-[8px] font-bold rounded-lg', isCrm ? 'bg-indigo-100 text-indigo-600' : 'bg-violet-100 text-violet-600')}>
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        {isCrm
                          ? <button onClick={() => navigate(`/contacts/${person.id}`)} className="text-[10px] font-semibold text-slate-800 hover:text-indigo-600 truncate block max-w-[110px] text-left">{name}</button>
                          : <p className="text-[10px] font-semibold text-slate-800 truncate max-w-[110px]">{name}</p>
                        }
                        <p className="text-[8px] text-slate-400 truncate max-w-[110px]">{title}</p>
                      </div>
                    </div>

                    {/* Company col */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      {compLogo
                        ? <img src={compLogo} alt={company} className="h-5 w-5 rounded flex-shrink-0 object-contain border border-slate-100 p-0.5 bg-white" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        : company && <div className="h-5 w-5 rounded flex-shrink-0 bg-slate-100 flex items-center justify-center text-[7px] font-bold text-slate-500">{company[0]?.toUpperCase()}</div>
                      }
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-700 font-medium truncate max-w-[100px]">{company || '—'}</p>
                        {compDomain && <p className="text-[8px] text-slate-400 truncate max-w-[100px]">{compDomain}</p>}
                      </div>
                    </div>

                    {/* Data availability */}
                    <div className="flex items-center gap-1 w-10 justify-center">
                      <div className={cn('flex h-4 w-4 items-center justify-center rounded border',
                        hasEmail ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-50 border-dashed border-slate-200 text-slate-300')}
                        title={hasEmail ? 'Email available' : 'No email'}>
                        <Mail size={7} />
                      </div>
                      <div className={cn('flex h-4 w-4 items-center justify-center rounded border',
                        hasPhone ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                          : phoneIsMaybe ? 'bg-amber-50 border-dashed border-amber-200 text-amber-400'
                          : 'bg-slate-50 border-dashed border-slate-200 text-slate-300')}
                        title={hasPhone ? 'Phone available' : phoneIsMaybe ? 'Phone possible' : 'No phone'}>
                        <Phone size={7} />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 w-16 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Add to List */}
                      {!isCrm && (
                        <button onClick={() => setListModalPerson(person)}
                          title="Add to List"
                          className="flex items-center justify-center h-5 w-5 rounded bg-slate-50 border border-slate-200 hover:bg-violet-50 hover:border-violet-200 transition-colors">
                          <ListPlus size={8} className="text-slate-500 hover:text-violet-600" />
                        </button>
                      )}
                      {/* Save / View */}
                      {isCrm ? (
                        <button onClick={() => navigate(`/contacts/${person.id}`)}
                          className="flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 rounded hover:bg-slate-200">
                          View
                        </button>
                      ) : (
                        <button onClick={() => handleSaveTocrm(person)}
                          className="flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded hover:bg-indigo-100">
                          <DatabaseZap size={7} />Save
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination row */}
          {((similarData?.total_pages || 0) > 1 || (similarData?.total_entries || 0) > PAGE_SIZE) && (
            <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="text-[9px] text-slate-400">
                {similarData?.total_entries?.toLocaleString() || '—'} total · page {currentPage}
                {similarData?.total_pages ? ` of ${similarData.total_pages}` : ''}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center justify-center h-5 w-5 rounded border border-slate-200 bg-white text-slate-500 hover:bg-violet-50 hover:border-violet-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft size={10} />
                </button>
                <span className="text-[9px] font-semibold text-slate-600 min-w-[20px] text-center">{currentPage}</span>
                <button
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage >= (similarData?.total_pages || 1) && (similarData?.total_entries || 0) <= currentPage * PAGE_SIZE}
                  className="flex items-center justify-center h-5 w-5 rounded border border-slate-200 bg-white text-slate-500 hover:bg-violet-50 hover:border-violet-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight size={10} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add to List modal for discovery person */}
      {listModalPerson && (
        <AddToListModal
          open={!!listModalPerson}
          onOpenChange={(o) => { if (!o) setListModalPerson(null); }}
          personName={listModalPerson.name || [listModalPerson.first_name, listModalPerson.last_name_obfuscated].filter(Boolean).join(' ')}
          isFromDiscovery={true}
          onConfirm={async (fileId) => {
            try {
              // Save to CRM first, then add to list
              const saved = await saveDiscoveryToCRM(listModalPerson.original_data || listModalPerson, organizationId, userId);
              if (saved?.id && fileId) {
                await supabase.from('contact_workspace_files').upsert({
                  contact_id: saved.id, file_id: fileId, added_by: userId,
                }, { onConflict: 'contact_id,file_id' });
              }
              toast({ title: 'Added to List', description: 'Contact saved and added.' });
              queryClient.invalidateQueries({ queryKey: ['contacts-unified'] });
            } catch (err: any) {
              toast({ variant: 'destructive', title: 'Failed', description: err.message });
            } finally {
              setListModalPerson(null);
            }
          }}
          contactIds={[]}
        />
      )}

            {/* Social edit modal */}
      {socialEdit && (
        <SocialEditPortal
          open={!!socialEdit} onClose={() => setSocialEdit(null)}
          label={socialEdit.label} value={socialEdit.value}
          placeholder={socialEdit.placeholder} isSaving={isSaving}
          onSave={v => { onCompanyFieldSave(socialEdit.field, v); setSocialEdit(null); }}
        />
      )}
    </div>
  );
};

export default ContactRightPanel;