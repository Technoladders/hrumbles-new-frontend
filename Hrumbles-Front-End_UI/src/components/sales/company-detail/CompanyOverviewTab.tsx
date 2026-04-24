// Hrumbles-Front-End_UI/src/components/sales/company-detail/CompanyOverviewTab.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useToast } from '@/hooks/use-toast';
import { saveDiscoveryToCRM } from '@/services/sales/discoveryService';

import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  VisibilityState,
  ColumnOrderState,
} from '@tanstack/react-table';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { DataTable } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { columns } from '@/components/sales/contacts-table/columns';
import { AddToListModal } from '@/components/sales/contacts-table/AddToListModal';

import {
  Search, Users, TrendingUp, DollarSign, Code2, Calendar,
  BarChart3, Loader2, Sparkles, Eye, ListPlus, Mail, Phone,
  Building2, PieChart as PieIcon, ChevronDown,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// ── Theme palette — all purple/indigo/violet cohesive ────────────────────────
const THEME = {
  card:       'bg-white border border-slate-200 rounded-xl overflow-hidden shadow-[0_1px_4px_rgba(99,102,241,0.07)]',
  headerBar:  'bg-gradient-to-r from-[#6d28d9] via-[#7c3aed] to-[#4f46e5]',
  tabActive:  'border-violet-600 text-violet-700 bg-violet-50/60',
  tabIdle:    'border-transparent text-slate-500 hover:text-violet-600 hover:border-violet-300',
  pill:       'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm',
  pillIdle:   'bg-slate-100 text-slate-500 hover:bg-violet-50 hover:text-violet-600',
  statColors: [
    { color: 'text-violet-700', bg: 'bg-violet-50',  border: 'border-violet-100' },
    { color: 'text-indigo-700', bg: 'bg-indigo-50',  border: 'border-indigo-100' },
    { color: 'text-purple-700', bg: 'bg-purple-50',  border: 'border-purple-100' },
    { color: 'text-violet-700', bg: 'bg-violet-50',  border: 'border-violet-100' },
  ],
};

// Pie slices all within violet-indigo-purple family
const PIE_COLORS = [
  '#7c3aed','#4f46e5','#6d28d9','#3730a3',
  '#8b5cf6','#6366f1','#a78bfa','#818cf8',
  '#5b21b6','#4338ca','#7e22ce','#312e81',
];

const SENIORITY_TABS = [
  { id: 'all',      label: 'All' },
  { id: 'cxo',      label: 'CXO',       apiValues: ['owner', 'founder', 'c_suite', 'partner'] },
  { id: 'vp',       label: 'VP',         apiValues: ['vp', 'head'] },
  { id: 'director', label: 'Director',   apiValues: ['director'] },
  { id: 'manager',  label: 'Manager',    apiValues: ['manager'] },
  { id: 'senior',   label: 'Senior',     apiValues: ['senior'] },
  { id: 'entry',    label: 'Entry',      apiValues: ['entry', 'intern'] },
];

// Fixed card height shared between insights and pie
const CARD_H = 460;

interface CompanyOverviewTabProps {
  company: any;
  refetchParent: () => void;
  employees?: any[];
  isLoadingEmployees?: boolean;
  onEditEmployee?: (emp: any) => void;
}

// ── Pie Tooltip ───────────────────────────────────────────────────────────────
const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-violet-100 rounded-lg shadow-lg px-2.5 py-1.5 z-50">
      <p className="text-[10px] font-bold text-slate-900 capitalize">{d.name}</p>
      <p className="text-[11px] font-bold text-violet-600">
        {d.value.toLocaleString()} <span className="text-[9px] font-normal text-slate-400">({d.payload.pct}%)</span>
      </p>
    </div>
  );
};

// ── DeptPiePanel ──────────────────────────────────────────────────────────────
const DeptPiePanel = ({ departments }: { departments: any[] }) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const active   = departments.filter(d => d.head_count > 0).sort((a, b) => b.head_count - a.head_count);
  const total    = active.reduce((s, d) => s + d.head_count, 0);
  const pieData  = active.slice(0, 10).map(d => ({
    name:  d.department_name?.replace(/_/g, ' ') || 'Unknown',
    value: d.head_count,
    pct:   total > 0 ? ((d.head_count / total) * 100).toFixed(1) : '0',
  }));
  if (active.length > 10) {
    const rest = active.slice(10).reduce((s, d) => s + d.head_count, 0);
    pieData.push({ name: 'Other', value: rest, pct: total > 0 ? ((rest / total) * 100).toFixed(1) : '0' });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`${THEME.headerBar} px-3 py-2 flex items-center gap-2 flex-shrink-0`}>
        <div className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center">
          <PieIcon size={11} className="text-white/90" />
        </div>
        <span className="text-[10px] font-bold text-white uppercase tracking-widest">Dept Breakdown</span>
        <span className="ml-auto text-[10px] font-bold text-white/60 font-mono">{total.toLocaleString()}</span>
      </div>

      {!active.length ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-2 py-8">
          <PieIcon size={20} className="text-slate-200" />
          <p className="text-[10px] text-slate-400">No department data</p>
          <p className="text-[9px] text-slate-300">Enrich company to reveal</p>
        </div>
      ) : (
        <>
          {/* Donut */}
          <div className="flex justify-center py-2 flex-shrink-0">
            <ResponsiveContainer width={180} height={140}>
              <PieChart>
                <Pie
                  data={pieData} cx="50%" cy="50%"
                  innerRadius={38} outerRadius={62}
                  paddingAngle={2} dataKey="value"
                  onMouseEnter={(_, i) => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {pieData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={PIE_COLORS[i % PIE_COLORS.length]}
                      opacity={hovered === null || hovered === i ? 1 : 0.35}
                      stroke="white" strokeWidth={2}
                    />
                  ))}
                </Pie>
                <RTooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend — scrollable */}
          <div className="px-3 pb-3 space-y-0.5 overflow-y-auto flex-1 min-h-0">
            {pieData.map((d, i) => (
              <div
                key={i}
                className={`flex items-center justify-between gap-2 px-2 py-1 rounded-lg cursor-default transition-colors ${hovered === i ? 'bg-violet-50' : 'hover:bg-slate-50'}`}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-[10px] text-slate-600 truncate capitalize">{d.name}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-[10px] font-bold text-slate-800 font-mono">{d.value.toLocaleString()}</span>
                  <span className="text-[9px] text-slate-400 w-8 text-right font-mono">{d.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// ── NoDataChart placeholder ───────────────────────────────────────────────────
const NoDataChart = ({ message, sub }: { message: string; sub?: string }) => {
  const fakeData = [3,5,4,6,3,5,7,4,6,5,3,4].map((v, i) => ({ x: i, v }));
  return (
    <div className="relative flex flex-col items-center justify-center h-[120px] gap-1.5 overflow-hidden rounded-xl bg-slate-50/60 border border-dashed border-slate-200">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={fakeData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="nd" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke="#7c3aed" strokeWidth={1.5} fill="url(#nd)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="relative z-10 text-center">
        <BarChart3 size={14} className="text-slate-300 mx-auto mb-1" />
        <p className="text-[10px] font-medium text-slate-400">{message}</p>
        {sub && <p className="text-[9px] text-slate-300 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

// ── Insight sub-panels ────────────────────────────────────────────────────────
const OverviewInsights = ({ company, enrichment }: any) => {
  const rawStats = [
    { label: 'Revenue',       value: enrichment?.annual_revenue_printed || company?.revenue,                                              icon: DollarSign, ...THEME.statColors[0] },
    { label: 'Employees',     value: enrichment?.estimated_num_employees ? Number(enrichment.estimated_num_employees).toLocaleString() : null, icon: Users,      ...THEME.statColors[1] },
    { label: 'Founded',       value: enrichment?.founded_year || company?.founded_year,                                                  icon: Calendar,   ...THEME.statColors[2] },
    { label: 'Total Funding', value: enrichment?.total_funding_printed,                                                                  icon: TrendingUp, ...THEME.statColors[3] },
  ].filter(s => s.value);

  return (
    <div className="space-y-2.5">
      {rawStats.length === 0 ? (
        <NoDataChart message="No overview data" sub="Enrich company to populate" />
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {rawStats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${stat.bg} ${stat.border}`}>
                <Icon size={10} className={stat.color} />
                <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">{stat.label}</span>
                <span className="text-[11px] font-bold text-slate-900 font-mono">{stat.value}</span>
              </div>
            );
          })}
        </div>
      )}
      {(enrichment?.short_description || company?.about || company?.description) && (
        <div className="bg-violet-50/50 rounded-lg p-3 border border-violet-100/60">
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {enrichment?.short_description || company?.about || company?.description}
          </p>
        </div>
      )}
    </div>
  );
};

const TechnologiesInsights = ({ technologies }: { technologies: any[] }) => {
  if (!technologies.length) return <NoDataChart message="No technologies detected" sub="Enrich to reveal tech stack" />;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-violet-50 border border-violet-100 rounded-lg">
        <Code2 size={11} className="text-violet-600" />
        <span className="text-[10px] font-semibold text-violet-800">{technologies.length} technologies detected</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {technologies.map((tech: any, i: number) => (
          <span key={i} className={cn(
            'text-[9px] font-medium px-1.5 py-0.5 rounded border',
            i % 3 === 0 ? 'bg-violet-50 text-violet-700 border-violet-100'
            : i % 3 === 1 ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
            : 'bg-purple-50 text-purple-700 border-purple-100',
          )}>
            {tech.name || tech}
          </span>
        ))}
      </div>
    </div>
  );
};

const FundingInsights = ({ fundingEvents, enrichment }: any) => {
  const totalFunding = enrichment?.total_funding_printed;
  if (!fundingEvents.length && !totalFunding) return <NoDataChart message="No funding data" sub="Enrich to reveal funding history" />;
  return (
    <div className="space-y-2">
      {totalFunding && (
        <div className="rounded-lg p-3 border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50">
          <DollarSign size={12} className="text-violet-600 mb-0.5" />
          <p className="text-[8px] font-bold text-violet-600 uppercase tracking-wider">Total Raised</p>
          <p className="text-[20px] font-bold text-violet-900 font-mono leading-none mt-0.5">{totalFunding}</p>
        </div>
      )}
      {fundingEvents.length > 0 && (
        <div className="space-y-1">
          {fundingEvents.slice(0, 5).map((ev: any, i: number) => (
            <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-violet-50/40 hover:border-violet-100 transition-all">
              <DollarSign size={10} className="text-violet-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-semibold text-slate-700">{ev.type || ev.funding_type || 'Round'}</span>
                {ev.date && <span className="text-[9px] text-slate-400 ml-1.5">{new Date(ev.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
              </div>
              {(ev.amount || ev.amount_raised) && (
                <span className="text-[10px] font-bold text-slate-800 font-mono">${Number(ev.amount || ev.amount_raised).toLocaleString()}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const KeywordsInsights = ({ keywords }: { keywords: string[] }) => {
  if (!keywords.length) return <NoDataChart message="No keywords available" sub="Enrich to reveal keywords" />;
  return (
    <div className="flex flex-wrap gap-1">
      {keywords.map((kw: string, i: number) => (
        <span key={i} className="text-[9px] font-medium text-violet-700 border border-violet-100 bg-violet-50/60 px-1.5 py-0.5 rounded hover:bg-violet-100 transition-all cursor-default">
          {kw}
        </span>
      ))}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export const CompanyOverviewTab: React.FC<CompanyOverviewTabProps> = ({
  company, refetchParent, employees = [], isLoadingEmployees = false, onEditEmployee,
}) => {
  const { toast }      = useToast();
  const queryClient    = useQueryClient();
  const navigate       = useNavigate();
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const user           = useSelector((state: any) => state.auth.user);

  const [activeInsightTab, setActiveInsightTab] = useState('overview');
  const [peopleTab,        setPeopleTab]        = useState<'crm' | 'discovery'>('discovery');
  const [activeSeniority,  setActiveSeniority]  = useState('all');
  const [searchTerm,       setSearchTerm]       = useState('');
  const [debouncedSearch,  setDebouncedSearch]  = useState('');
  const [listModalPerson,  setListModalPerson]  = useState<any>(null);
  const [savingPersonId,   setSavingPersonId]   = useState<string | null>(null);

  const [{ pageIndex: crmPageIdx,  pageSize: crmPageSize },  setCrmPagination]  = useState({ pageIndex: 0, pageSize: 25 });
  const [{ pageIndex: discPageIdx, pageSize: discPageSize }, setDiscPagination] = useState({ pageIndex: 0, pageSize: 25 });

  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(h);
  }, [searchTerm]);

  useEffect(() => {
    setCrmPagination({ pageIndex: 0, pageSize: 25 });
    setDiscPagination({ pageIndex: 0, pageSize: 25 });
  }, [activeSeniority, debouncedSearch, peopleTab]);

  // ── Enrichment data ──────────────────────────────────────────────────────
  const enrichment    = company?.enrichment_organizations;
  const technologies  = enrichment?.enrichment_org_technologies  || [];
  const fundingEvents = enrichment?.enrichment_org_funding_events || [];
  const departments   = enrichment?.enrichment_org_departments    || [];
  const keywords      = enrichment?.enrichment_org_keywords?.map((k: any) => k.keyword) || [];

  // ── Discovery query ──────────────────────────────────────────────────────
  const { data: discoveryData, isLoading: isLoadingDiscovery } = useQuery({
    queryKey: ['cloud-company-people', company.apollo_org_id, company.domain, activeSeniority, debouncedSearch, discPageIdx, discPageSize],
    queryFn: async () => {
      const filters: any = {};
      if (company.apollo_org_id) {
        filters.organization_ids = [company.apollo_org_id];
      } else if (company.domain || company.website) {
        const url    = company.website || company.domain;
        const domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        filters.q_organization_domains_list = [domain];
      } else {
        return { people: [], total_entries: 0 };
      }
      if (activeSeniority !== 'all') {
        const tabData = SENIORITY_TABS.find(t => t.id === activeSeniority);
        if (tabData?.apiValues) filters.person_seniorities = tabData.apiValues;
      }
      if (debouncedSearch) filters.q_keywords = debouncedSearch;
      const { data, error } = await supabase.functions.invoke('apollo-people-search-v1', {
        body: { filters, page: discPageIdx + 1, per_page: discPageSize },
      });
      if (error) throw error;
      return data;
    },
    enabled: peopleTab === 'discovery' && (!!company.apollo_org_id || !!company.domain || !!company.website),
  });

  const existingPersonIds = useMemo(() =>
    new Set(employees.map((p: any) => p.apollo_person_id).filter(Boolean)),
  [employees]);

  const discoveryLeadsMapped = useMemo(() => {
    if (!discoveryData?.people) return [];
    return discoveryData.people
      .filter((p: any) => !existingPersonIds.has(p.id))
      .map((p: any) => ({
        id: `temp-${p.id}`, apollo_person_id: p.id,
        name: [p.first_name, p.last_name_obfuscated].filter(Boolean).join(' ') || p.name || 'Unknown',
        job_title: p.title, company_name: p.organization?.name, company_logo: p.organization?.logo_url,
        photo_url: p.photo_url, contact_stage: 'Discovery', is_discovery: true,
        apollo_id: p.id, original_data: p,
        has_email: p.has_email,
        has_phone: p.has_direct_phone === 'Yes' || p.has_direct_phone === true,
        email_avail: p.has_email ? 'yes' : 'no',
        phone_avail: (p.has_direct_phone === 'Yes' || p.has_direct_phone === true) ? 'yes'
          : (typeof p.has_direct_phone === 'string' && p.has_direct_phone.toLowerCase().includes('maybe')) ? 'maybe' : 'no',
        city: p.city, state: p.state, country: p.country,
      }));
  }, [discoveryData, existingPersonIds]);

  const crmLeadsMapped = useMemo(() => {
    let filtered = employees;
    if (activeSeniority !== 'all') {
      const activeTabValues = SENIORITY_TABS.find(t => t.id === activeSeniority)?.apiValues || [];
      filtered = filtered.filter((c: any) => {
        let s = c.enrichment_people?.[0]?.enrichment_person_metadata?.seniority || c.seniority || 'other';
        s = s.toLowerCase().replace(/_/g, ' ');
        if (['c_suite', 'owner', 'founder', 'cxo', 'partner'].includes(s)) s = 'owner';
        if (s === 'vice president') s = 'vp';
        return activeTabValues.some(val => s.includes(val));
      });
    }
    if (debouncedSearch) {
      const lq = debouncedSearch.toLowerCase();
      filtered = filtered.filter((c: any) =>
        c.name?.toLowerCase().includes(lq) || c.job_title?.toLowerCase().includes(lq));
    }
    return filtered.map((c: any) => ({
      ...c, is_discovery: false,
      email_avail: c.email || c.enrichment_contact_emails?.length ? 'yes' : 'no',
      phone_avail: c.mobile || c.enrichment_contact_phones?.length ? 'yes' : 'no',
    }));
  }, [employees, debouncedSearch, activeSeniority]);

  const crmSeniorityCounts = useMemo(() => {
    const counts: Record<string, number> = { all: employees.length };
    employees.forEach((c: any) => {
      let s = c.enrichment_people?.[0]?.enrichment_person_metadata?.seniority || c.seniority || 'other';
      s = s.toLowerCase().replace(/_/g, ' ');
      if (['c_suite', 'owner', 'founder', 'cxo', 'partner'].includes(s)) s = 'owner';
      if (s === 'vice president') s = 'vp';
      const match = SENIORITY_TABS.find(t => t.apiValues?.some(v => s.includes(v)));
      if (match) counts[match.id] = (counts[match.id] || 0) + 1;
    });
    return counts;
  }, [employees]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSaveDiscovery = async (lead: any) => {
    try {
      const saved = await saveDiscoveryToCRM(lead.original_data || lead, organizationId, user.id);
      if (saved?.id && company.id) await supabase.from('contacts').update({ company_id: company.id }).eq('id', saved.id);
      toast({ title: 'Saved', description: `${lead.name} added to CRM.` });
      refetchParent();
      queryClient.invalidateQueries({ queryKey: ['company-contacts-all'] });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message });
    }
  };

  const handleSaveAndOpen = async (lead: any) => {
    const pid = lead.apollo_person_id || lead.id || String(Math.random());
    setSavingPersonId(pid);
    try {
      const saved = await saveDiscoveryToCRM(lead.original_data || lead, organizationId, user.id);
      if (saved?.id && company.id) await supabase.from('contacts').update({ company_id: company.id }).eq('id', saved.id);
      queryClient.invalidateQueries({ queryKey: ['contacts-unified'] });
      queryClient.invalidateQueries({ queryKey: ['company-contacts-all'] });
      if (saved?.id) navigate(`/contacts/${saved.id}`);
      else toast({ variant: 'destructive', title: 'Save failed', description: 'No contact ID returned.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message });
    } finally { setSavingPersonId(null); }
  };

  const handleEnrich = async (contactId: string, apolloId: string | null, type: 'email' | 'phone') => {
    try {
      toast({ title: 'Verifying…', description: `Checking ${type}` });
      const { data, error } = await supabase.functions.invoke('enrich-contact', {
        body: { contactId, apolloPersonId: apolloId, revealType: type, organizationId, userId: user.id },
      });
      if (error) throw error;
      if (data?.error) { toast({ variant: 'destructive', title: 'Error', description: data.message }); return; }
      toast({ title: 'Success', description: `${type} revealed!` });
      queryClient.invalidateQueries({ queryKey: ['company-contacts-all'] });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  // ── Column config ────────────────────────────────────────────────────────
  const columnVisibility = useMemo<VisibilityState>(() => {
    if (peopleTab === 'discovery') return {
      select: false, contact: false, company_name: false, location: false,
      contact_stage: false, medium: false, created_by_employee: false, created_at: false,
      seniority: false, departments: false, functions: false, industry: false,
      revenue: false, employee_count: false, updated_at: false,
      data_availability: true, name: true, job_title: true, actions: true,
    };
    return {
      select: false, data_availability: false, company_name: false,
      contact_stage: false, medium: false, created_by_employee: false, created_at: false,
      seniority: false, departments: false, functions: false, industry: false,
      revenue: false, employee_count: false, updated_at: false,
      name: true, contact: true, job_title: true, location: true, actions: true,
    };
  }, [peopleTab]);

  const columnOrder = useMemo<ColumnOrderState>(() =>
    peopleTab === 'discovery'
      ? ['name', 'data_availability', 'job_title', 'actions']
      : ['name', 'contact', 'job_title', 'location', 'actions'],
  [peopleTab]);

  const tableData = peopleTab === 'crm' ? crmLeadsMapped : discoveryLeadsMapped;
  const totalRows = peopleTab === 'crm' ? crmLeadsMapped.length : (discoveryData?.total_entries || 0);

  const [rowSelection, setRowSelection] = useState({});
  const table = useReactTable({
    data: tableData, columns,
    state: {
      pagination: peopleTab === 'crm'
        ? { pageIndex: crmPageIdx,  pageSize: crmPageSize }
        : { pageIndex: discPageIdx, pageSize: discPageSize },
      columnVisibility, columnOrder, rowSelection,
    },
    manualPagination: true,
    pageCount: Math.ceil(totalRows / (peopleTab === 'crm' ? crmPageSize : discPageSize)),
    onPaginationChange: u => { if (peopleTab === 'crm') setCrmPagination(u as any); else setDiscPagination(u as any); },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    meta: {
      saveDiscoveryLead: handleSaveDiscovery,
      saveToCRM:         handleSaveDiscovery,
      saveToCRMAndOpen:  handleSaveAndOpen,
      enrichContact:     handleEnrich,
      handleAssetAction: async () => queryClient.invalidateQueries({ queryKey: ['company-contacts-all'] }),
      isDiscoveryMode:   peopleTab === 'discovery',
      openListModal:     (c: any) => { if (c.is_discovery) setListModalPerson(c); else onEditEmployee?.(c); },
    },
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">

      {/* ── Row 1: Insights + Dept Pie — fixed equal height ─────────────── */}
      <div className="flex gap-3" style={{ height: CARD_H }}>

        {/* Insights card */}
        <div className={`${THEME.card} flex-1 min-w-0 flex flex-col`}>
          {/* Header */}
          <div className={`${THEME.headerBar} px-3 py-2 flex items-center gap-2 flex-shrink-0`}>
            <div className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center">
              <BarChart3 size={11} className="text-white/90" />
            </div>
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Company Insights</span>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-100 bg-slate-50/60 flex-shrink-0">
            {['overview', 'technologies', 'funding', 'keywords'].map(id => (
              <button
                key={id}
                onClick={() => setActiveInsightTab(id)}
                className={cn(
                  'px-4 py-2 text-[10px] font-semibold border-b-2 -mb-px whitespace-nowrap capitalize transition-all',
                  activeInsightTab === id ? THEME.tabActive : THEME.tabIdle,
                )}
              >
                {id}
              </button>
            ))}
          </div>

          {/* Tab content — scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 bg-white">
            {activeInsightTab === 'overview'     && <OverviewInsights company={company} enrichment={enrichment} />}
            {activeInsightTab === 'technologies' && <TechnologiesInsights technologies={technologies} />}
            {activeInsightTab === 'funding'      && <FundingInsights fundingEvents={fundingEvents} enrichment={enrichment} />}
            {activeInsightTab === 'keywords'     && <KeywordsInsights keywords={keywords} />}
          </div>
        </div>

        {/* Dept Pie card — fixed width, same height */}
        <div className={`${THEME.card} flex flex-col flex-shrink-0`} style={{ width: 240 }}>
          <DeptPiePanel departments={departments} />
        </div>
      </div>

      {/* ── Row 2: People Table ──────────────────────────────────────────── */}
      <div className={THEME.card}>
        {/* Header */}
        <div className={`${THEME.headerBar} px-3 py-2 flex items-center gap-2 flex-wrap flex-shrink-0`}>
          <div className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center">
            <Users size={11} className="text-white/90" />
          </div>
          <span className="text-[10px] font-bold text-white uppercase tracking-widest">
            People at {company.name}
          </span>

          {/* CRM / Discovery toggle */}
          <div className="flex items-center gap-0.5 bg-white/10 rounded-lg p-0.5 ml-2">
            <button
              onClick={() => setPeopleTab('discovery')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all',
                peopleTab === 'discovery' ? 'bg-white text-violet-700 shadow-sm' : 'text-white/70 hover:text-white',
              )}
            >
              <Sparkles size={9} className={peopleTab === 'discovery' ? 'text-violet-600' : 'text-white/60'} />
              Search
            </button>
            <button
              onClick={() => setPeopleTab('crm')}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all',
                peopleTab === 'crm' ? 'bg-white text-slate-800 shadow-sm' : 'text-white/70 hover:text-white',
              )}
            >
              CRM
              <span className="ml-1 opacity-60 font-mono text-[9px]">{employees.length}</span>
            </button>
          </div>
        </div>

        <div className="min-h-[280px] flex flex-col bg-white">
          {/* Filters */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50/50 flex-wrap">
            <div className="flex items-center gap-1 flex-wrap flex-1">
              {SENIORITY_TABS.map(tab => {
                const isActive = activeSeniority === tab.id;
                const crmCount = crmSeniorityCounts[tab.id];
                if (peopleTab === 'crm' && !crmCount && tab.id !== 'all') return null;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSeniority(tab.id)}
                    className={cn(
                      'px-2 py-0.5 text-[9px] font-semibold rounded-full transition-all whitespace-nowrap',
                      isActive ? THEME.pill : THEME.pillIdle,
                    )}
                  >
                    {tab.label}
                    {peopleTab === 'crm' && crmCount > 0 && (
                      <span className="ml-1 opacity-60">({crmCount})</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="relative flex-shrink-0">
              <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={peopleTab === 'crm' ? 'Search saved…' : 'Search cloud…'}
                className="h-6 pl-6 pr-3 w-40 text-[10px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition-all"
              />
            </div>
          </div>

          {/* Discovery tab */}
          {peopleTab === 'discovery' ? (
            isLoadingDiscovery ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Loader2 size={20} className="text-violet-500 animate-spin" />
                <p className="text-[11px] text-slate-400">Searching cloud database…</p>
              </div>
            ) : !company.apollo_org_id && !company.domain && !company.website ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Building2 size={20} className="text-slate-200" />
                <p className="text-[11px] text-slate-400">Company domain or Cloud ID required</p>
              </div>
            ) : discoveryLeadsMapped.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-1.5">
                <Users size={20} className="text-slate-200" />
                <p className="text-[11px] text-slate-400">No people found</p>
                <p className="text-[9px] text-slate-300">Try adjusting seniority or search</p>
              </div>
            ) : (
              <>
                {/* Column header */}
                <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-3 py-1 bg-slate-50/80 border-b border-slate-100">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Person</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider w-10 text-center">Data</span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider w-14 text-right">Action</span>
                </div>
                <div className="flex-1 divide-y divide-slate-50 overflow-y-auto max-h-[400px]">
                  {discoveryLeadsMapped.map((person: any, i: number) => {
                    const pid          = person.apollo_person_id;
                    const isSavingThis = savingPersonId === pid;
                    const hasEmail     = !!person.has_email;
                    const hasPhone     = person.phone_avail === 'yes';
                    const phoneIsMaybe = person.phone_avail === 'maybe';
                    return (
                      <div
                        key={i}
                        className="grid grid-cols-[1fr_auto_auto] gap-2 items-center px-3 py-1.5 hover:bg-violet-50/30 transition-colors group"
                      >
                        {/* Person */}
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-6 w-6 flex-shrink-0 rounded-lg border border-slate-100">
                            <AvatarImage src={person.photo_url} />
                            <AvatarFallback className="text-[8px] font-bold rounded-lg bg-violet-100 text-violet-600">
                              {person.name?.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <button
                              onClick={() => handleSaveAndOpen(person)}
                              disabled={isSavingThis}
                              className="text-[10px] font-semibold text-slate-800 hover:text-violet-600 truncate block max-w-[200px] text-left transition-colors disabled:opacity-60"
                            >
                              {isSavingThis
                                ? <span className="flex items-center gap-1"><Loader2 size={8} className="animate-spin" />Saving…</span>
                                : person.name}
                            </button>
                            <p className="text-[8px] text-slate-400 truncate max-w-[200px]">{person.job_title}</p>
                          </div>
                        </div>

                        {/* Data signals */}
                        <div className="flex items-center gap-1 w-10 justify-center">
                          <div className={cn(
                            'flex h-4 w-4 items-center justify-center rounded border',
                            hasEmail
                              ? 'bg-indigo-50 border-indigo-100 text-indigo-600'
                              : 'bg-slate-50 border-dashed border-slate-200 text-slate-300',
                          )} title={hasEmail ? 'Email available' : 'No email'}>
                            <Mail size={8} />
                          </div>
                          <div className={cn(
                            'flex h-4 w-4 items-center justify-center rounded border',
                            hasPhone     ? 'bg-violet-50 border-violet-100 text-violet-600'
                            : phoneIsMaybe ? 'bg-indigo-50 border-dashed border-indigo-200 text-indigo-400'
                            :               'bg-slate-50 border-dashed border-slate-200 text-slate-300',
                          )} title={hasPhone ? 'Phone available' : phoneIsMaybe ? 'Possible' : 'No phone'}>
                            <Phone size={8} />
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 w-14 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setListModalPerson(person)}
                            title="Add to List"
                            className="flex items-center justify-center h-5 w-5 rounded bg-slate-50 border border-slate-200 hover:bg-violet-50 hover:border-violet-200 transition-colors"
                          >
                            <ListPlus size={9} className="text-slate-500" />
                          </button>
                          <button
                            onClick={() => handleSaveAndOpen(person)}
                            disabled={isSavingThis}
                            title="Save & open"
                            className="flex items-center justify-center h-5 w-5 rounded bg-violet-50 border border-violet-200 hover:bg-violet-100 transition-colors disabled:opacity-50"
                          >
                            {isSavingThis
                              ? <Loader2 size={8} className="animate-spin text-violet-500" />
                              : <Eye size={8} className="text-violet-600" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {(discoveryData?.total_entries || 0) > discPageSize && (
                  <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <span className="text-[9px] text-slate-400">
                      {(discoveryData?.total_entries || 0).toLocaleString()} total · page {discPageIdx + 1}
                      {discoveryData?.total_pages ? ` of ${discoveryData.total_pages}` : ''}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setDiscPagination(p => ({ ...p, pageIndex: Math.max(0, p.pageIndex - 1) }))}
                        disabled={discPageIdx === 0}
                        className="h-5 w-5 rounded border border-slate-200 bg-white text-slate-500 hover:bg-violet-50 disabled:opacity-30 flex items-center justify-center"
                      >
                        <ChevronDown size={9} className="rotate-90" />
                      </button>
                      <span className="text-[9px] font-semibold text-slate-600 min-w-[16px] text-center">{discPageIdx + 1}</span>
                      <button
                        onClick={() => setDiscPagination(p => ({ ...p, pageIndex: p.pageIndex + 1 }))}
                        disabled={discPageIdx >= ((discoveryData?.total_pages || 1) - 1)}
                        className="h-5 w-5 rounded border border-slate-200 bg-white text-slate-500 hover:bg-violet-50 disabled:opacity-30 flex items-center justify-center"
                      >
                        <ChevronDown size={9} className="-rotate-90" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )
          ) : (
            /* CRM tab */
            <DndProvider backend={HTML5Backend}>
              {isLoadingEmployees ? (
                <div className="flex items-center justify-center py-12 gap-2">
                  <Loader2 size={18} className="text-violet-500 animate-spin" />
                  <p className="text-[11px] text-slate-400">Loading…</p>
                </div>
              ) : crmLeadsMapped.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-1.5">
                  <Users size={20} className="text-slate-200" />
                  <p className="text-[11px] text-slate-400">No contacts in CRM yet</p>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-x-auto border-b border-slate-100 custom-table-fix">
                    <style>{`.custom-table-fix th:first-child,.custom-table-fix td:first-child{left:0!important}`}</style>
                    <DataTable table={table} />
                  </div>
                  {tableData.length > 0 && (
                    <div className="bg-slate-50/80 py-1">
                      <DataTablePagination table={table} />
                    </div>
                  )}
                </>
              )}
            </DndProvider>
          )}
        </div>
      </div>

      {/* Add to List modal for discovery person */}
      {listModalPerson && (
        <AddToListModal
          open={!!listModalPerson}
          onOpenChange={o => { if (!o) setListModalPerson(null); }}
          personName={listModalPerson.name || 'Unknown'}
          isFromDiscovery={true}
          onConfirm={async (fileIds: string | string[]) => {
            const ids = Array.isArray(fileIds) ? fileIds : [fileIds];
            try {
              const saved = await saveDiscoveryToCRM(listModalPerson.original_data || listModalPerson, organizationId, user.id);
              if (saved?.id && ids.length) {
                const rows = ids.map(fid => ({ contact_id: saved.id, file_id: fid, added_by: user.id }));
                await supabase.from('contact_workspace_files').upsert(rows, { onConflict: 'contact_id,file_id' });
              }
              toast({ title: 'Added to List' });
              queryClient.invalidateQueries({ queryKey: ['contacts-unified'] });
            } catch (err: any) {
              toast({ variant: 'destructive', title: 'Failed', description: err.message });
            } finally { setListModalPerson(null); }
          }}
          contactIds={[]}
        />
      )}
    </div>
  );
};

export default CompanyOverviewTab;