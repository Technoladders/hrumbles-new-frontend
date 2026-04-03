// Hrumbles-Front-End_UI/src/components/sales/company-detail/CompanyOverviewTab.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useToast } from '@/hooks/use-toast';
import { saveDiscoveryToCRM } from '@/services/sales/discoveryService';

// TanStack & DnD
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  VisibilityState,
  ColumnOrderState,
} from '@tanstack/react-table';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Reused Table Components
import { DataTable } from '@/components/ui/data-table';
import { DataTablePagination } from '@/components/ui/data-table-pagination';
import { columns } from '@/components/sales/contacts-table/columns';

// Icons & Charts
import {
  ChevronUp, ChevronDown, Search,
  Users, TrendingUp, DollarSign,
  Code2, Briefcase, Calendar, BarChart3, Activity,
  PieChart as PieIcon, Loader2, Sparkles
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer } from 'recharts';

// ── Design Tokens ──────────────────────────────────────────────────────────
const T = {
  card: "bg-white border border-[#E5E0D8] rounded-2xl overflow-hidden",
  sectionHeader: "flex items-center justify-between px-5 py-3.5 border-b border-[#F0EDE8] bg-[#FDFCFB]",
  filterActive:  "bg-[#5B4FE8] text-white shadow-sm border border-[#5B4FE8]",
  filterInactive:"bg-white text-[#6A6057] border border-[#E5E0D8] hover:bg-[#F8F6F3] hover:text-[#1C1916]",
};

const PIE_COLORS =[
  '#5B4FE8','#16A34A','#D97706','#DC2626',
  '#2563EB','#7C3AED','#DB2777','#059669',
  '#0891B2','#92400E','#1D4ED8','#065F46',
];

// ── Static Seniority Map ───────────────────────────────────────────────────
const SENIORITY_TABS =[
  { id: 'all', label: 'All People' },
  { id: 'cxo', label: 'CXO / Founder', apiValues: ['owner', 'founder', 'c_suite', 'partner'] },
  { id: 'vp', label: 'VP', apiValues: ['vp', 'head'] },
  { id: 'director', label: 'Director', apiValues: ['director'] },
  { id: 'manager', label: 'Manager', apiValues: ['manager'] },
  { id: 'senior', label: 'Senior', apiValues:['senior'] },
  { id: 'entry', label: 'Entry / Intern', apiValues:['entry', 'intern'] },
];

// ── Types ──────────────────────────────────────────────────────────────────
interface CompanyOverviewTabProps {
  company: any;
  refetchParent: () => void;
  employees?: any[];
  isLoadingEmployees?: boolean;
  onEditEmployee?: (emp: any) => void;
}

// ── Pie Tooltip & Dept Panel ───────────────────────────────────────────────
const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-[#E5E0D8] rounded-xl shadow-lg px-3 py-2 z-50 relative">
      <p className="text-[11px] font-[700] text-[#1C1916] capitalize">{d.name}</p>
      <p className="text-[12px] font-[800] text-[#5B4FE8] font-['DM_Mono',monospace]">
        {d.value.toLocaleString()}
        <span className="text-[10px] font-[500] text-[#9C9189] ml-1">({d.payload.pct}%)</span>
      </p>
    </div>
  );
};

const DeptPiePanel = ({ departments }: { departments: any[] }) => {
  const[hovered, setHovered] = useState<number | null>(null);

  const active = departments.filter(d => d.head_count > 0).sort((a, b) => b.head_count - a.head_count);
  const total = active.reduce((s, d) => s + d.head_count, 0);

  const pieData = active.slice(0, 10).map(d => ({
    name: d.department_name?.replace(/_/g, ' ') || 'Unknown',
    value: d.head_count,
    pct: total > 0 ? ((d.head_count / total) * 100).toFixed(1) : '0',
  }));

  if (active.length > 10) {
    const rest = active.slice(10).reduce((s, d) => s + d.head_count, 0);
    pieData.push({ name: 'Other', value: rest, pct: total > 0 ? ((rest / total) * 100).toFixed(1) : '0' });
  }

  if (!active.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8 gap-2">
        <PieIcon size={22} className="text-[#D5CFC5]" />
        <p className="text-[11px] text-[#9C9189]">No dept data</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#F0EDE8] bg-[#FDFCFB]">
        <div className="w-6 h-6 rounded-lg bg-[#F0EEFF] flex items-center justify-center"><PieIcon size={12} className="text-[#5B4FE8]" /></div>
        <span className="text-[12px] font-[650] text-[#1C1916]">Dept Breakdown</span>
        <span className="ml-auto text-[10px] font-[700] text-[#9C9189] font-['DM_Mono',monospace]">{total.toLocaleString()}</span>
      </div>
      <div className="flex justify-center py-2">
        <ResponsiveContainer width={200} height={170}>
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={74} paddingAngle={2} dataKey="value" onMouseEnter={(_, i) => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} opacity={hovered === null || hovered === i ? 1 : 0.4} stroke="white" strokeWidth={2} />)}
            </Pie>
            <RTooltip content={<PieTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="px-4 pb-4 space-y-1 overflow-y-auto max-h-[240px]">
        {pieData.map((d, i) => (
          <div key={i} className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg cursor-default transition-colors ${hovered === i ? 'bg-[#F8F6F3]' : ''}`} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
              <span className="text-[11px] text-[#6A6057] truncate capitalize">{d.name}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[11px] font-[700] text-[#1C1916] font-['DM_Mono',monospace]">{d.value.toLocaleString()}</span>
              <span className="text-[10px] text-[#9C9189] w-10 text-right font-['DM_Mono',monospace]">{d.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Empty State ────────────────────────────────────────────────────────────
const EmptyState = ({ message, icon }: { message: string; icon: React.ReactNode }) => (
  <div className="py-10 flex flex-col items-center gap-3">
    <div className="w-14 h-14 rounded-2xl bg-[#F0EDE8] flex items-center justify-center text-[#D5CFC5]">{icon}</div>
    <p className="text-[12px] font-[500] text-[#9C9189]">{message}</p>
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────
export const CompanyOverviewTab: React.FC<CompanyOverviewTabProps> = ({
  company, refetchParent, employees =[], isLoadingEmployees = false, onEditEmployee,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const organizationId = useSelector((state: any) => state.auth.organization_id);
  const user = useSelector((state: any) => state.auth.user);

  // ── UI States ──
  const [insightsOpen, setInsightsOpen] = useState(true);
  const[leadsOpen, setLeadsOpen] = useState(true);
  const [activeInsightTab, setActiveInsightTab] = useState('overview');
  
  // Default to Discovery ('Search')
  const [peopleTab, setPeopleTab] = useState<'crm' | 'discovery'>('discovery');
  
  // ── Filter States ──
  const[activeSeniority, setActiveSeniority] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const[debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  },[searchTerm]);

  // Pagination states
  const[{ pageIndex: crmPageIdx, pageSize: crmPageSize }, setCrmPagination] = useState({ pageIndex: 0, pageSize: 25 });
  const[{ pageIndex: discPageIdx, pageSize: discPageSize }, setDiscPagination] = useState({ pageIndex: 0, pageSize: 25 });

  useEffect(() => {
    setCrmPagination({ pageIndex: 0, pageSize: 25 });
    setDiscPagination({ pageIndex: 0, pageSize: 25 });
  }, [activeSeniority, debouncedSearch, peopleTab]);

  // ── Data Parsers ──
  const enrichment = company?.enrichment_organizations;
  const companyData = company?.company_data || {};
  const technologies = enrichment?.enrichment_org_technologies || companyData?.current_technologies ||[];
  const fundingEvents = enrichment?.enrichment_org_funding_events || companyData?.funding_events || [];
  const departments = enrichment?.enrichment_org_departments ||[];
  const keywords = enrichment?.enrichment_org_keywords?.map((k: any) => k.keyword) || companyData?.keywords ||[];
  const allPeople = employees;

  // ── Cloud Discovery Query ──
  const { data: discoveryData, isLoading: isLoadingDiscovery } = useQuery({
    queryKey:['cloud-company-people', company.apollo_org_id, company.domain, activeSeniority, debouncedSearch, discPageIdx, discPageSize],
    queryFn: async () => {
      const filters: any = {};
      
      if (company.apollo_org_id) {
        filters.organization_ids = [company.apollo_org_id];
      } else if (company.domain || company.website) {
        const url = company.website || company.domain;
        const domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        filters.q_organization_domains_list = [domain];
      } else {
        return { people:[], total_entries: 0 };
      }

      if (activeSeniority !== 'all') {
        const tabData = SENIORITY_TABS.find(t => t.id === activeSeniority);
        if (tabData?.apiValues) {
          filters.person_seniorities = tabData.apiValues;
        }
      }

      if (debouncedSearch) {
        filters.q_keywords = debouncedSearch;
      }

      const { data, error } = await supabase.functions.invoke('apollo-people-search-v1', {
        body: { filters, page: discPageIdx + 1, per_page: discPageSize }
      });
      
      if (error) throw error;
      return data;
    },
    enabled: peopleTab === 'discovery' && (!!company.apollo_org_id || !!company.domain || !!company.website)
  });

  // ── Prepare Mapped Table Data ──
  const existingPersonIds = useMemo(() => new Set(employees.map((p: any) => p.apollo_person_id).filter(Boolean)), [employees]);
  
  const discoveryLeadsMapped = useMemo(() => {
    if (!discoveryData?.people) return[];
    return discoveryData.people
      .filter((p: any) => !existingPersonIds.has(p.id))
      .map((p: any) => ({
        id: `temp-${p.id}`,
        apollo_person_id: p.id,
        name:[p.first_name, p.last_name_obfuscated].filter(Boolean).join(' ') || p.name || 'Unknown',
        job_title: p.title,
        company_name: p.organization?.name,
        company_logo: p.organization?.logo_url,
        photo_url: p.photo_url,
        contact_stage: 'Discovery',
        is_discovery: true,
        apollo_id: p.id, // Keeping required DB keys
        original_data: p,
        has_email: p.has_email,
        has_phone: p.has_direct_phone === 'Yes' || p.has_direct_phone === true,
        email_avail: p.has_email ? 'yes' : 'no',
        phone_avail: (p.has_direct_phone === 'Yes' || p.has_direct_phone === true) ? 'yes' : (typeof p.has_direct_phone === 'string' && p.has_direct_phone.toLowerCase().includes('maybe')) ? 'maybe' : 'no',
        city: p.city, state: p.state, country: p.country,
      }));
  }, [discoveryData, existingPersonIds]);

  const crmLeadsMapped = useMemo(() => {
    let filtered = employees;

    if (activeSeniority !== 'all') {
      const activeTabValues = SENIORITY_TABS.find(t => t.id === activeSeniority)?.apiValues ||[];
      filtered = filtered.filter((c: any) => {
        let s = c.enrichment_people?.[0]?.enrichment_person_metadata?.seniority || c.seniority || 'other';
        s = s.toLowerCase().replace(/_/g, ' ');
        if (s === 'c_suite' || s === 'owner' || s === 'founder' || s === 'cxo' || s === 'partner') s = 'owner';
        if (s === 'vice president') s = 'vp';
        return activeTabValues.some(val => s.includes(val));
      });
    }

    if (debouncedSearch) {
      const lowerQ = debouncedSearch.toLowerCase();
      filtered = filtered.filter((c: any) => 
        c.name?.toLowerCase().includes(lowerQ) || c.job_title?.toLowerCase().includes(lowerQ)
      );
    }

    return filtered.map((c: any) => ({
      ...c,
      is_discovery: false,
      email_avail: c.email || c.enrichment_contact_emails?.length ? 'yes' : (c.masked_has_email ? 'yes' : 'no'),
      phone_avail: c.mobile || c.enrichment_contact_phones?.length ? 'yes' : (c.masked_has_phone ? 'yes' : 'no'),
    }));
  },[employees, debouncedSearch, activeSeniority]);

  const crmSeniorityCounts = useMemo(() => {
    const counts: Record<string, number> = { all: employees.length };
    
    employees.forEach((c: any) => {
      let s = c.enrichment_people?.[0]?.enrichment_person_metadata?.seniority || c.seniority || 'other';
      s = s.toLowerCase().replace(/_/g, ' ');
      if (s === 'c_suite' || s === 'owner' || s === 'founder' || s === 'cxo' || s === 'partner') s = 'owner';
      if (s === 'vice president') s = 'vp';

      const matchedTab = SENIORITY_TABS.find(t => t.apiValues?.some(v => s.includes(v)));
      if (matchedTab) {
        counts[matchedTab.id] = (counts[matchedTab.id] || 0) + 1;
      }
    });
    return counts;
  },[employees]);


  // ── Table Meta Actions ──
  const handleSaveDiscovery = async (lead: any) => {
    try {
      const savedContact = await saveDiscoveryToCRM(lead.original_data || lead, organizationId, user.id);
      if (savedContact?.id && company.id) {
        await supabase.from('contacts').update({ company_id: company.id }).eq('id', savedContact.id);
      }
      toast({ title: "Contact Saved", description: `${lead.name} added to CRM.` });
      refetchParent();
      queryClient.invalidateQueries({ queryKey:['company-contacts-all'] });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Save Failed", description: error.message });
    }
  };

  const handleEnrich = async (contactId: string, apolloId: string | null, type: 'email' | 'phone') => {
    try {
      toast({ title: 'Verifying…', description: `Checking ${type}` });
      const { data, error } = await supabase.functions.invoke('enrich-contact', {
        body: { contactId, apolloPersonId: apolloId, revealType: type, organizationId, userId: user.id },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ variant: 'destructive', title: 'Error', description: data.message });
        return;
      }
      toast({ title: 'Success', description: `${type} revealed successfully!` });
      queryClient.invalidateQueries({ queryKey: ['company-contacts-all'] });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  const handleAssetAction = async () => {
    queryClient.invalidateQueries({ queryKey:['company-contacts-all'] });
  };

  // ── Dynamic Column Config ──
  const columnVisibility = useMemo<VisibilityState>(() => {
    if (peopleTab === 'discovery') {
      return {
        select: false, contact: false, company_name: false, location: false,
        contact_stage: false, medium: false, created_by_employee: false, created_at: false,
        seniority: false, departments: false, functions: false, industry: false,
        revenue: false, employee_count: false, updated_at: false,
        data_availability: true, name: true, job_title: true, actions: true
      };
    } else {
      return {
        select: false, data_availability: false, company_name: false,
        contact_stage: false, medium: false, created_by_employee: false, created_at: false,
        seniority: false, departments: false, functions: false, industry: false,
        revenue: false, employee_count: false, updated_at: false,
        name: true, contact: true, job_title: true, location: true, actions: true
      };
    }
  },[peopleTab]);

  const columnOrder = useMemo<ColumnOrderState>(() => {
    if (peopleTab === 'discovery') {
      return ['name', 'data_availability', 'job_title', 'actions'];
    } else {
      return ['name', 'contact', 'job_title', 'location', 'actions'];
    }
  }, [peopleTab]);

  // ── Table Instance Setup ──
  const tableData = peopleTab === 'crm' ? crmLeadsMapped : discoveryLeadsMapped;
  const totalRows = peopleTab === 'crm' ? crmLeadsMapped.length : (discoveryData?.total_entries || 0);

  const [rowSelection, setRowSelection] = useState({});
  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      pagination: peopleTab === 'crm' ? { pageIndex: crmPageIdx, pageSize: crmPageSize } : { pageIndex: discPageIdx, pageSize: discPageSize },
      columnVisibility,
      columnOrder,
      rowSelection,
    },
    manualPagination: true,
    pageCount: Math.ceil(totalRows / (peopleTab === 'crm' ? crmPageSize : discPageSize)),
    onPaginationChange: (updater) => {
      if (peopleTab === 'crm') setCrmPagination(updater as any);
      else setDiscPagination(updater as any);
    },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    meta: {
      saveDiscoveryLead: handleSaveDiscovery,
      saveToCRM: handleSaveDiscovery,
      enrichContact: handleEnrich,
      handleAssetAction: handleAssetAction,
      isDiscoveryMode: peopleTab === 'discovery',
      openListModal: (c: any) => onEditEmployee?.(c)
    }
  });

  return (
    <div className="space-y-5 font-['DM_Sans',system-ui,sans-serif] relative">

      {/* ── Top: Insights Card + Pie Panel ────────────────────────────────── */}
      <div className="flex gap-6 items-stretch min-h-[460px]">
        <motion.div className={`${T.card} flex-1 min-w-0 overflow-hidden flex flex-col`}>
          <div className={T.sectionHeader}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-2xl bg-violet-100 flex items-center justify-center"><BarChart3 size={16} className="text-violet-600" /></div>
              <span className="text-[14px] font-semibold text-slate-900 tracking-tight">Company Insights</span>
            </div>
            <button className="w-8 h-8 rounded-2xl hover:bg-slate-100 transition-all flex items-center justify-center" onClick={() => setInsightsOpen(!insightsOpen)}>
              {insightsOpen ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
            </button>
          </div>

          <AnimatePresence initial={false}>
            {insightsOpen && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex border-b border-slate-100 bg-slate-50/80 px-6 overflow-x-auto no-scrollbar">
                  {['overview', 'technologies', 'funding', 'keywords'].map(id => (
                    <button key={id} onClick={() => setActiveInsightTab(id)} className={`px-6 py-3.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap capitalize transition-all ${activeInsightTab === id ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-600'}`}>
                      {id}
                    </button>
                  ))}
                </div>
                <div className="flex-1 p-6 overflow-auto bg-white">
                  {activeInsightTab === 'overview'     && <OverviewInsights company={company} enrichment={enrichment} companyData={companyData} />}
                  {activeInsightTab === 'technologies' && <TechnologiesInsights technologies={technologies} />}
                  {activeInsightTab === 'funding'      && <FundingInsights fundingEvents={fundingEvents} enrichment={enrichment} companyData={companyData} />}
                  {activeInsightTab === 'keywords'     && <KeywordsInsights keywords={keywords} />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Dept Pie Panel */}
        {departments.length > 0 && (
          <motion.div className={`${T.card} w-[272px] min-w-[272px] flex-shrink-0 h-full flex flex-col`}>
            <DeptPiePanel departments={departments} />
          </motion.div>
        )}
      </div>

      {/* ── People Table Card ─────────────────────────────────────────────── */}
      <motion.div className={T.card}>
        <div className={T.sectionHeader}>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] flex items-center justify-center"><Users size={14} className="text-[#2563EB]" /></div>
              <span className="text-[13px] font-[650] text-[#1C1916] tracking-[-0.01em]">People at {company.name}</span>
            </div>
            
            {/* DUAL TABS */}
            <div className="flex items-center gap-1 bg-[#F0EDE8] p-0.5 rounded-lg border border-[#E5E0D8]">
              <button 
                onClick={() => setPeopleTab('discovery')} 
                className={`px-3 py-1.5 text-[11px] font-[650] rounded-md transition-all flex items-center gap-1.5 ${peopleTab === 'discovery' ? 'bg-white text-[#5B4FE8] shadow-sm' : 'text-[#6A6057] hover:text-[#1C1916]'}`}
              >
                <Sparkles size={11} className={peopleTab === 'discovery' ? 'text-[#5B4FE8]' : 'text-[#9C9189]'} />
                Search
              </button>
              <button 
                onClick={() => setPeopleTab('crm')} 
                className={`px-3 py-1.5 text-[11px] font-[650] rounded-md transition-all flex items-center ${peopleTab === 'crm' ? 'bg-white text-[#1C1916] shadow-sm' : 'text-[#6A6057] hover:text-[#1C1916]'}`}
              >
                Saved in CRM <span className="ml-1.5 opacity-50 font-['DM_Mono',monospace]">{employees.length}</span>
              </button>
            </div>
          </div>

          <button className="w-7 h-7 rounded-lg hover:bg-[#F0EDE8] transition-colors flex items-center justify-center" onClick={() => setLeadsOpen(!leadsOpen)}>
            {leadsOpen ? <ChevronUp size={13} className="text-[#9C9189]" /> : <ChevronDown size={13} className="text-[#9C9189]" />}
          </button>
        </div>

        <AnimatePresence initial={false}>
          {leadsOpen && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="min-h-[300px] flex flex-col bg-white">
                
                {/* ── Filters Row (Seniority + Search) ── */}
                <div className="flex items-center gap-3 px-5 py-3 border-b border-[#F0EDE8] bg-[#FAFAF9]">
                  
                  {/* Seniority Tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    {SENIORITY_TABS.map(tab => {
                      const isActive = activeSeniority === tab.id;
                      const crmCount = crmSeniorityCounts[tab.id];

                      // Only show tabs if they have CRM users (when in CRM tab) 
                      // Or show all tabs (when in Search tab)
                      if (peopleTab === 'crm' && !crmCount && tab.id !== 'all') return null;

                      return (
                        <motion.button 
                          key={tab.id} 
                          onClick={() => setActiveSeniority(tab.id)} 
                          className={`px-3 py-1.5 text-[11px] font-[600] rounded-lg transition-colors duration-120 whitespace-nowrap ${isActive ? T.filterActive : T.filterInactive}`} 
                          whileHover={{ scale: 1.02 }} 
                          whileTap={{ scale: 0.96 }}
                        >
                          {tab.label}
                          {peopleTab === 'crm' && crmCount > 0 && <span className="ml-1 opacity-70">({crmCount})</span>}
                        </motion.button>
                      );
                    })}
                  </div>

                  <div className="ml-auto relative flex-shrink-0">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9C9189]" />
                    <input 
                      type="text" 
                      placeholder={peopleTab === 'crm' ? "Search saved people..." : "Search Cloud database..."} 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                      className="h-8 w-56 pl-8 pr-3 text-[11px] border border-[#E5E0D8] rounded-lg bg-white text-[#1C1916] placeholder-[#C4BDB5] focus:outline-none focus:border-[#5B4FE8] transition-colors" 
                    />
                  </div>
                </div>

                {/* ── TanStack Data Table ── */}
                <DndProvider backend={HTML5Backend}>
                  {isLoadingDiscovery && peopleTab === 'discovery' ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <Loader2 size={24} className="text-[#5B4FE8] animate-spin" />
                      <p className="text-[12px] text-[#9C9189] font-medium">Searching Cloud global database...</p>
                    </div>
                  ) : (!company.apollo_org_id && !company.domain && !company.website && peopleTab === 'discovery') ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <p className="text-[12px] text-[#9C9189]">Company domain or Cloud ID required to discover new people.</p>
                    </div>
                  ) : (
                    <>
                      {/* Note: The custom-table-fix CSS ensures the first column sits perfectly on the left edge, 
                          fixing the overlap caused by hiding the checkbox (select) column. */}
                      <div className="flex-1 overflow-x-auto border-b border-[#F0EDE8] custom-table-fix">
                        <style>{`
                          .custom-table-fix th:first-child,
                          .custom-table-fix td:first-child {
                            left: 0 !important;
                          }
                        `}</style>
                        <DataTable table={table} />
                      </div>
                      {tableData.length > 0 && (
                        <div className="bg-[#FAFAF9] py-1">
                          <DataTablePagination table={table} />
                        </div>
                      )}
                    </>
                  )}
                </DndProvider>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// ── Shared Subcomponents ───────────────────────────────────────────────────
const OverviewInsights = ({ company, enrichment, companyData }: any) => {
  const stats =[
    { label: 'Revenue',       value: enrichment?.annual_revenue_printed || company?.revenue,            icon: DollarSign, color: 'text-[#16A34A]', bg: 'bg-[#F0FDF4]',  border: 'border-[#BBF7D0]' },
    { label: 'Employees',     value: enrichment?.estimated_num_employees || company?.employee_count,    icon: Users,       color: 'text-[#2563EB]', bg: 'bg-[#EFF6FF]',  border: 'border-[#BFDBFE]', format: (v: number) => v?.toLocaleString() },
    { label: 'Founded',       value: enrichment?.founded_year || company?.founded_year,                 icon: Calendar,    color: 'text-[#5B4FE8]', bg: 'bg-[#F0EEFF]',  border: 'border-[#D9D4FF]' },
    { label: 'Total Funding', value: enrichment?.total_funding_printed || companyData?.total_funding,   icon: TrendingUp,  color: 'text-[#D97706]', bg: 'bg-[#FFFBEB]',  border: 'border-[#FDE68A]' },
  ].filter(s => s.value);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          const val = (stat as any).format ? (stat as any).format(stat.value) : stat.value;
          return (
            <motion.div key={idx} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border ${stat.bg} ${stat.border}`}>
              <Icon size={11} className={stat.color} />
              <span className="text-[9px] font-[700] uppercase tracking-wide text-[#9C9189]">{stat.label}</span>
              <span className="text-[11px] font-[800] text-[#1C1916] font-['DM_Mono',monospace]">{val}</span>
            </motion.div>
          );
        })}
      </div>
      {(enrichment?.short_description || company?.about) && (
        <div className="bg-[#F0EEFF] rounded-xl p-4 border border-[#EDE9E3]">
          <p className="text-[12px] text-[#6A6057] leading-[1.65]">
            {enrichment?.short_description || company?.about}
          </p>
        </div>
      )}
    </div>
  );
};

const TechnologiesInsights = ({ technologies }: { technologies: any[] }) => {
  if (!technologies.length) return <EmptyState message="No technologies detected" icon={<Code2 size={20} />} />;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-4 py-3 bg-[#F0EEFF] border border-[#D9D4FF] rounded-xl">
        <span className="text-[13px] font-[650] text-[#5B4FE8]">{technologies.length} technologies detected</span>
      </div>
    </div>
  );
};

const FundingInsights = ({ fundingEvents, enrichment, companyData }: any) => {
  const totalFunding = enrichment?.total_funding_printed || companyData?.total_funding;
  if (!fundingEvents.length && !totalFunding) return <EmptyState message="No funding data available" icon={<DollarSign size={20} />} />;
  return (
    <div className="space-y-4">
      {totalFunding && (
        <div className="rounded-xl p-4 border border-[#BBF7D0] bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7]">
          <DollarSign size={14} className="text-[#16A34A] mb-2" />
          <p className="text-[9px] font-[700] text-[#16A34A] uppercase tracking-[0.08em]">Total Raised</p>
          <p className="text-[22px] font-[800] text-[#14532D] mt-1 font-['DM_Mono',monospace] leading-none">{totalFunding}</p>
        </div>
      )}
    </div>
  );
};

const KeywordsInsights = ({ keywords }: { keywords: string[] }) => {
  if (!keywords.length) return <EmptyState message="No keywords available" icon={<Sparkles size={20} />} />;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {keywords.map((kw: string, idx: number) => (
          <span key={idx} className="inline-flex text-[11px] font-[500] px-2.5 py-1 bg-white text-[#6A6057] border border-[#E5E0D8] rounded-lg">
            {kw}
          </span>
        ))}
      </div>
    </div>
  );
};

export default CompanyOverviewTab;