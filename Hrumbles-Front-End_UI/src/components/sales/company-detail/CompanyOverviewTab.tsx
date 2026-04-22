// Hrumbles-Front-End_UI/src/components/sales/company-detail/CompanyOverviewTab.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
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
  ChevronUp, ChevronDown, Search, Users, TrendingUp, DollarSign,
  Code2, Briefcase, Calendar, BarChart3, Activity, PieChart as PieIcon,
  Loader2, Sparkles, Eye, DatabaseZap, ListPlus, Mail, Phone,
  Building2, MapPin, ExternalLink,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// ── Design tokens matching ContactRightPanel ──────────────────────────────────
const T = {
  card: "bg-white border border-slate-200 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
};

const PIE_COLORS = [
  '#5B4FE8','#16A34A','#D97706','#DC2626',
  '#2563EB','#7C3AED','#DB2777','#059669',
  '#0891B2','#92400E','#1D4ED8','#065F46',
];

const SENIORITY_TABS = [
  { id: 'all',      label: 'All People' },
  { id: 'cxo',      label: 'CXO',      apiValues: ['owner', 'founder', 'c_suite', 'partner'] },
  { id: 'vp',       label: 'VP',        apiValues: ['vp', 'head'] },
  { id: 'director', label: 'Director',  apiValues: ['director'] },
  { id: 'manager',  label: 'Manager',   apiValues: ['manager'] },
  { id: 'senior',   label: 'Senior',    apiValues: ['senior'] },
  { id: 'entry',    label: 'Entry',     apiValues: ['entry', 'intern'] },
];

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
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 z-50 relative">
      <p className="text-[11px] font-bold text-slate-900 capitalize">{d.name}</p>
      <p className="text-[12px] font-bold text-purple-600">{d.value.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">({d.payload.pct}%)</span></p>
    </div>
  );
};

// ── DeptPiePanel ──────────────────────────────────────────────────────────────
const DeptPiePanel = ({ departments }: { departments: any[] }) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const active = departments.filter(d => d.head_count > 0).sort((a, b) => b.head_count - a.head_count);
  const total  = active.reduce((s, d) => s + d.head_count, 0);
  const pieData = active.slice(0, 10).map(d => ({
    name: d.department_name?.replace(/_/g, ' ') || 'Unknown',
    value: d.head_count,
    pct: total > 0 ? ((d.head_count / total) * 100).toFixed(1) : '0',
  }));
  if (active.length > 10) {
    const rest = active.slice(10).reduce((s, d) => s + d.head_count, 0);
    pieData.push({ name: 'Other', value: rest, pct: total > 0 ? ((rest / total) * 100).toFixed(1) : '0' });
  }

  if (!active.length) return (
    <div className="flex flex-col items-center justify-center h-full py-8 gap-2">
      <PieIcon size={22} className="text-slate-200" />
      <p className="text-[11px] text-slate-400">No department data</p>
      <p className="text-[10px] text-slate-300">Enrich company to reveal</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/80">
        <div className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center"><PieIcon size={12} className="text-purple-600" /></div>
        <span className="text-[12px] font-semibold text-slate-900">Dept Breakdown</span>
        <span className="ml-auto text-[10px] font-bold text-slate-500 font-mono">{total.toLocaleString()}</span>
      </div>
      <div className="flex justify-center py-2">
        <ResponsiveContainer width={200} height={160}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={44} outerRadius={70} paddingAngle={2} dataKey="value" onMouseEnter={(_, i) => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} opacity={hovered === null || hovered === i ? 1 : 0.4} stroke="white" strokeWidth={2} />)}
            </Pie>
            <RTooltip content={<PieTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="px-4 pb-4 space-y-1 overflow-y-auto max-h-[220px]">
        {pieData.map((d, i) => (
          <div key={i} className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg cursor-default transition-colors ${hovered === i ? 'bg-slate-50' : ''}`} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
              <span className="text-[11px] text-slate-600 truncate capitalize">{d.name}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[11px] font-bold text-slate-900 font-mono">{d.value.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 w-10 text-right font-mono">{d.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── No-data placeholder with mini area chart shape ────────────────────────────


// ── Main Component ─────────────────────────────────────────────────────────────
export const CompanyOverviewTab: React.FC<CompanyOverviewTabProps> = ({
  company, refetchParent, employees = [], isLoadingEmployees = false, onEditEmployee,
}) => {
  const { toast }      = useToast();
  const queryClient    = useQueryClient();
  const navigate       = useNavigate();
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const user           = useSelector((state: any) => state.auth.user);

  const [insightsOpen,     setInsightsOpen]     = useState(true);
  const [leadsOpen,        setLeadsOpen]        = useState(true);
  const [activeInsightTab, setActiveInsightTab] = useState('overview');
  const [peopleTab,        setPeopleTab]        = useState<'crm' | 'discovery'>('discovery');
  const [activeSeniority,  setActiveSeniority]  = useState('all');
  const [searchTerm,       setSearchTerm]       = useState('');
  const [debouncedSearch,  setDebouncedSearch]  = useState('');
  const [listModalPerson,  setListModalPerson]  = useState<any>(null);
  const [savingPersonId,   setSavingPersonId]   = useState<string | null>(null);

  const [{ pageIndex: crmPageIdx, pageSize: crmPageSize }, setCrmPagination]   = useState({ pageIndex: 0, pageSize: 25 });
  const [{ pageIndex: discPageIdx, pageSize: discPageSize }, setDiscPagination] = useState({ pageIndex: 0, pageSize: 25 });

  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(h);
  }, [searchTerm]);

  useEffect(() => {
    setCrmPagination({ pageIndex: 0, pageSize: 25 });
    setDiscPagination({ pageIndex: 0, pageSize: 25 });
  }, [activeSeniority, debouncedSearch, peopleTab]);

  // ── Enrichment Data ──────────────────────────────────────────────────────
  const enrichment  = company?.enrichment_organizations;
  const technologies = enrichment?.enrichment_org_technologies || [];
  const fundingEvents = enrichment?.enrichment_org_funding_events || [];
  const departments  = enrichment?.enrichment_org_departments || [];
  const keywords     = enrichment?.enrichment_org_keywords?.map((k: any) => k.keyword) || [];

  // ── Discovery query ──────────────────────────────────────────────────────
  const { data: discoveryData, isLoading: isLoadingDiscovery } = useQuery({
    queryKey: ['cloud-company-people', company.apollo_org_id, company.domain, activeSeniority, debouncedSearch, discPageIdx, discPageSize],
    queryFn: async () => {
      const filters: any = {};
      if (company.apollo_org_id) {
        filters.organization_ids = [company.apollo_org_id];
      } else if (company.domain || company.website) {
        const url = company.website || company.domain;
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
        body: { filters, page: discPageIdx + 1, per_page: discPageSize }
      });
      if (error) throw error;
      return data;
    },
    enabled: peopleTab === 'discovery' && (!!company.apollo_org_id || !!company.domain || !!company.website)
  });

  const existingPersonIds = useMemo(() => new Set(employees.map((p: any) => p.apollo_person_id).filter(Boolean)), [employees]);

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
        has_email: p.has_email, has_phone: p.has_direct_phone === 'Yes' || p.has_direct_phone === true,
        email_avail: p.has_email ? 'yes' : 'no',
        phone_avail: (p.has_direct_phone === 'Yes' || p.has_direct_phone === true) ? 'yes' : (typeof p.has_direct_phone === 'string' && p.has_direct_phone.toLowerCase().includes('maybe')) ? 'maybe' : 'no',
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
      filtered = filtered.filter((c: any) => c.name?.toLowerCase().includes(lq) || c.job_title?.toLowerCase().includes(lq));
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

  // ── Table meta handlers ──────────────────────────────────────────────────
  const handleSaveDiscovery = async (lead: any) => {
    try {
      const saved = await saveDiscoveryToCRM(lead.original_data || lead, organizationId, user.id);
      if (saved?.id && company.id) await supabase.from('contacts').update({ company_id: company.id }).eq('id', saved.id);
      toast({ title: "Saved", description: `${lead.name} added to CRM.` });
      refetchParent();
      queryClient.invalidateQueries({ queryKey: ['company-contacts-all'] });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Save Failed", description: err.message });
    }
  };

  // Save + navigate to contact detail (same as ContactRightPanel)
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
      toast({ variant: "destructive", title: "Save Failed", description: err.message });
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
      data_availability: true, name: true, job_title: true, actions: true
    };
    return {
      select: false, data_availability: false, company_name: false,
      contact_stage: false, medium: false, created_by_employee: false, created_at: false,
      seniority: false, departments: false, functions: false, industry: false,
      revenue: false, employee_count: false, updated_at: false,
      name: true, contact: true, job_title: true, location: true, actions: true
    };
  }, [peopleTab]);

  const columnOrder = useMemo<ColumnOrderState>(() =>
    peopleTab === 'discovery' ? ['name', 'data_availability', 'job_title', 'actions'] : ['name', 'contact', 'job_title', 'location', 'actions'],
    [peopleTab]);

  const tableData = peopleTab === 'crm' ? crmLeadsMapped : discoveryLeadsMapped;
  const totalRows = peopleTab === 'crm' ? crmLeadsMapped.length : (discoveryData?.total_entries || 0);

  const [rowSelection, setRowSelection] = useState({});
  const table = useReactTable({
    data: tableData, columns,
    state: {
      pagination: peopleTab === 'crm' ? { pageIndex: crmPageIdx, pageSize: crmPageSize } : { pageIndex: discPageIdx, pageSize: discPageSize },
      columnVisibility, columnOrder, rowSelection,
    },
    manualPagination: true,
    pageCount: Math.ceil(totalRows / (peopleTab === 'crm' ? crmPageSize : discPageSize)),
    onPaginationChange: u => { if (peopleTab === 'crm') setCrmPagination(u as any); else setDiscPagination(u as any); },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    meta: {
      saveDiscoveryLead:  handleSaveDiscovery,
      saveToCRM:          handleSaveDiscovery,
      saveToCRMAndOpen:   handleSaveAndOpen,
      enrichContact:      handleEnrich,
      handleAssetAction:  async () => queryClient.invalidateQueries({ queryKey: ['company-contacts-all'] }),
      isDiscoveryMode:    peopleTab === 'discovery',
      openListModal:      (c: any) => { if (c.is_discovery) setListModalPerson(c); else onEditEmployee?.(c); },
    }
  });

  return (
    <div className="space-y-3">

      {/* ── Insights + Dept Pie ──────────────────────────────────────────── */}
      <div className="flex gap-3 items-stretch min-h-[420px]">
        <div className={`${T.card} flex-1 min-w-0 flex flex-col`}>
          {/* Header */}
          <div className="crmtheme-header-bar px-4 py-2.5 flex items-center gap-2">
            <BarChart3 size={13} className="text-white/80" />
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Company Insights</span>
            <button className="ml-auto w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" onClick={() => setInsightsOpen(!insightsOpen)}>
              {insightsOpen ? <ChevronUp size={12} className="text-white" /> : <ChevronDown size={12} className="text-white" />}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {insightsOpen && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Tab row */}
                <div className="flex border-b border-slate-100 bg-slate-50/80">
                  {['overview', 'technologies', 'funding', 'keywords'].map(id => (
                    <button key={id} onClick={() => setActiveInsightTab(id)}
                      className={cn('px-5 py-3 text-[11px] font-semibold border-b-2 -mb-px whitespace-nowrap capitalize transition-all',
                        activeInsightTab === id ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300')}>
                      {id}
                    </button>
                  ))}
                </div>
                <div className="flex-1 p-5 overflow-auto bg-white">
                  {activeInsightTab === 'overview'     && <OverviewInsights company={company} enrichment={enrichment} />}
                  {activeInsightTab === 'technologies' && <TechnologiesInsights technologies={technologies} />}
                  {activeInsightTab === 'funding'      && <FundingInsights fundingEvents={fundingEvents} enrichment={enrichment} />}
                  {activeInsightTab === 'keywords'     && <KeywordsInsights keywords={keywords} />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dept Pie */}
        <div className={`${T.card} w-[260px] min-w-[260px] flex-shrink-0 flex flex-col`}>
          <DeptPiePanel departments={departments} />
        </div>
      </div>

      {/* ── People Table ─────────────────────────────────────────────────── */}
      <div className={T.card}>
        {/* Section header */}
        <div className="crmtheme-header-bar px-4 py-2.5 flex items-center gap-3 flex-wrap">
          <Users size={13} className="text-white/80" />
          <span className="text-[10px] font-bold text-white uppercase tracking-widest">People at {company.name}</span>

          {/* CRM / Search tabs */}
          <div className="flex items-center gap-0.5 bg-white/10 rounded-lg p-0.5 ml-2">
            <button onClick={() => setPeopleTab('discovery')}
              className={cn('flex items-center gap-1 px-3 py-1 rounded-md text-[11px] font-semibold transition-all',
                peopleTab === 'discovery' ? 'bg-white text-purple-700 shadow-sm' : 'text-white/70 hover:text-white')}>
              <Sparkles size={10} className={peopleTab === 'discovery' ? 'text-purple-600' : 'text-white/60'} />Search
            </button>
            <button onClick={() => setPeopleTab('crm')}
              className={cn('flex items-center gap-1 px-3 py-1 rounded-md text-[11px] font-semibold transition-all',
                peopleTab === 'crm' ? 'bg-white text-slate-800 shadow-sm' : 'text-white/70 hover:text-white')}>
              CRM <span className="ml-1 opacity-60 font-mono text-[10px]">{employees.length}</span>
            </button>
          </div>

          <button className="ml-auto w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center" onClick={() => setLeadsOpen(!leadsOpen)}>
            {leadsOpen ? <ChevronUp size={12} className="text-white" /> : <ChevronDown size={12} className="text-white" />}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {leadsOpen && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="min-h-[300px] flex flex-col bg-white">

                {/* Filters */}
                <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 bg-slate-50/50 flex-wrap">
                  <div className="flex items-center gap-1 flex-wrap flex-1">
                    {SENIORITY_TABS.map(tab => {
                      const isActive   = activeSeniority === tab.id;
                      const crmCount   = crmSeniorityCounts[tab.id];
                      if (peopleTab === 'crm' && !crmCount && tab.id !== 'all') return null;
                      return (
                        <button key={tab.id} onClick={() => setActiveSeniority(tab.id)}
                          className={cn('px-2.5 py-1 text-[10px] font-semibold rounded-full transition-all whitespace-nowrap',
                            isActive ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200')}>
                          {tab.label}
                          {peopleTab === 'crm' && crmCount > 0 && <span className="ml-1 opacity-60">({crmCount})</span>}
                        </button>
                      );
                    })}
                  </div>
                  <div className="relative flex-shrink-0">
                    <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                      placeholder={peopleTab === 'crm' ? 'Search saved…' : 'Search cloud…'}
                      className="h-7 pl-7 pr-3 w-48 text-[11px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-purple-400 transition-colors" />
                  </div>
                </div>

                {/* Discovery: custom row renderer with save+open */}
                {peopleTab === 'discovery' ? (
                  isLoadingDiscovery ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                      <Loader2 size={22} className="text-purple-600 animate-spin" />
                      <p className="text-[12px] text-slate-400">Searching cloud database…</p>
                    </div>
                  ) : !company.apollo_org_id && !company.domain && !company.website ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2">
                      <Building2 size={22} className="text-slate-200" />
                      <p className="text-[12px] text-slate-400">Company domain or Cloud ID required</p>
                    </div>
                  ) : discoveryLeadsMapped.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2">
                      <Users size={22} className="text-slate-200" />
                      <p className="text-[12px] text-slate-400">No people found</p>
                      <p className="text-[10px] text-slate-300">Try adjusting seniority or search</p>
                    </div>
                  ) : (
                    <>
                      {/* Column header */}
                      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-1.5 bg-slate-50/80 border-b border-slate-100">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Person</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider w-10 text-center">Data</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider w-16 text-right">Action</span>
                      </div>
                      <div className="flex-1 divide-y divide-slate-50 overflow-y-auto max-h-[480px]">
                        {discoveryLeadsMapped.map((person: any, i: number) => {
                          const pid          = person.apollo_person_id;
                          const isSavingThis = savingPersonId === pid;
                          const hasEmail     = !!person.has_email;
                          const hasPhone     = person.phone_avail === 'yes';
                          const phoneIsMaybe = person.phone_avail === 'maybe';
                          return (
                            <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center px-4 py-2 hover:bg-slate-50 transition-colors group">
                              {/* Person */}
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Avatar className="h-7 w-7 flex-shrink-0 rounded-lg border border-slate-100">
                                  <AvatarImage src={person.photo_url} />
                                  <AvatarFallback className="text-[9px] font-bold rounded-lg bg-violet-100 text-violet-600">
                                    {person.name?.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <button onClick={() => handleSaveAndOpen(person)} disabled={isSavingThis}
                                    className="text-[11px] font-semibold text-slate-800 hover:text-indigo-600 truncate block max-w-[220px] text-left transition-colors disabled:opacity-60">
                                    {isSavingThis ? <span className="flex items-center gap-1"><Loader2 size={9} className="animate-spin" />Saving…</span> : person.name}
                                  </button>
                                  <p className="text-[9px] text-slate-400 truncate max-w-[220px]">{person.job_title}</p>
                                </div>
                              </div>
                              {/* Data signals */}
                              <div className="flex items-center gap-1 w-10 justify-center">
                                <div className={cn('flex h-5 w-5 items-center justify-center rounded border',
                                  hasEmail ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-50 border-dashed border-slate-200 text-slate-300')}
                                  title={hasEmail ? 'Email available' : 'No email'}>
                                  <Mail size={9} />
                                </div>
                                <div className={cn('flex h-5 w-5 items-center justify-center rounded border',
                                  hasPhone ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : phoneIsMaybe ? 'bg-amber-50 border-dashed border-amber-200 text-amber-400' : 'bg-slate-50 border-dashed border-slate-200 text-slate-300')}
                                  title={hasPhone ? 'Phone available' : phoneIsMaybe ? 'Possible' : 'No phone'}>
                                  <Phone size={9} />
                                </div>
                              </div>
                              {/* Actions */}
                              <div className="flex items-center gap-1 w-16 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setListModalPerson(person)} title="Add to List"
                                  className="flex items-center justify-center h-6 w-6 rounded bg-slate-50 border border-slate-200 hover:bg-violet-50 hover:border-violet-200 transition-colors">
                                  <ListPlus size={10} className="text-slate-500" />
                                </button>
                                <button onClick={() => handleSaveAndOpen(person)} disabled={isSavingThis} title="Save & open"
                                  className="flex items-center justify-center h-6 w-6 rounded bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors disabled:opacity-50">
                                  {isSavingThis ? <Loader2 size={9} className="animate-spin text-indigo-500" /> : <Eye size={9} className="text-indigo-600" />}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* Pagination info */}
                      {(discoveryData?.total_entries || 0) > discPageSize && (
                        <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                          <span className="text-[9px] text-slate-400">
                            {(discoveryData?.total_entries || 0).toLocaleString()} total · page {discPageIdx + 1}
                            {discoveryData?.total_pages ? ` of ${discoveryData.total_pages}` : ''}
                          </span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setDiscPagination(p => ({ ...p, pageIndex: Math.max(0, p.pageIndex - 1) }))} disabled={discPageIdx === 0}
                              className="h-6 w-6 rounded border border-slate-200 bg-white text-slate-500 hover:bg-violet-50 disabled:opacity-30 flex items-center justify-center">
                              <ChevronDown size={10} className="rotate-90" />
                            </button>
                            <span className="text-[9px] font-semibold text-slate-600 min-w-[20px] text-center">{discPageIdx + 1}</span>
                            <button onClick={() => setDiscPagination(p => ({ ...p, pageIndex: p.pageIndex + 1 }))}
                              disabled={discPageIdx >= ((discoveryData?.total_pages || 1) - 1)}
                              className="h-6 w-6 rounded border border-slate-200 bg-white text-slate-500 hover:bg-violet-50 disabled:opacity-30 flex items-center justify-center">
                              <ChevronDown size={10} className="-rotate-90" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )
                ) : (
                  /* CRM tab — use existing TanStack table */
                  <DndProvider backend={HTML5Backend}>
                    {isLoadingEmployees ? (
                      <div className="flex items-center justify-center py-16 gap-2">
                        <Loader2 size={18} className="text-purple-600 animate-spin" />
                        <p className="text-[12px] text-slate-400">Loading…</p>
                      </div>
                    ) : crmLeadsMapped.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-2">
                        <Users size={22} className="text-slate-200" />
                        <p className="text-[12px] text-slate-400">No contacts in CRM yet</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 overflow-x-auto border-b border-slate-100 custom-table-fix">
                          <style>{`.custom-table-fix th:first-child,.custom-table-fix td:first-child{left:0!important}`}</style>
                          <DataTable table={table} />
                        </div>
                        {tableData.length > 0 && <div className="bg-slate-50/80 py-1"><DataTablePagination table={table} /></div>}
                      </>
                    )}
                  </DndProvider>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add to List for discovery person */}
      {listModalPerson && (
        <AddToListModal
          open={!!listModalPerson}
          onOpenChange={o => { if (!o) setListModalPerson(null); }}
          personName={listModalPerson.name || 'Unknown'}
          isFromDiscovery={true}
          onConfirm={async (fileId) => {
            try {
              const saved = await saveDiscoveryToCRM(listModalPerson.original_data || listModalPerson, organizationId, user.id);
              if (saved?.id && fileId) {
                await supabase.from('contact_workspace_files').upsert({ contact_id: saved.id, file_id: fileId, added_by: user.id }, { onConflict: 'contact_id,file_id' });
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

// ── Insight subcomponents ─────────────────────────────────────────────────────
const OverviewInsights = ({ company, enrichment }: any) => {
  const stats = [
    { label: 'Revenue',       value: enrichment?.annual_revenue_printed || company?.revenue, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: DollarSign },
    { label: 'Employees',     value: enrichment?.estimated_num_employees ? Number(enrichment.estimated_num_employees).toLocaleString() : null, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100', icon: Users },
    { label: 'Founded',       value: enrichment?.founded_year || company?.founded_year, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-100', icon: Calendar },
    { label: 'Total Funding', value: enrichment?.total_funding_printed, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100', icon: TrendingUp },
  ].filter(s => s.value);

  return (
    <div className="space-y-3">
      {stats.length === 0 ? (
        <NoDataChart message="No overview data available" sub="Enrich the company to populate" />
      ) : (
        <div className="flex flex-wrap gap-2">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${stat.bg} ${stat.border}`}>
                <Icon size={12} className={stat.color} />
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{stat.label}</span>
                <span className="text-[12px] font-bold text-slate-900 font-mono">{stat.value}</span>
              </div>
            );
          })}
        </div>
      )}
      {(enrichment?.short_description || company?.about || company?.description) ? (
        <div className="bg-purple-50/60 rounded-xl p-4 border border-purple-100">
          <p className="text-[12px] text-slate-600 leading-relaxed">{enrichment?.short_description || company?.about || company?.description}</p>
        </div>
      ) : null}
    </div>
  );
};

const TechnologiesInsights = ({ technologies }: { technologies: any[] }) => {
  if (!technologies.length) return <NoDataChart message="No technologies detected" sub="Enrich to reveal tech stack" />;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-3 py-2.5 bg-purple-50 border border-purple-100 rounded-xl">
        <Code2 size={13} className="text-purple-600" />
        <span className="text-[12px] font-semibold text-purple-800">{technologies.length} technologies detected</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {technologies.map((tech: any, i: number) => (
          <span key={i} className={cn('text-[9px] font-medium px-2 py-0.5 rounded-md border', i % 2 === 0 ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-violet-50 text-violet-600 border-violet-100')}>
            {tech.name || tech}
          </span>
        ))}
      </div>
    </div>
  );
};

const FundingInsights = ({ fundingEvents, enrichment }: any) => {
  const totalFunding = enrichment?.total_funding_printed;
  if (!fundingEvents.length && !totalFunding) return <NoDataChart message="No funding data available" sub="Enrich to reveal funding history" />;
  return (
    <div className="space-y-3">
      {totalFunding && (
        <div className="rounded-xl p-4 border border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50">
          <DollarSign size={14} className="text-emerald-600 mb-1" />
          <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Total Raised</p>
          <p className="text-[22px] font-bold text-emerald-900 font-mono leading-none mt-1">{totalFunding}</p>
        </div>
      )}
      {fundingEvents.length > 0 && (
        <div className="space-y-1.5">
          {fundingEvents.slice(0, 5).map((ev: any, i: number) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 bg-slate-50 hover:bg-white hover:border-violet-200 transition-all">
              <DollarSign size={11} className="text-emerald-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-semibold text-slate-700">{ev.type || ev.funding_type || 'Round'}</span>
                {ev.date && <span className="text-[9px] text-slate-400 ml-1.5">{new Date(ev.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
              </div>
              {(ev.amount || ev.amount_raised) && (
                <span className="text-[11px] font-bold text-slate-800 font-mono">${Number(ev.amount || ev.amount_raised).toLocaleString()}</span>
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
    <div className="flex flex-wrap gap-1.5">
      {keywords.map((kw: string, i: number) => (
        <span key={i} className="text-[9px] font-medium text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600 border border-slate-200 px-2 py-0.5 rounded-md hover:bg-violet-50 hover:border-violet-200 transition-all cursor-default">
          {kw}
        </span>
      ))}
    </div>
  );
};

// ── Re-export NoDataChart for EmployeeGrowthIntelligence ──────────────────────
const NoDataChart = ({ message, sub }: { message: string; sub?: string }) => {
  const fakeData = [3,5,4,6,3,5,7,4,6,5,3,4].map((v, i) => ({ x: i, v }));
  return (
    <div className="relative flex flex-col items-center justify-center h-[150px] gap-2 overflow-hidden rounded-xl bg-slate-50/60 border border-dashed border-slate-200">
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={fakeData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <defs><linearGradient id="nd" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} /><stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient></defs>
            <Area type="monotone" dataKey="v" stroke="#8b5cf6" strokeWidth={1.5} fill="url(#nd)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="relative z-10 text-center">
        <BarChart3 size={16} className="text-slate-300 mx-auto mb-1.5" />
        <p className="text-[11px] font-medium text-slate-400">{message}</p>
        {sub && <p className="text-[10px] text-slate-300 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

export default CompanyOverviewTab;